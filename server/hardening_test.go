package main

import (
	"os"
	"strings"
	"testing"
	"time"
)

// codeWithSecret re-keys the process with a different SECRET and returns the
// code for item. codeMACKey is derived at boot, so initCrypto has to run again.
func codeWithSecret(t *testing.T, secret, item string) string {
	t.Helper()
	os.Setenv("SECRET", secret)
	initCrypto()
	return codeGenerate(item)
}

// TestAccessCodeIsKeyedByTheSecret is the point of replacing the old code: it was
// a plain checksum of the item_id, so the four digits protecting a response
// carried no secret at all — anyone who saw an item_id could compute them.
// A code that does not change with SECRET is not a keyed value.
func TestAccessCodeIsKeyedByTheSecret(t *testing.T) {
	setupDB(t)
	t.Cleanup(func() {
		os.Setenv("SECRET", "0123456789abcdef0123456789abcdef")
		initCrypto()
	})

	ids := []string{"a1B2c3", "xY9zQ1", "form-item-7", "zzz9", "q1w2e3"}
	changed := 0
	for _, id := range ids {
		a := codeWithSecret(t, "0123456789abcdef0123456789abcdef", id)
		b := codeWithSecret(t, "ffffffffffffffffffffffffffffffff", id)
		if a != b {
			changed++
		}
		for _, c := range []string{a, b} {
			if len(c) != 4 {
				t.Fatalf("code %q for %q is not four digits", c, id)
			}
			if c < "1000" || c > "9999" {
				t.Fatalf("code %q for %q is out of range", c, id)
			}
		}
	}
	if changed != len(ids) {
		t.Fatalf("only %d/%d codes depended on SECRET; the rest are still derivable from the id alone",
			changed, len(ids))
	}
}

// TestFailLimiterLocksAndRecovers: the four-digit code is only sufficient
// because repeated mistakes are refused.
func TestFailLimiterLocksAndRecovers(t *testing.T) {
	l := newFailLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !l.allow("k") {
			t.Fatalf("locked out after %d failures, before the limit", i)
		}
		l.fail("k")
	}
	if l.allow("k") {
		t.Fatal("still allowed after reaching the failure limit")
	}
	if !l.allow("other") {
		t.Fatal("one key's failures locked a different key")
	}
	l.reset("k")
	if !l.allow("k") {
		t.Fatal("a success should restore the allowance")
	}
}

func TestFailLimiterWindowExpires(t *testing.T) {
	l := newFailLimiter(2, 20*time.Millisecond)
	l.fail("k")
	l.fail("k")
	if l.allow("k") {
		t.Fatal("should be locked inside the window")
	}
	time.Sleep(40 * time.Millisecond)
	if !l.allow("k") {
		t.Fatal("the window should expire on its own")
	}
}

// TestFailLimiterStaysBounded: probes against many distinct ids must not grow the
// map without limit, or the throttle itself becomes the denial of service.
func TestFailLimiterStaysBounded(t *testing.T) {
	l := newFailLimiter(5, time.Minute)
	l.ceiling = 10
	for i := 0; i < 500; i++ {
		key := "k" + strings.Repeat("x", i%7) + string(rune('a'+i%26)) + string(rune('a'+(i/26)%26))
		l.allow(key)
		l.fail(key)
	}
	l.mu.Lock()
	n := len(l.hits)
	l.mu.Unlock()
	if n > l.ceiling {
		t.Fatalf("limiter map grew to %d entries, ceiling is %d", n, l.ceiling)
	}
}

// TestSubmitRecordRejectsCrossFormItem: all answers under one item must belong to
// one form. Otherwise a caller who knows two field_ids can staple a field from
// another form onto an existing item and merge two responses into one row.
func TestSubmitRecordRejectsCrossFormItem(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)
	mkTeam(t, "tA", "A", "a1")

	nameID, ok := createField("tA", Row{"form_name": "表单甲", "field_name": "姓名", "field_type": "text"})
	if !ok {
		t.Fatal("could not create the first field")
	}
	phoneID, ok := createField("tA", Row{"form_name": "表单乙", "field_name": "电话", "field_type": "text"})
	if !ok {
		t.Fatal("could not create the second field")
	}
	noteID, ok := createField("tA", Row{"form_name": "表单甲", "field_name": "备注", "field_type": "text"})
	if !ok {
		t.Fatal("could not create the third field")
	}

	if !submitRecord(Row{"item_id": "item1", "field_id": nameID, "field_value": "张三"}) {
		t.Fatal("a first answer from the form should be accepted")
	}
	// Same form, same item: this is an ordinary multi-field submission.
	if !submitRecord(Row{"item_id": "item1", "field_id": noteID, "field_value": "备注内容"}) {
		t.Fatal("a second field of the same form should be accepted")
	}
	// Different form: must be refused.
	if submitRecord(Row{"item_id": "item1", "field_id": phoneID, "field_value": "12345678"}) {
		t.Fatal("a field from another form must not join the same item")
	}
	if got := len(getRecordsAny("item1")); got != 2 {
		t.Fatalf("the rejected answer was stored anyway: item1 has %d rows, want 2", got)
	}

	// A field that does not exist is refused too.
	if submitRecord(Row{"item_id": "item2", "field_id": "no-such-field", "field_value": "x"}) {
		t.Fatal("an unknown field_id must be refused")
	}
}

// TestRecordHistoryThrottlesWrongCodes checks the throttle is actually wired into
// the endpoint that checks codes, not just available as a type.
func TestRecordHistoryThrottlesWrongCodes(t *testing.T) {
	openTestDB(t)
	old := recordCodeLimiter
	recordCodeLimiter = newFailLimiter(5, 15*time.Minute)
	t.Cleanup(func() { recordCodeLimiter = old })

	mkAccount(t, "a1", "a1@example.com", 0)
	mkTeam(t, "tA", "A", "a1")
	fieldID, ok := createField("tA", Row{"form_name": "表单甲", "field_name": "姓名", "field_type": "text"})
	if !ok {
		t.Fatal("could not create the field")
	}
	if !submitRecord(Row{"item_id": "item1", "field_id": fieldID, "field_value": "张三"}) {
		t.Fatal("could not seed the response")
	}

	right := codeGenerate("item1")
	wrong := "1234"
	if right == wrong {
		wrong = "4321"
	}
	probe := func(code string) error {
		_, err := recordHistory(&Ctx{Body: map[string]any{"id": "item1", "code": code}})
		return err
	}

	for i := 0; i < 5; i++ {
		err := probe(wrong)
		if err == nil || !strings.Contains(err.Error(), "鉴权失败") {
			t.Fatalf("attempt %d should report a bad code, got %v", i+1, err)
		}
	}
	err := probe(wrong)
	if err == nil || !strings.Contains(err.Error(), "尝试次数过多") {
		t.Fatalf("the sixth wrong code should be throttled, got %v", err)
	}

	// The limit must not lock the owner out of their own response.
	recordCodeLimiter.reset("item1")
	if err := probe(right); err != nil {
		t.Fatalf("the correct code must still work: %v", err)
	}
}

package main

import (
	"sort"
	"strings"

	"github.com/mozillazg/go-pinyin"
)

// Record module — submitted form data, grouped per item — mirrors
// server/modules/record/*.

// getRecords returns the item's rows newest-append-first (repository find()).
func getRecords(itemID string) []Row {
	return selectRows("records", Row{"item_id": itemID}, selectOpts{skipDeleted: true, reverse: true})
}

// withFieldNotes copies each row with its note attached, so the fill page and
// the record list see the same shape without a second lookup.
func withFieldNotes(rows []Row, notes map[string]string) []Row {
	out := make([]Row, len(rows))
	for i, row := range rows {
		next := Row{}
		for k, v := range row {
			next[k] = v
		}
		next["note"] = notes[asStr(row["field_id"])]
		out[i] = next
	}
	return out
}

// dropNoteRows keeps the sentinel note row out of the fill page, where a row
// with no field would render as a phantom input.
func dropNoteRows(rows []Row) []Row {
	out := []Row{}
	for _, row := range rows {
		if asStr(row["field_id"]) == recordNoteFieldID {
			continue
		}
		out = append(out, row)
	}
	return out
}

func submitRecord(record Row) bool {
	itemID, fieldID := record["item_id"], record["field_id"]
	if expireTime := itemExpireTime(asStr(itemID)); expireTime > 0 && nowMillis() > expireTime {
		return false
	}
	if exist := selectOne("records", Row{"item_id": itemID, "field_id": fieldID}); exist != nil {
		return updateRows("records", Row{"id": exist["id"]}, Row{"field_value": record["field_value"]})
	}
	insertRow("records", record)
	return true
}

// linkExpireWindow is how long a fill link stays writable after it is first
// opened. A link without a stamped expire_time is treated as open-ended so
// records created before this feature keep working.
func linkExpireWindow() int64 {
	return linkExpireDays * 24 * 60 * 60 * 1000
}

// stampLinkExpiry records when a link stops accepting writes. It only writes
// the first time, so reopening a link does not extend its deadline.
func stampLinkExpiry(itemID string) {
	if itemID == "" {
		return
	}
	for _, row := range getRecords(itemID) {
		if asInt64(row["expire_time"]) > 0 {
			return
		}
	}
	selectEach("records", Row{"item_id": itemID}, func(row Row) {
		updateRows("records", Row{"id": asStr(row["id"])}, Row{"expire_time": nowMillis() + linkExpireWindow()})
	})
}

// itemExpireTime returns 0 when the link has no deadline.
func itemExpireTime(itemID string) int64 {
	var found int64
	selectEach("records", Row{"item_id": itemID}, func(row Row) {
		if t := asInt64(row["expire_time"]); t > found {
			found = t
		}
	})
	return found
}

func linkExpired(itemID string) bool {
	t := itemExpireTime(itemID)
	return t > 0 && nowMillis() > t
}

func insertRecords(records []Row) bool {
	batchInsertRows("records", records)
	return true
}

func deleteRecordByItem(itemID string) {
	hardDeleteRows("records", Row{"item_id": itemID}, nil)
}

// ---------- pinyin search helpers (pinyin-pro parity) ----------

var (
	pyNormalArgs = pinyin.NewArgs()
	pyFirstArgs  = func() pinyin.Args {
		a := pinyin.NewArgs()
		a.Style = pinyin.FirstLetter
		return a
	}()
)

func pinyinFull(s string) string {
	var b strings.Builder
	for _, parts := range pinyin.Pinyin(s, pyNormalArgs) {
		for _, p := range parts {
			b.WriteString(p)
		}
	}
	return b.String()
}

func pinyinInitials(s string) string {
	var b strings.Builder
	for _, parts := range pinyin.Pinyin(s, pyFirstArgs) {
		for _, p := range parts {
			b.WriteString(p)
		}
	}
	return b.String()
}

// recordMatchesSearch mirrors the TS matcher: case-insensitive substring on
// the raw value, its full pinyin, or its pinyin initials.
func recordMatchesSearch(value any, query string) bool {
	text := jsString(value)
	if strings.Contains(strings.ToLower(text), query) {
		return true
	}
	if strings.Contains(strings.ToLower(pinyinFull(text)), query) {
		return true
	}
	return strings.Contains(strings.ToLower(pinyinInitials(text)), query)
}

// ---------- grouped listing ----------

// getAllRecord groups records by item_id (newest submit first), with
// case-insensitive + pinyin search and pagination — semantics copied from
// record.service getAllRecord.
func getAllRecord(formName string, page, pageSize int, search string) Row {
	fieldIDs := map[string]bool{}
	selectEach("fields", Row{"form_name": formName}, func(field Row) {
		fieldIDs[asStr(field["id"])] = true
	})
	if len(fieldIDs) == 0 {
		return Row{"records": []Row{}, "total": 0}
	}

	groupOrder := []string{}
	groups := map[string][]Row{}
	// An item can hold only a record-level note (its sentinel row), so those
	// still belong to the listing even though they carry no field value.
	noteOnly := map[string]bool{}
	selectEach("records", Row{}, func(record Row) {
		itemID := asStr(record["item_id"])
		if asStr(record["field_id"]) == recordNoteFieldID {
			noteOnly[itemID] = true
			return
		}
		if !fieldIDs[asStr(record["field_id"])] {
			return
		}
		if _, ok := groups[itemID]; !ok {
			groupOrder = append(groupOrder, itemID)
		}
		groups[itemID] = append(groups[itemID], record)
	})
	for itemID := range noteOnly {
		if _, ok := groups[itemID]; !ok {
			groupOrder = append(groupOrder, itemID)
		}
	}

	rowTime := func(r Row) int64 {
		t := r["update_time"]
		if !jsTruthy(t) {
			t = r["create_time"]
		}
		if !jsTruthy(t) {
			return 0
		}
		return asInt64(t)
	}

	// latestTime falls back to the note row's own time when the item has no
	// field rows, so note-only items still sort by recency.
	latestTime := func(data []Row, group Row) int64 {
		if len(data) > 0 {
			return rowTime(data[0])
		}
		return asInt64(group["note_time"])
	}

	sorted := make([]Row, 0, len(groupOrder))
	for _, itemID := range groupOrder {
		data := groups[itemID]
		sort.SliceStable(data, func(i, j int) bool { return rowTime(data[i]) > rowTime(data[j]) })
		recordNote, fieldNotes, noteTime := itemNotes(itemID)
		sorted = append(sorted, Row{
			"item_id": itemID, "data": data,
			"note": recordNote, "field_notes": fieldNotes, "note_time": noteTime,
		})
	}
	sort.SliceStable(sorted, func(i, j int) bool {
		di, _ := sorted[i]["data"].([]Row)
		dj, _ := sorted[j]["data"].([]Row)
		// A note-only item has no field rows, so it sorts by its note row.
		return latestTime(di, sorted[i]) > latestTime(dj, sorted[j])
	})

	filtered := sorted
	if search != "" {
		query := strings.ToLower(strings.TrimSpace(search))
		filtered = []Row{}
		for _, group := range sorted {
			data, _ := group["data"].([]Row)
			for _, r := range data {
				if recordMatchesSearch(r["field_value"], query) {
					filtered = append(filtered, group)
					break
				}
			}
		}
	}

	total := len(filtered)
	out := []Row{}
	// JS slice with NaN bounds yields [] — replicate via NaN-safe bounds
	if page > 0 {
		start, end := (page-1)*pageSize, page*pageSize
		if start < 0 {
			start = 0
		}
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}
		for _, group := range filtered[start:end] {
			data, _ := group["data"].([]Row)
			fieldNotes, _ := group["field_notes"].(map[string]string)
			note, _ := group["note"].(string)
			out = append(out, Row{
				"item_id": group["item_id"],
				"code":    codeGenerate(asStr(group["item_id"])),
				"note":    note,
				"data":    withFieldNotes(data, fieldNotes),
			})
		}
	}
	return Row{"records": out, "total": total}
}

// ---------- handlers ----------

func recordHistory(c *Ctx) (any, error) {
	id := c.Str("id")
	code := c.Str("code")
	storedItemID := c.Str("item_id")

	// 1. id 是 item_id（已存在的记录）→ 直接返回该记录数据
	records := getRecords(id)
	if len(records) > 0 {
		itemID := records[0]["item_id"]
		// A note-only item has no field row, so read the form off a field row.
		var formName string
		for _, r := range records {
			if fid := asStr(r["field_id"]); fid != recordNoteFieldID {
				formName = getFormNameByField(fid)
				break
			}
		}
		if formName == "" {
			return nil, throwErr("表单不存在")
		}
		if code == "" || code != codeGenerate(id) {
			return nil, throwErr("鉴权失败")
		}
		if linkExpired(asStr(itemID)) {
			return nil, throwErr("链接已过期")
		}
		stampLinkExpiry(asStr(itemID))
		return Row{"form_name": formName, "item_id": itemID, "code": code,
			"fields": getFieldList(formName), "records": dropNoteRows(records)}, nil
	}

	// 到这里 id 一定是 field_id。算出 URL 对应的 form。
	urlFormName := getFormNameByField(id)
	if urlFormName == "" {
		return nil, throwErr("表单不存在")
	}

	// 2. stored_item_id 可用且属于同一个 form → 恢复该 item 的草稿
	if jsTruthy(c.Value("item_id")) && code == codeGenerate(storedItemID) {
		draft := getRecords(storedItemID)
		// The note row is not a field, so the form has to be read off a field row.
		var formFieldID string
		for _, r := range draft {
			if fid := asStr(r["field_id"]); fid != recordNoteFieldID {
				formFieldID = fid
				break
			}
		}
		sameForm := formFieldID != "" && getFormNameByField(formFieldID) == urlFormName
		if sameForm {
			if linkExpired(storedItemID) {
				return nil, throwErr("链接已过期")
			}
			stampLinkExpiry(storedItemID)
			return Row{"form_name": urlFormName, "item_id": storedItemID, "code": code,
				"fields": getFieldList(urlFormName), "records": dropNoteRows(draft)}, nil
		}
	}

	// 3. 否则：新记录。首次打开即盖上有效期，之后重开不会顺延。
	itemID := nanoID(6)
	stampLinkExpiry(itemID)
	return Row{"form_name": urlFormName, "item_id": itemID, "code": codeGenerate(itemID),
		"fields": getFieldList(urlFormName), "records": []Row{}}, nil
}

func recordSubmit(c *Ctx) (any, error) {
	value := c.Value("field_value")
	text := "undefined"
	if _, ok := c.Body["field_value"]; ok {
		text = jsString(value)
	}
	if jsUtf16Len(text) > 0x3e8 {
		return nil, throwErr("内容过长")
	}
	if linkExpired(c.Str("item_id")) {
		return nil, throwErr("链接已过期")
	}
	submitRecord(Row{
		"item_id": c.Str("item_id"), "field_id": c.Str("field_id"), "field_value": value,
	})
	return Row{}, nil
}

// ---------- notes ----------

// A record-level note hangs off a row whose field_id is this sentinel: the
// record is one row per field, so no real field ever claims this id.
const recordNoteFieldID = "__record_note__"

func recordNote(c *Ctx) (any, error) {
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	itemID := c.Str("item_id")
	if itemID == "" {
		return nil, throwErr("参数错误")
	}
	note := c.Str("note")
	if note == "" {
		return nil, throwErr("备注不能为空")
	}
	// c.Str turns a missing key into the literal "null" (jsString(nil)), so an
	// absent field_id has to be recognised as the record-level note.
	fieldID := c.Str("field_id")
	if fieldID == "" || fieldID == "null" {
		fieldID = recordNoteFieldID
	}
	rows := selectRows("records", Row{"item_id": itemID, "field_id": fieldID}, selectOpts{skipDeleted: true, limit: 1})
	if len(rows) > 0 {
		updateRows("records", Row{"id": asStr(rows[0]["id"])}, Row{"note": note})
		return Row{"item_id": itemID, "field_id": fieldID, "note": note}, nil
	}
	row := insertRow("records", Row{"item_id": itemID, "field_id": fieldID, "field_value": "", "note": note})
	return Row{"item_id": itemID, "field_id": fieldID, "note": asStr(row["note"])}, nil
}

func itemNotes(itemID string) (string, map[string]string, int64) {
	notes := map[string]string{}
	recordNoteText := ""
	var noteTime int64
	selectEach("records", Row{"item_id": itemID}, func(row Row) {
		note := asStr(row["note"])
		if note == "" {
			return
		}
		if asStr(row["field_id"]) == recordNoteFieldID {
			recordNoteText = note
			noteTime = asInt64(row["update_time"])
			if noteTime == 0 {
				noteTime = asInt64(row["create_time"])
			}
			return
		}
		notes[asStr(row["field_id"])] = note
	})
	return recordNoteText, notes, noteTime
}

func recordAll(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("page")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	pageNum, ok := jsNumber(c.Value("page"))
	if !ok || pageNum < 1 {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	search := ""
	if c.Truthy("search") {
		search = c.Str("search")
	}
	return getAllRecord(formName, int(pageNum), 10, search), nil
}

func recordDel(c *Ctx) (any, error) {
	itemID := c.Str("item_id")
	if !jsTruthy(c.Value("item_id")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	deleteRecordByItem(itemID)
	return Row{}, nil
}

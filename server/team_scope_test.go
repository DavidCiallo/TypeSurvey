package main

import (
	"strings"
	"testing"
)

// Phase-2 tests: the team scope is actually enforced, not just recorded. These
// exercise the handlers and the form/field/radio/record functions the way the
// API calls them, with the tenant guard armed.

// TestFreshInstallGetsNoDefaultTeam locks in the fix found by running the smoke
// test: if the migration invents a default team on an empty database, the first
// admin's one-team allowance is spent before they ever log in and team/create is
// refused for them forever.
func TestFreshInstallGetsNoDefaultTeam(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "root", "root@example.com", 1)

	if err := migrateToTeamModel(); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if n := len(teamRows(true)); n != 0 {
		t.Fatalf("a fresh install must not get a default team, got %d", n)
	}

	// The first admin must be able to create a team of their own.
	created, err := teamCreate(ctxAs("root@example.com", map[string]any{"name": "我的团队"}))
	if err != nil {
		t.Fatalf("the first admin must be able to create a team: %v", err)
	}
	if asStr(created.(Row)["name"]) != "我的团队" {
		t.Fatalf("unexpected team: %v", created)
	}

	// Re-running the migration must be a no-op.
	if err := migrateToTeamModel(); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	if n := len(teamRows(true)); n != 1 {
		t.Fatalf("re-running the migration created another team (%d total)", n)
	}
}

func mkAccount(t *testing.T, id, email string, isAdmin int) {
	t.Helper()
	insertRow("accounts", Row{
		"id": id, "name": id, "email": email, "password": "x", "is_admin": isAdmin,
	})
}

// mkTeam creates a team owned by ownerID, plus any extra members.
func mkTeam(t *testing.T, id, name, ownerID string, memberIDs ...string) {
	t.Helper()
	insertRow("teams", Row{"id": id, "name": name, "creator_id": ownerID})
	insertRow("team_members", Row{"team_id": id, "account_id": ownerID, "role": "owner"})
	for _, m := range memberIDs {
		insertRow("team_members", Row{"team_id": id, "account_id": m, "role": "member"})
	}
}

// ctxAs builds a request context authenticated as email.
func ctxAs(email string, body map[string]any) *Ctx {
	b := map[string]any{"auth": true}
	for k, v := range body {
		b[k] = v
	}
	return &Ctx{Auth: genTokenForIdentify(email), Body: b}
}

func openTestDB(t *testing.T) {
	t.Helper()
	setupDB(t)
	if err := openDB(); err != nil {
		t.Fatalf("openDB: %v", err)
	}
}

func teamField(t *testing.T, teamID, fieldID string) Row {
	t.Helper()
	rows := selectRows("fields", Row{"team_id": teamID, "id": fieldID}, selectOpts{skipDeleted: true})
	if len(rows) == 0 {
		return nil
	}
	return rows[0]
}

// TestMenuRolesNoLongerAdminOnly guards the change that makes a non-admin a real
// user: before multi-tenancy, menuRoles returned nothing for them, so every
// registered account was locked out of every screen.
func TestMenuRolesNoLongerAdminOnly(t *testing.T) {
	if got := len(menuRoles(0)); got != len(allMenus) {
		t.Fatalf("a non-admin should receive all %d menus, got %d", len(allMenus), got)
	}
	if got := len(menuRoles(1)); got != len(allMenus) {
		t.Fatalf("admin menus changed: got %d, want %d", got, len(allMenus))
	}
}

// TestTeamlessAccountIsRejected: an account with no team must be refused before
// any query runs. Enforcing this only in the client would leave a team-less
// account free to call the API directly.
func TestTeamlessAccountIsRejected(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)

	_, err := formList(ctxAs("a1@example.com", map[string]any{"page": 1}))
	if err == nil {
		t.Fatal("a team-less account must not reach form/list")
	}
	if !strings.Contains(err.Error(), "团队") {
		t.Fatalf("expected a team-related refusal, got %v", err)
	}

	// Onboarding itself must still be reachable, or the account can never escape.
	if _, err := teamList(ctxAs("a1@example.com", nil)); err != nil {
		t.Fatalf("team/list must work without a team: %v", err)
	}
	created, err := teamCreate(ctxAs("a1@example.com", map[string]any{"name": "我的团队"}))
	if err != nil {
		t.Fatalf("team/create must work without a team: %v", err)
	}
	if asStr(created.(Row)["id"]) == "" {
		t.Fatal("team/create returned no team id")
	}

	// And now form/list works.
	if _, err := formList(ctxAs("a1@example.com", map[string]any{"page": 1})); err != nil {
		t.Fatalf("form/list after onboarding: %v", err)
	}
}

// TestOnlyOneTeamPerCreator: a user may create at most one team, and deleting it
// frees the slot.
func TestOnlyOneTeamPerCreator(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)

	if _, err := teamCreate(ctxAs("a1@example.com", map[string]any{"name": "第一个"})); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if _, err := teamCreate(ctxAs("a1@example.com", map[string]any{"name": "第二个"})); err == nil {
		t.Fatal("a second team creation must be refused")
	}

	teamID := liveTeamIDs("a1")[0]
	if _, err := teamDel(ctxAs("a1@example.com", map[string]any{"team_id": teamID})); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := teamCreate(ctxAs("a1@example.com", map[string]any{"name": "重建的"})); err != nil {
		t.Fatalf("creating after deleting the previous team must be allowed: %v", err)
	}
}

// TestFormAccessIsTeamScoped is the core isolation test. Two teams own a form
// with the same name; neither may read or write the other's rows, and the
// cascading delete must not escape the team.
func TestFormAccessIsTeamScoped(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)
	mkAccount(t, "a2", "a2@example.com", 0)
	mkTeam(t, "tA", "Team A", "a1")
	mkTeam(t, "tB", "Team B", "a2")

	// Identical form and field names in both teams must both be accepted — the
	// uniqueness check has to be per team, not global.
	fA, okA := createField("tA", Row{"form_name": "问卷", "field_name": "姓名", "field_type": "text"})
	fB, okB := createField("tB", Row{"form_name": "问卷", "field_name": "姓名", "field_type": "text"})
	if !okA || !okB || fA == "" || fB == "" || fA == fB {
		t.Fatalf("both teams should own a same-named form: fA=%q(%v) fB=%q(%v)", fA, okA, fB, okB)
	}
	createRadio("tA", fA, "选项A")
	createRadio("tB", fB, "选项A")
	insertRow("records", Row{"team_id": "tA", "item_id": "iA", "field_id": fA, "field_value": "1"})
	insertRow("records", Row{"team_id": "tB", "item_id": "iB", "field_id": fB, "field_value": "1"})

	// Reads stay inside the team.
	if got := getFormList("tA"); len(got) != 1 || got[0] != "问卷" {
		t.Fatalf("getFormList(tA) = %v", got)
	}
	if got := getFieldList("tA", "问卷"); len(got) != 1 || asStr(got[0]["id"]) != fA {
		t.Fatalf("getFieldList(tA) leaked: %v", got)
	}
	// A form name that only the other team has must yield nothing.
	if got := getFieldList("tA", "不存在的表单"); len(got) != 0 {
		t.Fatalf("unknown form returned rows: %v", got)
	}

	// Cross-team writes are refused...
	if updateSingleField("tA", fB, "field_name", "篡改") {
		t.Fatal("updateSingleField must not touch another team's field")
	}
	if _, ok := createRadio("tA", fB, "偷加的选项"); ok {
		t.Fatal("createRadio must not attach an option to another team's field")
	}
	bRadios := selectRows("radios", Row{"team_id": "tB"}, selectOpts{skipDeleted: true})
	if len(bRadios) != 1 {
		t.Fatalf("expected 1 radio in team B, got %d", len(bRadios))
	}
	if updateRadio("tA", asStr(bRadios[0]["id"]), "radio_name", "篡改") {
		t.Fatal("updateRadio must not touch another team's radio")
	}

	// tB is untouched by any of it.
	if f := teamField(t, "tB", fB); asStr(f["field_name"]) != "姓名" {
		t.Fatalf("team B's field was modified: %v", f["field_name"])
	}
	if got := getFieldList("tB", "问卷"); len(got) != 1 || len(got[0]["radios"].([]Row)) != 1 {
		t.Fatalf("team B's options were modified: %v", got)
	}

	// Renaming a form that both teams share must only affect the caller's team.
	if !updateFormName("tA", "问卷", "改名") {
		t.Fatal("updateFormName on the caller's own form should succeed")
	}
	if got := getFormList("tB"); len(got) != 1 || got[0] != "问卷" {
		t.Fatalf("team A's rename leaked into team B: %v", got)
	}

	// The cascading delete must not cross the team boundary.
	deleteForm("tA", "改名")
	if got := getFieldList("tA", "改名"); len(got) != 0 {
		t.Fatalf("form was not deleted: %v", got)
	}
	if n := len(selectRows("records", Row{"team_id": "tA"}, selectOpts{skipDeleted: true})); n != 0 {
		t.Fatalf("tA records were not deleted: %d left", n)
	}
	if n := len(selectRows("radios", Row{"team_id": "tA"}, selectOpts{skipDeleted: true})); n != 0 {
		t.Fatalf("tA radios were not deleted: %d left", n)
	}
	if got := getFieldList("tB", "问卷"); len(got) != 1 {
		t.Fatal("deleteForm on team A destroyed team B's form")
	}
	if n := len(selectRows("records", Row{"team_id": "tB"}, selectOpts{skipDeleted: true})); n != 1 {
		t.Fatalf("deleteForm on team A destroyed team B's records: %d left", n)
	}
}

// TestResolveTeamID covers the three ways a team is chosen, including the one
// that must fail: an omitted team_id when the caller has more than one team.
func TestResolveTeamID(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)
	mkAccount(t, "a2", "a2@example.com", 0)
	mkTeam(t, "tA", "Team A", "a1")
	mkTeam(t, "tB", "Team B", "a2")

	s := scopeForAccount(getAccountByEmail("a1@example.com"))
	if len(s.teams) != 1 || s.teams[0] != "tA" {
		t.Fatalf("scope for a1 = %+v", s)
	}

	if got, err := resolveTeamID(ctxAs("a1@example.com", map[string]any{"team_id": "tA"}), s); err != nil || got != "tA" {
		t.Fatalf("own team: got %q err %v", got, err)
	}
	if _, err := resolveTeamID(ctxAs("a1@example.com", map[string]any{"team_id": "tB"}), s); err == nil {
		t.Fatal("a team the caller does not belong to must be rejected")
	}
	if got, err := resolveTeamID(ctxAs("a1@example.com", nil), s); err != nil || got != "tA" {
		t.Fatalf("omitted with exactly one team: got %q err %v", got, err)
	}

	// Join a second team: now an omitted team_id is ambiguous and must error
	// rather than silently pick one.
	insertRow("team_members", Row{"team_id": "tB", "account_id": "a1", "role": "member"})
	s2 := scopeForAccount(getAccountByEmail("a1@example.com"))
	if len(s2.teams) != 2 {
		t.Fatalf("expected a1 in 2 teams, got %v", s2.teams)
	}
	if _, err := resolveTeamID(ctxAs("a1@example.com", nil), s2); err == nil {
		t.Fatal("an ambiguous team_id omission must not resolve to an arbitrary team")
	}
}

// TestInviteLifecycle: the invite code is the credential that grants access to a
// whole team, so it must be long, single-use, expiring and revocable.
func TestInviteLifecycle(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "owner", "owner@example.com", 0)
	mkAccount(t, "bob", "bob@example.com", 0)
	mkAccount(t, "eve", "eve@example.com", 0)
	mkTeam(t, "tA", "Team A", "owner")

	ownerCtx := ctxAs("owner@example.com", map[string]any{"team_id": "tA"})
	res, err := teamInviteCreate(ownerCtx)
	if err != nil {
		t.Fatalf("invite create: %v", err)
	}
	code := asStr(res.(Row)["code"])
	if len(code) != 24 {
		t.Fatalf("invite code must be a 24-char nanoID, got %q (%d chars)", code, len(code))
	}

	// A non-member cannot mint invites.
	if _, err := teamInviteCreate(ctxAs("bob@example.com", map[string]any{"team_id": "tA"})); err == nil {
		t.Fatal("a non-member must not create invites")
	}

	// Bob redeems it.
	joined, err := teamJoin(ctxAs("bob@example.com", map[string]any{"code": code}))
	if err != nil {
		t.Fatalf("join: %v", err)
	}
	if asStr(joined.(Row)["team_id"]) != "tA" || teamRole("bob", "tA") != "member" {
		t.Fatal("bob did not join team A")
	}
	// Bob can now see the team.
	if got := len(liveTeamIDs("bob")); got != 1 {
		t.Fatalf("bob should be in 1 team, got %d", got)
	}

	// Single use: eve cannot reuse it.
	if _, err := teamJoin(ctxAs("eve@example.com", map[string]any{"code": code})); err == nil {
		t.Fatal("a used invite must be rejected")
	}

	// Expiry.
	insertRow("team_invites", Row{"team_id": "tA", "code": "expired-code-000000000001",
		"created_by": "owner", "expire_time": nowMillis() - 1000, "used_by": "", "used_time": 0})
	if _, err := teamJoin(ctxAs("eve@example.com", map[string]any{"code": "expired-code-000000000001"})); err == nil {
		t.Fatal("an expired invite must be rejected")
	}

	// Revocation.
	res2, err := teamInviteCreate(ownerCtx)
	if err != nil {
		t.Fatalf("second invite: %v", err)
	}
	inviteID := asStr(res2.(Row)["id"])
	code2 := asStr(res2.(Row)["code"])
	if _, err := teamInviteRevoke(ctxAs("owner@example.com", map[string]any{"team_id": "tA", "invite_id": inviteID})); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if _, err := teamJoin(ctxAs("eve@example.com", map[string]any{"code": code2})); err == nil {
		t.Fatal("a revoked invite must be rejected")
	}

	// A bogus code.
	if _, err := teamJoin(ctxAs("eve@example.com", map[string]any{"code": "no-such-code-0000000000"})); err == nil {
		t.Fatal("an unknown invite code must be rejected")
	}
}

// TestTeamSoftDeleteKeepsData: deleting a team hides it from its members but
// destroys nothing, and an admin can see and restore it.
func TestTeamSoftDeleteKeepsData(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "owner", "owner@example.com", 0)
	mkAccount(t, "bob", "bob@example.com", 0)
	mkAccount(t, "root", "root@example.com", 1)
	mkTeam(t, "tA", "Team A", "owner", "bob")

	fA, _ := createField("tA", Row{"form_name": "问卷", "field_name": "姓名", "field_type": "text"})
	insertRow("records", Row{"team_id": "tA", "item_id": "i1", "field_id": fA, "field_value": "x"})
	if _, err := teamInviteCreate(ctxAs("owner@example.com", map[string]any{"team_id": "tA"})); err != nil {
		t.Fatalf("invite: %v", err)
	}

	// A plain member cannot delete the team. (A system admin can, by design —
	// that is the escape hatch that makes soft delete recoverable.)
	if _, err := teamDel(ctxAs("bob@example.com", map[string]any{"team_id": "tA"})); err == nil {
		t.Fatal("a non-owner member must not delete the team")
	}

	if _, err := teamDel(ctxAs("owner@example.com", map[string]any{"team_id": "tA"})); err != nil {
		t.Fatalf("delete: %v", err)
	}

	// Gone for the member...
	if n := len(liveTeamIDs("owner")); n != 0 {
		t.Fatalf("a deleted team must leave the member's list, got %d", n)
	}
	if _, err := formList(ctxAs("owner@example.com", map[string]any{"page": 1, "team_id": "tA"})); err == nil {
		t.Fatal("a member must lose access to a deleted team")
	}
	// ...and outstanding invites are dead, so an old link cannot resurrect it.
	if n := len(liveInvites("tA")); n != 0 {
		t.Fatalf("deleting a team must revoke its invites, %d left", n)
	}

	// But nothing was destroyed.
	if n := len(getFormList("tA")); n != 1 {
		t.Fatal("soft delete destroyed the team's forms")
	}
	if n := len(selectRows("records", Row{"team_id": "tA"}, selectOpts{skipDeleted: true})); n != 1 {
		t.Fatal("soft delete destroyed the team's records")
	}

	// An admin still sees it, flagged, and can restore it.
	adminScope := scopeForAccount(getAccountByEmail("root@example.com"))
	if !adminScope.all {
		t.Fatal("root should have system scope")
	}
	found := false
	for _, team := range visibleTeams(adminScope, "root") {
		if asStr(team["id"]) == "tA" {
			found = true
			if team["deleted"] != true {
				t.Fatal("a soft-deleted team must be flagged as deleted for an admin")
			}
		}
	}
	if !found {
		t.Fatal("an admin must still see a soft-deleted team")
	}
	if _, err := teamRestore(ctxAs("root@example.com", map[string]any{"team_id": "tA"})); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if n := len(liveTeamIDs("owner")); n != 1 {
		t.Fatalf("after restore the member should see the team again, got %d", n)
	}
}

// TestAdminScopeSeesEveryTeamAndKeepsItsOwn: an admin is unfiltered but still
// carries their own memberships, so an omitted team_id can still resolve.
func TestAdminScopeSeesEveryTeamAndKeepsItsOwn(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "root", "root@example.com", 1)
	mkTeam(t, "tA", "Team A", "root")
	mkTeam(t, "tB", "Team B", "someone-else")

	s := scopeForAccount(getAccountByEmail("root@example.com"))
	if !s.all {
		t.Fatal("admin scope must be all")
	}
	if len(s.teams) != 1 || s.teams[0] != "tA" {
		t.Fatalf("admin should keep its own membership, got %v", s.teams)
	}
	if got := len(visibleTeams(s, "root")); got != 2 {
		t.Fatalf("admin should see both teams, got %d", got)
	}
	// An admin may act in a team they are not a member of.
	if got, err := resolveTeamID(ctxAs("root@example.com", map[string]any{"team_id": "tB"}), s); err != nil || got != "tB" {
		t.Fatalf("admin targeting another team: got %q err %v", got, err)
	}
}

// TestCrossTeamRecordAccess: records/radios reached through the record module
// must be scoped too.
func TestCrossTeamRecordAccess(t *testing.T) {
	openTestDB(t)
	mkAccount(t, "a1", "a1@example.com", 0)
	mkAccount(t, "a2", "a2@example.com", 0)
	mkTeam(t, "tA", "Team A", "a1")
	mkTeam(t, "tB", "Team B", "a2")

	fA, _ := createField("tA", Row{"form_name": "问卷", "field_name": "姓名", "field_type": "text"})
	fB, _ := createField("tB", Row{"form_name": "问卷", "field_name": "姓名", "field_type": "text"})
	insertRow("records", Row{"team_id": "tA", "item_id": "iA", "field_id": fA, "field_value": "甲"})
	insertRow("records", Row{"team_id": "tB", "item_id": "iB", "field_id": fB, "field_value": "乙"})

	// getRecords is scoped.
	if n := len(getRecords("tA", "iB")); n != 0 {
		t.Fatal("getRecords leaked another team's item")
	}
	if n := len(getRecords("tA", "iA")); n != 1 {
		t.Fatal("getRecords lost the team's own item")
	}

	// The grouped listing only counts the team's own form.
	got := getAllRecord("tA", "问卷", 1, 10, "")
	if total := asInt64(got["total"]); total != 1 {
		t.Fatalf("getAllRecord(tA) total = %d, want 1", total)
	}
	// Asking for a form that is not in this team yields nothing, not everything.
	empty := getAllRecord("tA", "别的表单", 1, 10, "")
	if total := asInt64(empty["total"]); total != 0 {
		t.Fatalf("getAllRecord for a foreign form returned %d rows", total)
	}

	// recordDel must not delete across teams.
	deleteRecordByItem("tA", "iB")
	if n := len(selectRows("records", Row{"team_id": "tB"}, selectOpts{skipDeleted: true})); n != 1 {
		t.Fatal("deleteRecordByItem deleted another team's record")
	}
	deleteRecordByItem("tA", "iA")
	if n := len(selectRows("records", Row{"team_id": "tA"}, selectOpts{skipDeleted: true})); n != 0 {
		t.Fatal("deleteRecordByItem did not delete the team's own record")
	}
}

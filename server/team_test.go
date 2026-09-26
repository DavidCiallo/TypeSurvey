package main

import (
	"database/sql"
	"encoding/json"
	"path/filepath"
	"testing"
)

// oldSchema mirrors the database before multi-tenancy: fields/radios/records
// carry no team_id. Reproduced here so the upgrade path is exercised for real
// instead of assumed.
const oldSchema = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS accounts (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL DEFAULT '', password TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}', create_time INTEGER NOT NULL DEFAULT 0, delete_time INTEGER);
CREATE TABLE IF NOT EXISTS fields (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
	form_name TEXT NOT NULL DEFAULT '', field_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}', create_time INTEGER NOT NULL DEFAULT 0, delete_time INTEGER);
CREATE TABLE IF NOT EXISTS radios (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
	field_id TEXT NOT NULL DEFAULT '', radio_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}', create_time INTEGER NOT NULL DEFAULT 0, delete_time INTEGER);
CREATE TABLE IF NOT EXISTS records (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
	item_id TEXT NOT NULL DEFAULT '', field_id TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}', create_time INTEGER NOT NULL DEFAULT 0, delete_time INTEGER);
CREATE TABLE IF NOT EXISTS settings (
	seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
	key TEXT NOT NULL DEFAULT '', value TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}', create_time INTEGER NOT NULL DEFAULT 0, delete_time INTEGER);
`

func setupDB(t *testing.T) {
	t.Helper()
	t.Setenv("DATA_DIR", t.TempDir())
	t.Setenv("SECRET", "0123456789abcdef0123456789abcdef")
	initPaths()
	initCrypto()
	// Close before TempDir cleanup, or Windows refuses to unlink the database.
	t.Cleanup(func() {
		if db != nil {
			db.Close()
			db = nil
		}
	})
}

func mustExec(t *testing.T, d *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := d.Exec(q, args...); err != nil {
		t.Fatalf("exec failed: %v\n%s", err, q)
	}
}

func js(t *testing.T, m map[string]any) string {
	t.Helper()
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

// legacyDB builds a pre-multi-tenancy database: one admin, one form with two
// fields, a radio, and two records.
func legacyDB(t *testing.T) {
	t.Helper()
	d, err := sql.Open("sqlite", "file:"+filepath.Join(dataDir, "typesurvey.db"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer d.Close()
	if _, err := d.Exec(oldSchema); err != nil {
		t.Fatalf("old schema: %v", err)
	}

	mustExec(t, d, `INSERT INTO accounts (id,email,password,body,create_time,delete_time) VALUES (?,?,?,?,?,NULL)`,
		"acc1", "admin@example.com", "x",
		js(t, map[string]any{"id": "acc1", "name": "Admin", "email": "admin@example.com",
			"password": "x", "is_admin": 1, "create_time": 1000, "update_time": 1000}), 1000)

	for _, f := range []struct{ id, name string }{{"fld1", "姓名"}, {"fld2", "电话"}} {
		mustExec(t, d, `INSERT INTO fields (id,form_name,field_name,body,create_time,delete_time) VALUES (?,?,?,?,?,NULL)`,
			f.id, "客户问卷", f.name,
			js(t, map[string]any{"id": f.id, "form_name": "客户问卷", "field_name": f.name,
				"field_type": "text", "position": 1, "create_time": 1000, "update_time": 1000}), 1000)
	}

	mustExec(t, d, `INSERT INTO radios (id,field_id,radio_name,body,create_time,delete_time) VALUES (?,?,?,?,?,NULL)`,
		"rad1", "fld1", "选项A",
		js(t, map[string]any{"id": "rad1", "field_id": "fld1", "radio_name": "选项A",
			"create_time": 1000, "update_time": 1000}), 1000)

	for i, rec := range []struct{ id, item string }{{"rec1", "itm1"}, {"rec2", "itm2"}} {
		mustExec(t, d, `INSERT INTO records (id,item_id,field_id,body,create_time,delete_time) VALUES (?,?,?,?,?,NULL)`,
			rec.id, rec.item, "fld1",
			js(t, map[string]any{"id": rec.id, "item_id": rec.item, "field_id": "fld1",
				"field_value": i, "create_time": 1000, "update_time": 1000}), 1000)
	}
}

// TestTeamMigrationBackfillsExistingRows is the upgrade test: an existing
// single-tenant database must come out the other side fully assigned to a
// default team, with nothing lost.
func TestTeamMigrationBackfillsExistingRows(t *testing.T) {
	setupDB(t)
	legacyDB(t)

	if err := openDB(); err != nil {
		t.Fatalf("openDB on a pre-team database: %v", err)
	}
	if err := migrateToTeamModel(); err != nil {
		t.Fatalf("migrateToTeamModel: %v", err)
	}

	teams := selectRows("teams", Row{}, selectOpts{skipDeleted: true})
	if len(teams) != 1 {
		t.Fatalf("want exactly 1 default team, got %d", len(teams))
	}
	teamID := asStr(teams[0]["id"])
	if teamID == "" {
		t.Fatal("default team has no id")
	}

	// Nothing may be dropped, and every row must carry the default team.
	for _, table := range []string{"fields", "records", "radios"} {
		rows := selectRows(table, Row{}, selectOpts{allTenants: true})
		if len(rows) == 0 {
			t.Fatalf("%s: no rows survived the migration", table)
		}
		for _, row := range rows {
			if got := asStr(row["team_id"]); got != teamID {
				t.Errorf("%s %s: team_id=%q, want %q", table, asStr(row["id"]), got, teamID)
			}
		}
	}
	if n := len(selectRows("fields", Row{}, selectOpts{allTenants: true})); n != 2 {
		t.Errorf("fields: got %d rows, want 2", n)
	}
	if n := len(selectRows("records", Row{}, selectOpts{allTenants: true})); n != 2 {
		t.Errorf("records: got %d rows, want 2", n)
	}
	if n := len(selectRows("radios", Row{}, selectOpts{allTenants: true})); n != 1 {
		t.Errorf("radios: got %d rows, want 1", n)
	}

	// The admin owns it.
	members := selectRows("team_members", Row{"team_id": teamID}, selectOpts{skipDeleted: true})
	if len(members) != 1 {
		t.Fatalf("want 1 member, got %d", len(members))
	}
	if got := asStr(members[0]["account_id"]); got != "acc1" {
		t.Errorf("member account_id=%q, want acc1", got)
	}
	if got := asStr(members[0]["role"]); got != "owner" {
		t.Errorf("role=%q, want owner", got)
	}

	// Re-running must be a no-op, not a second team.
	if err := migrateToTeamModel(); err != nil {
		t.Fatalf("second migrateToTeamModel: %v", err)
	}
	if n := len(selectRows("teams", Row{}, selectOpts{skipDeleted: true})); n != 1 {
		t.Errorf("re-running the migration created extra teams: %d", n)
	}
}

// TestTeamScopeIsolatesTeams covers the core guarantee: two teams may use the
// same form name and neither sees the other's rows.
func TestTeamScopeIsolatesTeams(t *testing.T) {
	setupDB(t)
	if err := openDB(); err != nil {
		t.Fatalf("openDB: %v", err)
	}

	insertRow("teams", Row{"id": "teamA", "name": "A", "creator_id": "accA"})
	insertRow("teams", Row{"id": "teamB", "name": "B", "creator_id": "accB"})
	insertRow("team_members", Row{"team_id": "teamA", "account_id": "accA", "role": "owner"})
	insertRow("team_members", Row{"team_id": "teamB", "account_id": "accB", "role": "owner"})
	// Same form_name on purpose — this is exactly what single-tenancy forbids.
	insertRow("fields", Row{"id": "fA", "team_id": "teamA", "form_name": "问卷", "field_name": "x"})
	insertRow("fields", Row{"id": "fB", "team_id": "teamB", "form_name": "问卷", "field_name": "x"})

	got := selectScoped("fields", scope{teams: []string{"teamA"}}, Row{"form_name": "问卷"}, selectOpts{skipDeleted: true})
	if len(got) != 1 {
		t.Fatalf("team A saw %d fields, want 1", len(got))
	}
	if id := asStr(got[0]["id"]); id != "fA" {
		t.Errorf("team A saw field %q, want fA", id)
	}

	all := selectRows("fields", Row{"form_name": "问卷"}, selectOpts{skipDeleted: true, allTenants: true})
	if len(all) != 2 {
		t.Fatalf("unscoped read saw %d fields, want 2", len(all))
	}

	// The dangerous case: an empty team list must match NOTHING. If it degraded
	// into "no filter" this would return both rows.
	if n := len(selectScoped("fields", scope{teams: []string{}}, Row{}, selectOpts{skipDeleted: true})); n != 0 {
		t.Errorf("empty team scope returned %d rows — must fail closed", n)
	}
}

// TestSoftDeletedTeamIsInvisibleToMembers pins the soft-delete semantics: the
// team disappears for its members but its rows are all still there.
func TestSoftDeletedTeamIsInvisibleToMembers(t *testing.T) {
	setupDB(t)
	if err := openDB(); err != nil {
		t.Fatalf("openDB: %v", err)
	}

	insertRow("teams", Row{"id": "teamA", "name": "A", "creator_id": "accA"})
	insertRow("team_members", Row{"team_id": "teamA", "account_id": "accA", "role": "owner"})
	insertRow("fields", Row{"id": "fA", "team_id": "teamA", "form_name": "问卷", "field_name": "x"})

	if ids := liveTeamIDs("accA"); len(ids) != 1 {
		t.Fatalf("before soft delete: liveTeamIDs = %v, want [teamA]", ids)
	}

	team := selectOneIgnoreDelete("teams", Row{"id": "teamA"})
	if team == nil {
		t.Fatal("team not created")
	}
	team["delete_time"] = 1234
	if err := persistRow("teams", team); err != nil {
		t.Fatalf("persistRow: %v", err)
	}

	if ids := liveTeamIDs("accA"); len(ids) != 0 {
		t.Errorf("soft-deleted team still visible to its member: %v", ids)
	}
	if getTeam("teamA") != nil {
		t.Error("getTeam returned a soft-deleted team")
	}
	// The row itself and all of its data survive.
	if selectOneIgnoreDelete("teams", Row{"id": "teamA"}) == nil {
		t.Error("soft delete removed the team row instead of marking it")
	}
	if n := len(selectRows("fields", Row{}, selectOpts{skipDeleted: true, allTenants: true})); n != 1 {
		t.Errorf("soft delete removed the team's fields: got %d, want 1", n)
	}
}

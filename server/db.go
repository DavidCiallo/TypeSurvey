package main

import (
	"database/sql"
	"fmt"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// One connection: writes are serialized app-side anyway (same as the JSONL
// write lock), it dodges SQLITE_BUSY entirely and keeps RSS low.
var db *sql.DB

// Each table keeps the row body as JSON exactly as the TS repository stored
// it in JSONL (full-fidelity round-trip incl. field_value types), plus the
// columns actually queried. `seq` preserves JSONL file order, which the TS
// Repository relies on for list ordering (newest append first for find()).
//
// Multi-tenancy: a "team" is the ownership unit (not an account, so forms
// survive staff turnover). fields/radios/records carry a denormalized team_id
// so every read can be scoped by index instead of filtered in memory.
const schema = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS accounts (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL DEFAULT '',
	password TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

CREATE TABLE IF NOT EXISTS teams (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL DEFAULT '',
	creator_id TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_teams_creator ON teams(creator_id);

CREATE TABLE IF NOT EXISTS team_members (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	team_id TEXT NOT NULL DEFAULT '',
	account_id TEXT NOT NULL DEFAULT '',
	role TEXT NOT NULL DEFAULT 'member',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_team_members_account ON team_members(account_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

-- Invite codes keep expiry / used_by / used_time in body; only the lookup key
-- and the owner are columns.
CREATE TABLE IF NOT EXISTS team_invites (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	team_id TEXT NOT NULL DEFAULT '',
	code TEXT NOT NULL DEFAULT '',
	created_by TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(code);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);

CREATE TABLE IF NOT EXISTS fields (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	team_id TEXT NOT NULL DEFAULT '',
	form_name TEXT NOT NULL DEFAULT '',
	field_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);

CREATE TABLE IF NOT EXISTS radios (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	team_id TEXT NOT NULL DEFAULT '',
	field_id TEXT NOT NULL DEFAULT '',
	radio_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);

CREATE TABLE IF NOT EXISTS records (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	team_id TEXT NOT NULL DEFAULT '',
	item_id TEXT NOT NULL DEFAULT '',
	field_id TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_records_field ON records(field_id);

CREATE TABLE IF NOT EXISTS settings (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	key TEXT NOT NULL DEFAULT '',
	value TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
`

// teamIndexes reference team_id, so they cannot live in `schema`: on a database
// created before multi-tenancy, CREATE TABLE IF NOT EXISTS does not add the
// column, and building the index would fail before ensureTeamColumns runs.
const teamIndexes = `
CREATE INDEX IF NOT EXISTS idx_fields_team_form ON fields(team_id, form_name);
CREATE INDEX IF NOT EXISTS idx_fields_team_pair ON fields(team_id, form_name, field_name);
CREATE INDEX IF NOT EXISTS idx_radios_team_field ON radios(team_id, field_id);
CREATE INDEX IF NOT EXISTS idx_records_team_item ON records(team_id, item_id);
`

// queryable columns per table (besides id/seq/body/timestamps).
var tableCols = map[string][]string{
	"accounts":     {"email", "password"},
	"teams":        {"name", "creator_id"},
	"team_members": {"team_id", "account_id", "role"},
	"team_invites": {"team_id", "code", "created_by"},
	"fields":       {"team_id", "form_name", "field_name"},
	"radios":       {"team_id", "field_id", "radio_name"},
	"records":      {"team_id", "item_id", "field_id"},
	"settings":     {"key", "value"},
}

// supersededIndexes are replaced by the team-prefixed composites in `schema`.
// Left in place they would be maintained on every write for no read benefit.
var supersededIndexes = []string{
	"idx_fields_form",  // -> idx_fields_team_form
	"idx_fields_pair",  // -> idx_fields_team_pair
	"idx_radios_field", // -> idx_radios_team_field
	"idx_records_item", // -> idx_records_team_item
}

func openDB() error {
	path := filepath.Join(dataDir, "typesurvey.db")
	d, err := sql.Open("sqlite", "file:"+path+"?_pragma=busy_timeout(10000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)")
	if err != nil {
		return err
	}
	d.SetMaxOpenConns(1)
	if _, err := d.Exec(schema); err != nil {
		return fmt.Errorf("schema: %w", err)
	}
	db = d
	if err := ensureTeamColumns(); err != nil {
		return err
	}
	// Only safe once team_id exists (see teamIndexes).
	if _, err := d.Exec(teamIndexes); err != nil {
		return fmt.Errorf("team indexes: %w", err)
	}
	return nil
}

// ensureTeamColumns adds team_id to databases created before multi-tenancy.
// CREATE TABLE IF NOT EXISTS does not alter an existing table, so a pre-existing
// install needs an explicit ALTER. Idempotent: re-running is a no-op.
func ensureTeamColumns() error {
	for _, table := range []string{"fields", "radios", "records"} {
		has, err := columnExists(table, "team_id")
		if err != nil {
			return err
		}
		if has {
			continue
		}
		if _, err := db.Exec(`ALTER TABLE ` + table + ` ADD COLUMN team_id TEXT NOT NULL DEFAULT ''`); err != nil {
			return fmt.Errorf("add %s.team_id: %w", table, err)
		}
		fmt.Printf("[Migrate] %s: added team_id column\n", table)
	}
	for _, idx := range supersededIndexes {
		db.Exec(`DROP INDEX IF EXISTS ` + idx)
	}
	return nil
}

func columnExists(table, col string) (bool, error) {
	rows, err := db.Query(`PRAGMA table_info(` + table + `)`)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	for rows.Next() {
		var (
			cid, notnull, pk int
			name, ctype      string
			dflt             any
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return false, err
		}
		if name == col {
			return true, nil
		}
	}
	return false, rows.Err()
}

func metaGet(k string) string {
	var v string
	db.QueryRow(`SELECT v FROM meta WHERE k = ?`, k).Scan(&v)
	return v
}

func metaSet(k, v string) {
	db.Exec(`INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`, k, v)
}

func tableEmpty(table string) bool {
	var n int
	db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&n)
	return n == 0
}

// migrateJSONL imports the Bun server's *.jsonl stores once. The files are
// left in place as a backup; a meta marker keeps this idempotent. Row order
// (JSONL line order) is preserved via seq.
func migrateJSONL() error {
	if metaGet("migrated") == "1" {
		return nil
	}
	jobs := []struct{ table, marker string }{
		{"accounts", "account"}, {"fields", "field"}, {"radios", "radio"},
		{"records", "record"}, {"settings", "settings"},
	}
	for _, j := range jobs {
		if !tableEmpty(j.table) {
			continue // partially migrated by hand — never duplicate
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		count := 0
		var importErr error
		scanErr := streamJSONL(filepath.Join(dataDir, j.marker+".jsonl"), func(row map[string]any) {
			if importErr != nil {
				return
			}
			normalizeRow(row)
			if err := insertRawRowTx(tx, j.table, row); err != nil {
				importErr = fmt.Errorf("import %s id %v: %w", j.table, row["id"], err)
				return
			}
			count++
		})
		if importErr == nil {
			importErr = scanErr
		}
		if importErr == nil {
			importErr = tx.Commit()
		} else {
			tx.Rollback()
			return importErr
		}
		fmt.Printf("[Migrate] %s: %d rows\n", j.table, count)
	}
	metaSet("migrated", "1")
	return nil
}

// migrateToTeamModel assigns everything predating multi-tenancy to one default
// team owned by the first admin. Runs once, after the default admin exists.
//
// Rows are rewritten through persistRow rather than a bare UPDATE: selectRows
// re-checks the where clause against the decoded body, so the column and the
// body JSON must stay in agreement.
func migrateToTeamModel() error {
	if metaGet("team_migrated") == "1" {
		return nil
	}

	// Only needed when there is pre-team data to hand over. On a fresh install
	// every row already carries a team_id, and creating a default team there
	// would be actively harmful: it would spend the first admin's one-team
	// allowance on a team they never asked for, leaving team/create permanently
	// refused for them.
	needsTeam := 0
	for _, table := range []string{"fields", "radios", "records"} {
		for _, row := range selectRows(table, Row{}, selectOpts{allTenants: true}) {
			if asStr(row["team_id"]) == "" {
				needsTeam++
			}
		}
	}
	if needsTeam == 0 {
		metaSet("team_migrated", "1")
		return nil
	}

	// Not selectOne(Row{"is_admin": 1}): matches()/strictEq resolve numbers via
	// jsNumber, which has no Go int case, so a literal int here would silently
	// never match. asInt64 is what the rest of the codebase uses for this flag.
	var admin Row
	for _, a := range selectRows("accounts", Row{}, selectOpts{skipDeleted: true}) {
		if asInt64(a["is_admin"]) != 0 {
			admin = a
			break
		}
	}
	if admin == nil {
		// Pre-team data but no admin configured yet. Leave the marker unset so
		// this retries next boot rather than stranding the data.
		return nil
	}
	adminID := asStr(admin["id"])

	teamID := nanoID(6)
	insertRow("teams", Row{"id": teamID, "name": "默认团队", "creator_id": adminID})
	insertRow("team_members", Row{"team_id": teamID, "account_id": adminID, "role": "owner"})

	// fields first: records and radios resolve their team through field_id.
	fields := 0
	all_fields := selectRows("fields", Row{}, selectOpts{allTenants: true})
	for _, row := range all_fields {
		if asStr(row["team_id"]) != "" {
			continue
		}
		row["team_id"] = teamID
		persistRow("fields", row)
		fields++
	}

	fieldTeam := map[string]string{}
	for _, row := range selectRows("fields", Row{}, selectOpts{allTenants: true}) {
		fieldTeam[asStr(row["id"])] = asStr(row["team_id"])
	}

	orphans := 0
	for _, table := range []string{"records", "radios"} {
		n := 0
		for _, row := range selectRows(table, Row{}, selectOpts{allTenants: true}) {
			if asStr(row["team_id"]) != "" {
				continue
			}
			tid := fieldTeam[asStr(row["field_id"])]
			if tid == "" {
				// field_id points at a row that no longer exists. Keep the data
				// (never silently drop it) and give it to the default team.
				tid = teamID
				orphans++
			}
			row["team_id"] = tid
			persistRow(table, row)
			n++
		}
		fmt.Printf("[Migrate] %s: %d rows assigned a team\n", table, n)
	}

	metaSet("team_migrated", "1")
	fmt.Printf("[Migrate] team model: default team %s, %d fields assigned (%d orphans)\n",
		teamID, fields, orphans)
	return nil
}

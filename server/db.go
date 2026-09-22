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

CREATE TABLE IF NOT EXISTS fields (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	form_name TEXT NOT NULL DEFAULT '',
	field_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_fields_form ON fields(form_name);
CREATE INDEX IF NOT EXISTS idx_fields_pair ON fields(form_name, field_name);

CREATE TABLE IF NOT EXISTS radios (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	field_id TEXT NOT NULL DEFAULT '',
	radio_name TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_radios_field ON radios(field_id);

CREATE TABLE IF NOT EXISTS records (
	seq INTEGER PRIMARY KEY AUTOINCREMENT,
	id TEXT NOT NULL UNIQUE,
	item_id TEXT NOT NULL DEFAULT '',
	field_id TEXT NOT NULL DEFAULT '',
	body TEXT NOT NULL DEFAULT '{}',
	create_time INTEGER NOT NULL DEFAULT 0,
	delete_time INTEGER);
CREATE INDEX IF NOT EXISTS idx_records_item ON records(item_id);
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

// queryable columns per table (besides id/seq/body/timestamps).
var tableCols = map[string][]string{
	"accounts": {"email", "password"},
	"fields":   {"form_name", "field_name"},
	"radios":   {"field_id", "radio_name"},
	"records":  {"item_id", "field_id"},
	"settings": {"key", "value"},
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
	return nil
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

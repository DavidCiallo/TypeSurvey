package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// Generic row store over JSON bodies. Semantics mirror server/lib/repository.ts:
//   - reads skip soft-deleted rows and use "matches()" where-clauses (empty
//     string / undefined where values are ignored, strict equality otherwise);
//   - find() order is newest-append-first (seq DESC), findEach()/findOne() walk
//     forward (seq ASC) unless reverse is requested;
//   - update()/hardDelete() use strict equality (no operator support) and
//     update() always bumps update_time and skips deleted rows;
//   - insert()/batchInsert() default id/create_time/update_time and force
//     delete_time to null.

type Row = map[string]any

// ---------- JSONL + JSON value helpers ----------

func streamJSONL(path string, fn func(row Row)) error {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1024*1024), 64*1024*1024)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		var m Row
		dec := json.NewDecoder(strings.NewReader(line))
		dec.UseNumber()
		if dec.Decode(&m) != nil {
			continue
		}
		fn(m)
	}
	return sc.Err()
}

func decodeBody(body string) Row {
	var m Row
	dec := json.NewDecoder(strings.NewReader(body))
	dec.UseNumber()
	if err := dec.Decode(&m); err != nil || m == nil {
		return Row{}
	}
	return m
}

func encodeBody(row Row) string {
	b, err := json.Marshal(row)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func asStr(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case json.Number:
		return t.String()
	case float64:
		return fmt.Sprintf("%v", t)
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		b, _ := json.Marshal(v)
		return string(b)
	}
}

func asInt64(v any) int64 {
	switch t := v.(type) {
	case nil:
		return 0
	case json.Number:
		n, err := t.Int64()
		if err != nil {
			f, _ := t.Float64()
			return int64(f)
		}
		return n
	case float64:
		return int64(t)
	case int64:
		return t
	case int:
		return int64(t)
	case string:
		var n int64
		fmt.Sscanf(t, "%d", &n)
		return n
	case bool:
		if t {
			return 1
		}
		return 0
	default:
		return 0
	}
}

// normalizeRow fills the base entity keys like the TS repository does on insert.
func normalizeRow(row Row) {
	if asStr(row["id"]) == "" {
		row["id"] = nanoID(6)
	}
	if _, ok := row["create_time"]; !ok {
		row["create_time"] = json.Number(fmt.Sprintf("%d", nowMillis()))
	}
	if _, ok := row["update_time"]; !ok {
		row["update_time"] = row["create_time"]
	}
}

// strictEq is JS `===` for JSON scalars.
func strictEq(a, b any) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	switch ta := a.(type) {
	case string:
		tb, ok := b.(string)
		return ok && ta == tb
	case bool:
		tb, ok := b.(bool)
		return ok && ta == tb
	case json.Number:
		fa, err1 := ta.Float64()
		fb, ok2 := jsNumber(b)
		return err1 == nil && ok2 && fa == fb
	default:
		return false
	}
}

// matches mirrors repository.ts matches(): empty-string/undefined where values
// are skipped, null demands a null column, object values are operators.
func matches(row Row, where Row) bool {
	for key, val := range where {
		if val == nil {
			// `val === null` in JS: the column must exist and be null
			v, exists := row[key]
			if exists && v == nil {
				continue
			}
			return false
		}
		if s, ok := val.(string); ok && s == "" {
			continue
		}
		if opMap, ok := val.(map[string]any); ok && strings.HasPrefix(firstKey(opMap), "$") {
			if !matchOps(row[key], opMap) {
				return false
			}
			continue
		}
		if !strictEq(row[key], val) {
			return false
		}
	}
	return true
}

func firstKey(m map[string]any) string {
	for k := range m {
		return k
	}
	return ""
}

func matchOps(rowVal any, ops map[string]any) bool {
	for op, opVal := range ops {
		switch op {
		case "$eq":
			if !strictEq(rowVal, opVal) {
				return false
			}
		case "$ne":
			if strictEq(rowVal, opVal) {
				return false
			}
		case "$in":
			arr, ok := opVal.([]any)
			if !ok {
				return false
			}
			found := false
			for _, item := range arr {
				if strictEq(rowVal, item) {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		default: // $gt/$lt family is unused by this app
			return false
		}
	}
	return true
}

// ---------- SQL row plumbing ----------

type selectOpts struct {
	skipDeleted bool
	reverse     bool
	limit       int // 0 = no limit
}

// selectRows streams matching rows in seq order (file order parity).
func selectRows(table string, where Row, opts selectOpts) []Row {
	q := `SELECT body FROM ` + table
	var conds []string
	var args []any
	if opts.skipDeleted {
		conds = append(conds, "delete_time IS NULL")
	}
	for _, col := range tableCols[table] {
		if val, ok := where[col]; ok {
			if s, isStr := val.(string); isStr && s == "" {
				continue // matches() skips empty strings
			}
			if val == nil {
				continue
			}
			conds = append(conds, col+" = ?")
			args = append(args, asStr(val))
		}
	}
	if len(conds) > 0 {
		q += " WHERE " + strings.Join(conds, " AND ")
	}
	q += " ORDER BY seq"
	if opts.reverse {
		q += " DESC"
	}
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var out []Row
	for rows.Next() {
		var body string
		if err := rows.Scan(&body); err != nil {
			continue
		}
		row := decodeBody(body)
		if !matches(row, where) {
			continue
		}
		out = append(out, row)
		if opts.limit > 0 && len(out) >= opts.limit {
			break
		}
	}
	return out
}

// selectEach streams every matching row forward (like findEach).
func selectEach(table string, where Row, fn func(Row)) {
	for _, row := range selectRows(table, where, selectOpts{skipDeleted: true}) {
		fn(row)
	}
}

// selectOne is findOne(): first forward match.
func selectOne(table string, where Row) Row {
	rows := selectRows(table, where, selectOpts{skipDeleted: true, limit: 1})
	if len(rows) > 0 {
		return rows[0]
	}
	return nil
}

// selectOneReverse is findOne(where, true): first match from the newest end.
func selectOneReverse(table string, where Row) Row {
	rows := selectRows(table, where, selectOpts{skipDeleted: true, reverse: true, limit: 1})
	if len(rows) > 0 {
		return rows[0]
	}
	return nil
}

// selectOneIgnoreDelete matches rows regardless of delete_time
// (repository.ts findIgnoreDelete).
func selectOneIgnoreDelete(table string, where Row) Row {
	rows := selectRows(table, where, selectOpts{limit: 1})
	if len(rows) > 0 {
		return rows[0]
	}
	return nil
}

// selectAll returns every row including soft-deleted ones, file order
// (repository.ts findAllIgnoreDelete).
func selectAll(table string) []Row {
	return selectRows(table, Row{}, selectOpts{})
}

// persistRow writes body + queryable columns back for one id.
func persistRow(table string, row Row) error {
	cols := tableCols[table]
	set := make([]any, 0, len(cols)+3)
	q := `UPDATE ` + table + ` SET body = ?`
	set = append(set, encodeBody(row))
	for _, col := range cols {
		q += ", " + col + " = ?"
		set = append(set, asStr(row[col]))
	}
	q += ", create_time = ?, delete_time = ? WHERE id = ?"
	set = append(set, asInt64(row["create_time"]), nullIfZero(row["delete_time"]), asStr(row["id"]))
	_, err := db.Exec(q, set...)
	return err
}

func insertRawRowTx(tx *sql.Tx, table string, row Row) error {
	cols := tableCols[table]
	names := []string{"id"}
	qmarks := []string{"?"}
	args := []any{asStr(row["id"])}
	for _, col := range cols {
		names = append(names, col)
		qmarks = append(qmarks, "?")
		args = append(args, asStr(row[col]))
	}
	names = append(names, "body", "create_time", "delete_time")
	qmarks = append(qmarks, "?", "?", "?")
	args = append(args, encodeBody(row), asInt64(row["create_time"]), nullIfZero(row["delete_time"]))
	_, err := tx.Exec(`INSERT INTO `+table+` (`+strings.Join(names, ", ")+`) VALUES (`+strings.Join(qmarks, ", ")+`)`, args...)
	return err
}

func nullIfZero(v any) any {
	if v == nil {
		return nil
	}
	return asInt64(v)
}

// insertRow mirrors repository.ts insert(): defaults id / create_time /
// update_time, forces delete_time to null, returns the stored row.
func insertRow(table string, entity Row) Row {
	row := Row{}
	for k, v := range entity {
		row[k] = v
	}
	if asStr(row["id"]) == "" {
		row["id"] = nanoID(6)
	}
	now := json.Number(fmt.Sprintf("%d", nowMillis()))
	if asInt64(row["create_time"]) == 0 {
		row["create_time"] = now
	}
	if asInt64(row["update_time"]) == 0 {
		row["update_time"] = now
	}
	row["delete_time"] = nil
	db.Exec(insertSQL(table), insertArgs(table, row)...)
	return row
}

// batchInsertRows mirrors repository.ts batchInsert().
func batchInsertRows(table string, entities []Row) int {
	if len(entities) == 0 {
		return 0
	}
	tx, err := db.Begin()
	if err != nil {
		return 0
	}
	now := json.Number(fmt.Sprintf("%d", nowMillis()))
	for _, entity := range entities {
		row := Row{}
		for k, v := range entity {
			row[k] = v
		}
		if asStr(row["id"]) == "" {
			row["id"] = nanoID(6)
		}
		if asInt64(row["create_time"]) == 0 {
			row["create_time"] = now
		}
		if asInt64(row["update_time"]) == 0 {
			row["update_time"] = now
		}
		row["delete_time"] = nil
		if err := insertRawRowTx(tx, table, row); err != nil {
			tx.Rollback()
			return 0
		}
	}
	tx.Commit()
	return len(entities)
}

func insertSQL(table string) string {
	names := []string{"id"}
	qmarks := []string{"?"}
	for _, col := range tableCols[table] {
		names = append(names, col)
		qmarks = append(qmarks, "?")
	}
	names = append(names, "body", "create_time", "delete_time")
	qmarks = append(qmarks, "?", "?", "?")
	return `INSERT INTO ` + table + ` (` + strings.Join(names, ", ") + `) VALUES (` + strings.Join(qmarks, ", ") + `)`
}

func insertArgs(table string, row Row) []any {
	args := []any{asStr(row["id"])}
	for _, col := range tableCols[table] {
		args = append(args, asStr(row[col]))
	}
	args = append(args, encodeBody(row), asInt64(row["create_time"]), nil) // delete_time forced NULL
	return args
}

// updateRows mirrors repository.ts update(): strict-equality where clause,
// skips deleted rows, bumps update_time.
func updateRows(table string, where Row, set Row) bool {
	targets := strictSelect(table, where, true)
	if len(targets) == 0 {
		return false
	}
	now := json.Number(fmt.Sprintf("%d", nowMillis()))
	for _, row := range targets {
		for k, v := range set {
			row[k] = v
		}
		row["update_time"] = now
		persistRow(table, row)
	}
	return true
}

// hardDeleteRows mirrors repository.ts hardDelete() but additionally supports
// an `IN` filter. (TS deleteForm passes {$in:…} to hardDelete, which its
// strict matcher silently never matches — orphaning records/radios. The Go
// version resolves field_id IN (…) properly; see server/README.md.)
func hardDeleteRows(table string, where Row, inFilter map[string][]string) bool {
	targets := strictSelect(table, where, false)
	var ids []any
	for _, row := range targets {
		if len(inFilter) > 0 {
			ok := true
			for col, vals := range inFilter {
				got := asStr(row[col])
				found := false
				for _, v := range vals {
					if got == v {
						found = true
						break
					}
				}
				if !found {
					ok = false
					break
				}
			}
			if !ok {
				continue
			}
		}
		ids = append(ids, asStr(row["id"]))
	}
	if len(ids) == 0 {
		return false
	}
	q := `DELETE FROM ` + table + ` WHERE id IN (` + strings.Repeat("?,", len(ids)-1) + `?)`
	db.Exec(q, ids...)
	return true
}

// strictSelect applies update()/hardDelete() where semantics: strict equality
// on every key (including empty strings), no matches() skipping.
func strictSelect(table string, where Row, skipDeleted bool) []Row {
	q := `SELECT body FROM ` + table
	var conds []string
	var args []any
	if skipDeleted {
		conds = append(conds, "delete_time IS NULL")
	}
	for _, col := range tableCols[table] {
		if val, ok := where[col]; ok {
			cond := col + " = ?"
			if val == nil {
				cond = col + " = ''"
			} else {
				args = append(args, asStr(val))
			}
			conds = append(conds, cond)
		}
	}
	if len(conds) > 0 {
		q += " WHERE " + strings.Join(conds, " AND ")
	}
	q += " ORDER BY seq"
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var out []Row
	for rows.Next() {
		var body string
		if err := rows.Scan(&body); err != nil {
			continue
		}
		row := decodeBody(body)
		if !strictMatch(row, where) {
			continue
		}
		out = append(out, row)
	}
	return out
}

func strictMatch(row Row, where Row) bool {
	for key, val := range where {
		v, exists := row[key]
		if !exists {
			if val != nil {
				return false
			}
			continue
		}
		if !strictEq(v, val) {
			return false
		}
	}
	return true
}

// truncateTable mirrors repository.ts truncate().
func truncateTable(table string) {
	db.Exec(`DELETE FROM ` + table)
}

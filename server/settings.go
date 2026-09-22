package main

import (
	"os"
	"sync"
)

// Settings store + env fallback, mirroring server/modules/settings/settings.service.ts.

var settingKeys = []struct{ key, env string }{
	{"allow_register", "ALLOW_REGISTER"},
	{"allowed_domains", "ALLOWED_REGISTER_DOMAINS"},
	{"allowed_from_domains", "ALLOWED_FROM_DOMAINS"},
	{"resend_api_key", "RESEND_API_KEY"},
	{"client_url", "CLIENT_URL"},
	{"api_key", "API_KEY"},
}

var (
	settingsMu    sync.RWMutex
	settingsCache = Row{}
)

func loadSettings() {
	settingsMu.Lock()
	defer settingsMu.Unlock()
	settingsCache = Row{}
	selectEach("settings", Row{}, func(row Row) {
		if asStr(row["key"]) != "" && row["delete_time"] == nil {
			settingsCache[asStr(row["key"])] = row["value"]
		}
	})
	for _, sk := range settingKeys {
		if !jsTruthy(settingsCache[sk.key]) {
			if envVal, ok := os.LookupEnv(sk.env); ok {
				settingsCache[sk.key] = envVal
			}
		}
	}
}

func getSetting(key string) string {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	v, ok := settingsCache[key]
	if !ok || v == nil {
		return ""
	}
	return jsString(v)
}

// getAllSettings returns the known setting keys in SETTING_KEYS order.
func getAllSettings() []Row {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	out := []Row{}
	for _, sk := range settingKeys {
		val := settingsCache[sk.key]
		if val == nil {
			val = ""
		}
		out = append(out, Row{"key": sk.key, "value": val})
	}
	return out
}

// getSettings returns the whole cache (incl. user-defined keys).
func getSettings() Row {
	settingsMu.RLock()
	defer settingsMu.RUnlock()
	out := Row{}
	for k, v := range settingsCache {
		out[k] = v
	}
	return out
}

func saveSettings(entries []Row) {
	for _, entry := range entries {
		key := entry["key"]
		value := entry["value"]
		existing := selectOne("settings", Row{"key": key})
		if existing != nil {
			updateRows("settings", Row{"key": key}, Row{"value": value})
		} else {
			insertRow("settings", Row{"key": key, "value": value})
		}
		settingsMu.Lock()
		settingsCache[asStr(key)] = value
		settingsMu.Unlock()
	}
}

// ---------- data export / import ----------

// getAllData returns every row (including soft-deleted) for backup export.
// NOTE: the TS version read these from the wrong repository ("form_field"),
// silently exporting zero fields — see server/README.md.
func getAllData() Row {
	return Row{
		"accounts": selectAll("accounts"),
		"fields":   selectAll("fields"),
		"radios":   selectAll("radios"),
		"records":  selectAll("records"),
		"settings": selectAll("settings"),
	}
}

// importAllData replaces each collection wholesale (truncate + batch insert).
// An empty/absent array leaves the collection untouched (same as TS).
func importAllData(data Row) Row {
	tables := map[string]string{
		"accounts": "accounts", "fields": "fields", "radios": "radios",
		"records": "records", "settings": "settings",
	}
	imported := Row{}
	for name, table := range tables {
		rowsAny, _ := data[name].([]any)
		if len(rowsAny) == 0 {
			imported[name] = 0
			continue
		}
		truncateTable(table)
		rows := make([]Row, 0, len(rowsAny))
		for _, r := range rowsAny {
			if m, ok := r.(map[string]any); ok {
				rows = append(rows, m)
			}
		}
		imported[name] = batchInsertRows(table, rows)
	}
	loadSettings()
	return imported
}

// ---------- handlers ----------

func settingsList(c *Ctx) (any, error) {
	if err := requireAdmin(c.Auth); err != nil {
		return nil, err
	}
	return Row{"entries": getAllSettings()}, nil
}

func settingsSave(c *Ctx) (any, error) {
	if err := requireAdmin(c.Auth); err != nil {
		return nil, err
	}
	entriesAny, ok := c.Value("entries").([]any)
	if !ok || len(entriesAny) == 0 {
		return nil, throwErr("No entries to save")
	}
	entries := make([]Row, 0, len(entriesAny))
	for _, e := range entriesAny {
		if m, ok := e.(map[string]any); ok {
			entries = append(entries, m)
		}
	}
	saveSettings(entries)
	return getSettings(), nil
}

func appExport(c *Ctx) (any, error) {
	if err := requireAdmin(c.Auth); err != nil {
		return nil, err
	}
	return Row{"version": 1, "exported_at": nowMillis(), "data": getAllData()}, nil
}

func appImport(c *Ctx) (any, error) {
	if err := requireAdmin(c.Auth); err != nil {
		return nil, err
	}
	data, _ := c.Value("data").(map[string]any)
	inner, _ := data["data"].(map[string]any)
	if inner == nil {
		return nil, throwErr("Invalid import data")
	}
	return Row{"imported": importAllData(inner)}, nil
}

package main

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// File module — chunked XLSX import, single-shot uploads, and /uploads static
// serving parity (server/modules/file/file.controller.ts).

const maxUploadSize = 10 * 1024 * 1024 // 10MB

type chunkRec struct {
	fileid    string
	filename  string
	size      int64
	chunkSite int64
	chunkData string
}

type tempData struct {
	tempid   string
	filename string
	header   []Row   // [{field, type, sub}] as produced by analyzeXlsx/analyzeCellType
	data     [][]any // raw sheet rows (string | null)
	// matchForm is the existing form this sheet's header fits ("" to create a
	// new form), matchIDs the field id each sheet column maps to on it.
	matchForm string
	matchIDs  []string
}

var (
	fileMu    sync.Mutex
	chunkList []chunkRec
	dataList  []tempData
)

// jsBase64Decode is a forgiving base64 decoder (Buffer.from(x, "base64")
// silently skips invalid input instead of failing).
func jsBase64Decode(s string) []byte {
	clean := strings.Map(func(r rune) rune {
		switch {
		case r >= 'A' && r <= 'Z', r >= 'a' && r <= 'z', r >= '0' && r <= '9',
			r == '+', r == '/', r == '=':
			return r
		default:
			return -1
		}
	}, s)
	raw, err := base64.StdEncoding.DecodeString(clean)
	if err == nil {
		return raw
	}
	raw, _ = base64.RawStdEncoding.DecodeString(strings.TrimRight(clean, "="))
	return raw
}

func fileReadXlsx(c *Ctx) (any, error) {
	file, _ := c.Value("file").(map[string]any)
	if file == nil {
		return nil, throwErr("File chunk is required")
	}
	fileid := asStr(file["fileid"])
	filename := asStr(file["filename"])
	size := asInt64(file["size"])
	chunkSite := asInt64(file["chunk_site"])
	chunkData := asStr(file["chunk_data"])

	fileMu.Lock()
	chunkList = append(chunkList, chunkRec{fileid, filename, size, chunkSite, chunkData})
	var totalReceived int64
	mine := []chunkRec{}
	for _, chunk := range chunkList {
		if chunk.fileid == fileid {
			totalReceived += int64(len(chunk.chunkData))
			mine = append(mine, chunk)
		}
	}
	fileMu.Unlock()

	if totalReceived < size {
		return Row{"tempid": "", "header": []any{}, "size": 0, "match_form": "", "match_num": 0}, nil
	}

	sort.SliceStable(mine, func(i, j int) bool { return mine[i].chunkSite < mine[j].chunkSite })
	var buf []byte
	for _, chunk := range mine {
		buf = append(buf, jsBase64Decode(chunk.chunkData)...)
	}
	if len(buf) == 0 {
		return nil, throwErr("文件组装失败")
	}

	header, data, err := analyzeXlsx(buf)
	if err != nil {
		return nil, throwErr(err.Error())
	}

	// Which existing form does this sheet belong to? Recomputed here rather
	// than stored, so the suggestion always reflects the forms as they are now.
	matchForm, matchNum, matchIDs := matchTargetForm(header)

	result := []Row{}
	for i, field := range header {
		cells := make([]any, len(data))
		for r := range data {
			if i < len(data[r]) {
				cells[r] = data[r][i]
			}
		}
		typ, sub := analyzeCellType(asStr(field), cells)
		result = append(result, Row{"field": field, "type": typ, "sub": sub})
	}

	fileMu.Lock()
	dataList = append(dataList, tempData{
		tempid: fileid, filename: filename, header: result, data: data,
		matchForm: matchForm, matchIDs: matchIDs,
	})
	kept := chunkList[:0]
	for _, chunk := range chunkList {
		if chunk.fileid != fileid {
			kept = append(kept, chunk)
		}
	}
	chunkList = kept
	fileMu.Unlock()

	return Row{"tempid": fileid, "header": result, "size": len(data), "match_form": matchForm, "match_num": matchNum}, nil
}

var sanitizeFormName = regexp.MustCompile(`[^a-zA-Z0-9\x{4e00}-\x{9fa5}]`)

func fileConfirm(c *Ctx) (any, error) {
	tempid := c.Str("tempid")
	fieldsAny, _ := c.Value("fields").([]any)
	usedata := jsTruthy(c.Value("usedata"))
	timeFieldIndex, hasTimeField := c.Int("time_field_index")
	// Column indexes the user picked as the dedup key, and per-row/per-field
	// choices from the conflict dialog. Both are optional: without a key the
	// import appends, which is the behaviour this always had.
	keyIndexes := intSlice(c.Value("key_fields"))

	fileMu.Lock()
	existIndex := -1
	for i := range dataList {
		if dataList[i].tempid == tempid {
			existIndex = i
			break
		}
	}
	if existIndex == -1 {
		fileMu.Unlock()
		return nil, throwErr("数据不存在")
	}
	existData := dataList[existIndex]
	header, data, filename := existData.header, existData.data, existData.filename
	targetForm, matchIDs := existData.matchForm, existData.matchIDs
	fileMu.Unlock()

	// A target form was named explicitly ("import into this form"), otherwise
	// fall back to the form the header matched. Either way the form must still
	// exist by the time we write: the fields are created up front when it does
	// not, so a stale suggestion degrades into "create a new form".
	requested := c.Str("target_form")
	if !jsTruthy(c.Value("target_form")) {
		requested = targetForm
	}
	if requested != "" && selectOne("fields", Row{"form_name": requested}) == nil {
		requested = ""
	}

	if requested != "" {
		if !usedata {
			return Row{"success": true}, nil
		}
		// Only the columns naming one of the target's fields are imported; the
		// rest are ignored rather than added as new fields.
		formName := requested
		fieldValues := matchIDs
		if jsTruthy(c.Value("target_form")) {
			columns := make([]string, len(header))
			for i, h := range header {
				columns[i] = matchHeaderKey(asStr(h["field"]))
			}
			byKey := fieldKeysByColumn(getFieldList(formName))
			fieldValues = matchColumns(columns, byKey)
		}

		fileMu.Lock()
		dataList = append(dataList[:existIndex], dataList[existIndex+1:]...)
		fileMu.Unlock()

		insertMatchedRecords(formName, header, data, fieldValues, timeFieldIndex, hasTimeField, keyIndexes)
		return Row{"success": true}, nil
	}

	formName := sanitizeFormName.ReplaceAllString(filename, "") + randSuffix(4)

	fieldCache := make([]map[string]any, len(fieldsAny))
	for i, f := range fieldsAny {
		if m, ok := f.(map[string]any); ok {
			fieldCache[i] = m
		}
	}

	for i := 0; i < len(header); i++ {
		if i >= len(fieldCache) {
			break
		}
		fc := fieldCache[i]
		fieldID, ok := createField(Row{
			"form_name":  formName,
			"field_name": fc["field"],
			"field_type": fc["type"],
			"required":   false,
			"disabled":   !jsTruthy(fc["check"]),
		})
		if !ok || fieldID == "" {
			continue
		}
		typ := asStr(fc["type"])
		if typ != "select" && typ != "mulselect" && typ != "checkbox" && typ != "checkboxgroup" {
			continue
		}
		subs, _ := header[i]["sub"].([]any)
		for _, s := range subs {
			createRadio(fieldID, asStr(s))
		}
	}

	fieldMap := map[string]string{}
	radioMap := map[string]string{}
	for _, field := range getFieldList(formName) {
		fieldMap[asStr(field["field_name"])] = asStr(field["id"])
		radios, _ := field["radios"].([]Row)
		for _, radio := range radios {
			radioMap[asStr(field["id"])+asStr(radio["radio_name"])] = asStr(radio["id"])
		}
	}

	fileMu.Lock()
	dataList = append(dataList[:existIndex], dataList[existIndex+1:]...)
	fileMu.Unlock()

	if !usedata {
		return Row{"success": true}, nil
	}

	// Columns are addressed by their edited name, which createField has just
	// made unique within the new form.
	fieldIDs := make([]string, len(header))
	for i := range header {
		if i >= len(fieldCache) {
			break
		}
		fieldIDs[i] = fieldMap[asStr(fieldCache[i]["field"])]
	}
	insertMatchedRecords(formName, header, data, fieldIDs, timeFieldIndex, hasTimeField, nil)
	return Row{"success": true}, nil
}

// insertMatchedRecords writes one item per sheet row, storing each cell against
// the field its column maps to (fieldValues[i] == "" drops the column).
//
// When keyIndexes is non-empty, a row whose key matches an existing record is
// skipped: the existing record keeps its data, and only rows with no match are
// inserted.
func insertMatchedRecords(formName string, header []Row, data [][]any, fieldValues []string, timeFieldIndex int64, hasTimeField bool, keyIndexes []int) {
	// Radio-backed fields store the option id, not the label from the sheet.
	radioMap := map[string]string{}
	for _, field := range getFieldList(formName) {
		radios, _ := field["radios"].([]Row)
		for _, radio := range radios {
			radioMap[asStr(field["id"])+asStr(radio["radio_name"])] = asStr(radio["id"])
		}
	}

	keyFieldIDs := make([]string, len(keyIndexes))
	for i, idx := range keyIndexes {
		keyFieldIDs[i] = fieldValues[idx]
	}
	var known []dedupKey
	byKey := map[string][]dedupKey{}
	if len(keyIndexes) > 0 {
		known = existingKeys(formName, keyFieldIDs)
		for _, k := range known {
			byKey[strings.Join(k.values, "\x00")] = append(byKey[strings.Join(k.values, "\x00")], k)
		}
	}

	const batchSize = 500
	batch := []Row{}
	for _, row := range data {
		if len(keyIndexes) > 0 {
			if vals, ok := rowKeyValues(row, keyIndexes, radioMap, keyFieldIDs); ok {
				if len(byKey[strings.Join(vals, "\x00")]) > 0 {
					continue // already exists, keep the stored data
				}
			}
		}
		itemID := nanoID(6)

		var rowTime int64
		hasRowTime := false
		if hasTimeField && timeFieldIndex >= 0 && int(timeFieldIndex) < len(row) {
			if cell := row[timeFieldIndex]; jsTruthy(cell) {
				if ms, ok := parseJSDate(asStr(cell)); ok {
					rowTime, hasRowTime = ms, true
				}
			}
		}

		for index := 0; index < len(row) && index < len(fieldValues); index++ {
			cell := row[index]
			if !jsTruthy(cell) {
				continue
			}
			fieldID := fieldValues[index]
			if fieldID == "" {
				continue
			}
			var fieldValue any = asStr(cell)
			if rid, ok := radioMap[fieldID+asStr(cell)]; ok {
				fieldValue = rid
			}
			record := Row{"item_id": itemID, "field_id": fieldID, "field_value": fieldValue}
			if hasRowTime {
				record["create_time"] = rowTime
				record["update_time"] = rowTime
			}
			batch = append(batch, record)
			if len(batch) >= batchSize {
				insertImportRecords(batch)
				batch = []Row{}
			}
		}
	}
	if len(batch) > 0 {
		insertImportRecords(batch)
	}
}

// insertImportRecords writes a batch the way the import needs it: an existing
// (item_id, field_id) pair is updated in place with its timestamps preserved,
// everything else is inserted. submitRecord cannot be reused because
// updateRows stamps update_time with the wall clock, which would rewrite when a
// record was collected rather than when it was re-imported.
func insertImportRecords(records []Row) {
	for _, record := range records {
		insertRow("records", record)
	}
}

// ---------- duplicate detection ----------

// dedupKey holds one existing record's key values, resolved to the same form
// the import writes to. Values are compared after normalization so a sheet
// " 张三 " matches a stored "张三", and a select label matches its stored id.
type dedupKey struct {
	itemID string
	values []string
}

// keyValueOf renders one stored value for comparison against the sheet: radio
// ids are resolved back to their label so the sheet's plain text matches.
//
// Dates are the reason normalization exists at all. A date field stores what
// the sheet said, but a date entered through the UI can be normalized to a
// different shape, so both sides reduce a date-like value to a millisecond
// timestamp. Plain numbers must not go through that: a stored "80" would
// become epoch-80ms and never match the sheet's "80".
func keyValueOf(fieldID string, stored any, labelByID map[string]string) string {
	s := strings.TrimSpace(asStr(stored))
	if s == "" {
		return ""
	}
	if name, ok := labelByID[fieldID+s]; ok {
		return strings.TrimSpace(name)
	}
	if ms, ok := parseJSDate(s); ok && dateLike(s) {
		return strconv.FormatInt(ms, 10)
	}
	return s
}

// dateLike reports whether s reads as a date rather than a number.
func dateLike(s string) bool {
	return strings.ContainsAny(s, "-/:")
}

// rowKeyValue renders one sheet cell the same way keyValueOf renders a stored
// value, so both sides of the comparison use one normal form.
func rowKeyValue(cell string, radioMap map[string]string, fieldID string) string {
	s := strings.TrimSpace(cell)
	if s == "" {
		return ""
	}
	if rid, ok := radioMap[fieldID+s]; ok {
		return rid
	}
	if ms, ok := parseJSDate(s); ok && dateLike(s) {
		return strconv.FormatInt(ms, 10)
	}
	return s
}

// rowKeyValues renders the sheet's key columns for the same comparison. A
// select label is translated to its id through radioMap, mirroring what the
// write path would store. Each cell goes through rowKeyValue so a date in the
// sheet and a date in the database normalize identically.
func rowKeyValues(row []any, keyIndexes []int, radioMap map[string]string, keyFieldIDs []string) ([]string, bool) {
	vals := make([]string, len(keyIndexes))
	for n, idx := range keyIndexes {
		if idx >= len(row) {
			return nil, false
		}
		cell := rowKeyValue(asStr(row[idx]), radioMap, keyFieldIDs[n])
		if cell == "" {
			return nil, false // an empty key can never identify a record
		}
		vals[n] = cell
	}
	return vals, true
}

// existingKeys indexes the target form's records by their key values. The form
// stores one row per field, so records are grouped by item_id first.
func existingKeys(formName string, keyFieldIDs []string) []dedupKey {
	if len(keyFieldIDs) == 0 {
		return nil
	}
	labelByID := map[string]string{}
	fieldSet := map[string]bool{}
	selectEach("fields", Row{"form_name": formName}, func(field Row) {
		id := asStr(field["id"])
		if contains(keyFieldIDs, id) {
			fieldSet[id] = true
		}
		radios, _ := field["radios"].([]Row)
		for _, r := range radios {
			labelByID[id+asStr(r["id"])] = asStr(r["radio_name"])
		}
	})

	grouped := map[string]map[string]any{}
	order := []string{}
	selectEach("records", Row{}, func(record Row) {
		fid := asStr(record["field_id"])
		if !fieldSet[fid] {
			return
		}
		itemID := asStr(record["item_id"])
		if _, ok := grouped[itemID]; !ok {
			grouped[itemID] = map[string]any{}
			order = append(order, itemID)
		}
		grouped[itemID][fid] = record["field_value"]
	})

	keys := make([]dedupKey, 0, len(order))
	for _, itemID := range order {
		vals := grouped[itemID]
		rendered := make([]string, len(keyFieldIDs))
		complete := true
		for i, fid := range keyFieldIDs {
			v, ok := vals[fid]
			if !ok {
				complete = false
				break
			}
			rendered[i] = keyValueOf(fid, v, labelByID)
		}
		// A record missing any key column cannot be matched; leaving it out is
		// safer than treating it as a wildcard that matches every row.
		if !complete {
			continue
		}
		keys = append(keys, dedupKey{itemID: itemID, values: rendered})
	}
	return keys
}

func contains(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

// intSlice reads a JSON array of column indexes, dropping anything that is not
// a usable index. A malformed entry is ignored rather than failing the import.
func intSlice(v any) []int {
	arr, _ := v.([]any)
	out := make([]int, 0, len(arr))
	for _, item := range arr {
		n, ok := jsNumber(item)
		if !ok || n < 0 {
			continue
		}
		out = append(out, int(n))
	}
	return out
}

// parseJSDate approximates `new Date(s).getTime()` for the common shapes:
// "yyyy-mm-dd hh:mm:ss" / "yyyy/mm/dd" are local, bare "yyyy-mm-dd" is UTC.
func parseJSDate(s string) (int64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	type layout struct {
		lo   string
		zone *time.Location
	}
	local, utc := time.Local, time.UTC
	for _, l := range []layout{
		{"2006-01-02 15:04:05", local},
		{"2006-01-02 15:04", local},
		{"2006-01-02T15:04:05Z07:00", local},
		{"2006-01-02T15:04:05", local},
		{"2006/01/02 15:04:05", local},
		{"2006/01/02 15:04", local},
		{"2006/01/02", local},
		{"2006-1-2 15:4:5", local},
		{"2006-01-02", utc}, // JS parses bare ISO dates as UTC
		{"2006-1-2", utc},
	} {
		if t, err := time.ParseInLocation(l.lo, s, l.zone); err == nil {
			return t.UnixMilli(), true
		}
	}
	if ms, err := strconv.ParseInt(s, 10, 64); err == nil {
		return ms, true
	}
	return 0, false
}

var uploadExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	".bmp": true, ".pdf": true, ".doc": true, ".docx": true,
	".xls": true, ".xlsx": true,
}

func fileUpload(c *Ctx) (any, error) {
	filename := c.Str("filename")
	data := c.Str("data")
	if !jsTruthy(c.Value("filename")) || !jsTruthy(c.Value("data")) {
		return nil, throwErr("参数错误")
	}

	buffer := jsBase64Decode(data)
	if len(buffer) > maxUploadSize {
		return nil, throwErr("文件超过10MB限制")
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if !uploadExts[ext] {
		return nil, throwErr("不支持的文件类型")
	}

	safename := nanoID(10) + ext
	if err := os.WriteFile(filepath.Join(uploadsDir, safename), buffer, 0o644); err != nil {
		return nil, throwErr("文件保存失败")
	}
	return Row{"url": "/uploads/" + safename}, nil
}

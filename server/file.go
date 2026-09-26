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
		return Row{"tempid": "", "header": []any{}, "size": 0}, nil
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

	result := []Row{}
	for i, field := range header {
		cells := make([]any, len(data))
		for r := range data {
			if i < len(data[r]) {
				cells[r] = data[r][i]
			}
		}
		typ, sub := analyzeCellType(cells)
		result = append(result, Row{"field": field, "type": typ, "sub": sub})
	}

	fileMu.Lock()
	dataList = append(dataList, tempData{tempid: fileid, filename: filename, header: result, data: data})
	kept := chunkList[:0]
	for _, chunk := range chunkList {
		if chunk.fileid != fileid {
			kept = append(kept, chunk)
		}
	}
	chunkList = kept
	fileMu.Unlock()

	return Row{"tempid": fileid, "header": result, "size": len(data)}, nil
}

var sanitizeFormName = regexp.MustCompile(`[^a-zA-Z0-9\x{4e00}-\x{9fa5}]`)

func fileConfirm(c *Ctx) (any, error) {
	tempid := c.Str("tempid")
	fieldsAny, _ := c.Value("fields").([]any)
	usedata := jsTruthy(c.Value("usedata"))
	timeFieldIndex, hasTimeField := c.Int("time_field_index")

	// The import creates a form, so it lands in exactly one team like any other
	// write. Resolved before the chunk buffer is touched.
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}

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
	fileMu.Unlock()

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
		fieldID, ok := createField(teamID, Row{
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
			createRadio(teamID, fieldID, asStr(s))
		}
	}

	fieldMap := map[string]string{}
	radioMap := map[string]string{}
	for _, field := range getFieldList(teamID, formName) {
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

	const batchSize = 500
	batch := []Row{}
	for _, row := range data {
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

		for index := 0; index < len(row); index++ {
			cell := row[index]
			if !jsTruthy(cell) {
				continue
			}
			if index >= len(fieldCache) {
				continue
			}
			fieldID := fieldMap[asStr(fieldCache[index]["field"])]
			var fieldValue any = asStr(cell)
			if rid, ok := radioMap[fieldID+asStr(cell)]; ok {
				fieldValue = rid
			}
			if fieldID != "" {
				record := Row{"item_id": itemID, "field_id": fieldID, "field_value": fieldValue}
				if hasRowTime {
					record["create_time"] = rowTime
					record["update_time"] = rowTime
				}
				batch = append(batch, record)
				if len(batch) >= batchSize {
					insertRecords(teamID, batch)
					batch = []Row{}
				}
			}
		}
	}
	if len(batch) > 0 {
		insertRecords(teamID, batch)
	}
	return Row{"success": true}, nil
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

package main

import (
	"bytes"
	"errors"
	"regexp"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// XLSX analysis — a port of server/methods/xlsx.ts (SheetJS):
//   - sheet_to_json({header:1, defval:null, raw:false}) semantics: every row is
//     padded to sheet width, blank cells are null, values are formatted text;
//   - date cells are force-formatted as yyyy-mm-dd before type detection.

func analyzeXlsx(buf []byte) ([]any, [][]any, error) {
	f, err := excelize.OpenReader(bytes.NewReader(buf))
	if err != nil {
		return nil, nil, errors.New("文件解析失败")
	}
	defer f.Close()
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, errors.New("文件解析失败")
	}
	sheet := sheets[0]

	formatted, err := f.GetRows(sheet)
	if err != nil {
		return nil, nil, errors.New("文件解析失败")
	}
	rawRows, _ := f.GetRows(sheet, excelize.Options{RawCellValue: true})

	// sheet width (SheetJS pads rows to the !ref range width via defval)
	width := 0
	for _, row := range formatted {
		if len(row) > width {
			width = len(row)
		}
	}

	rawData := make([][]any, 0, len(formatted))
	for r, row := range formatted {
		out := make([]any, width)
		for colIdx := 0; colIdx < width; colIdx++ {
			var val string
			if colIdx < len(row) {
				val = row[colIdx]
			}
			if val == "" {
				out[colIdx] = nil
				continue
			}
			// force yyyy-mm-dd for date cells (TS sets cell.w before export)
			if isDateCell(f, sheet, colIdx, r, rawRows) {
				out[colIdx] = formatDateCell(rawRows, colIdx, r)
				continue
			}
			out[colIdx] = val
		}
		rawData = append(rawData, out)
	}

	partRawData := rawData
	if len(partRawData) > 10 {
		partRawData = partRawData[:10]
	}
	maxColLen := 0
	for _, row := range partRawData {
		if len(row) > maxColLen {
			maxColLen = len(row)
		}
	}
	headerIndex := -1
	for i, row := range partRawData {
		nonNull := 0
		for _, cell := range row {
			if cell != nil {
				nonNull++
			}
		}
		if nonNull >= maxColLen {
			headerIndex = i
			break
		}
	}
	if headerIndex < 0 || headerIndex >= len(rawData) {
		return nil, nil, errors.New("无法识别表头")
	}

	header := rawData[headerIndex]
	data := rawData[headerIndex+1:]
	return header, data, nil
}

func isDateCell(f *excelize.File, sheet string, colIdx, rowIdx int, rawRows [][]string) bool {
	ref, err := excelize.CoordinatesToCellName(colIdx+1, rowIdx+1)
	if err != nil {
		return false
	}
	ct, err := f.GetCellType(sheet, ref)
	if err != nil {
		return false
	}
	return ct == excelize.CellTypeDate
}

func formatDateCell(rawRows [][]string, colIdx, rowIdx int) string {
	if rowIdx >= len(rawRows) || colIdx >= len(rawRows[rowIdx]) {
		return ""
	}
	serial, err := strconv.ParseFloat(rawRows[rowIdx][colIdx], 64)
	if err != nil {
		return rawRows[rowIdx][colIdx]
	}
	t, err := excelize.ExcelDateToTime(serial, false)
	if err != nil {
		return rawRows[rowIdx][colIdx]
	}
	return t.Format("2006-01-02")
}

// ---------- cell type inference ----------

var (
	emailRe = regexp.MustCompile(`^[\w.+-]+@[\w-]+\.[\w.]+$`)
	dateRe  = regexp.MustCompile(`^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})$`)
	timeRe  = regexp.MustCompile(`^\d{1,2}:\d{2}(:\d{2})?$`)

	// matchKeyRe matches the throwaway header cells a sheet may carry ("列1",
	// "字段2", "Column3"): they never identify a field, so they must not count
	// as a match while scoring a target form.
	matchKeyRe = regexp.MustCompile(`^(?:列|字段|column|col|field)\d*$`)
	// trailingParenRe / indexSuffixRe strip the "(2)" or "-2" a spreadsheet app
	// appends to a repeated column name.
	trailingParenRe = regexp.MustCompile(`\([^()]*\)$`)
	indexSuffixRe   = regexp.MustCompile(`[\s_\-]+\d+$`)
	headerSpaceRe   = regexp.MustCompile(`\s+`)

	// enumNameRe is the only reliable signal that a column *enumerates a closed
	// set* rather than carrying data. Value shape alone cannot tell the two
	// apart: a 2-row "性别" and a 163-name "中文姓名" column differ in content,
	// not in shape, and a single-record sheet makes every column look like one
	// repeated value — which used to turn names, emails and ID numbers into
	// select options.
	enumNameRe = regexp.MustCompile(`(?i)是否|有无|有没有|能否|可否|状态|类型|类别|级别|等级|性别|婚姻|目的|方式|渠道|来源|情况|分类|性质|选项`)
	// dataValueRe are values that are plainly not options, whatever the column
	// name says: emails, URLs, phone/ID digit runs, dates and upload paths.
	dataValueRe = regexp.MustCompile(`^[\w.+-]+@[\w-]+\.[\w.]+$|^/|^\d{11,}$|^\d{4}[-/]\d{1,2}[-/]\d{1,2}`)
	// maxEnumOptions / maxEnumValueLen bound what a closed option set looks
	// like; enumRepetition rejects one-value-per-row columns (a unique id).
	// It stays low because the column name already carries the discrimination:
	// a high ratio would drop every option on small imports, where a real
	// 12-row "性别" column only repeats 6 times.
	maxEnumOptions  = 20
	maxEnumValueLen = 16
	enumRepetition  = 2.0
)

// analyzeCellType mirrors xlsx.ts analyzeCellType: infers the form field type
// (and select options) from one column of values.
//
// name is the column header; it is the only signal that separates an enum
// column from a data column, so a column whose name does not read as an
// enumeration never produces options.
func analyzeCellType(name string, cells []any) (string, []any) {
	if len(cells) == 0 {
		return "text", []any{}
	}
	noEmpty := []string{}
	for _, c := range cells {
		if c != nil {
			noEmpty = append(noEmpty, asStr(c))
		}
	}
	if len(noEmpty) == 0 {
		return "text", []any{}
	}

	// ordered unique set (Set insertion order parity)
	setVals := []string{}
	seen := map[string]bool{}
	for _, v := range noEmpty {
		if !seen[v] {
			seen[v] = true
			setVals = append(setVals, v)
		}
	}

	// A column that enumerates a closed set of short values. A single unique
	// value is deliberately NOT enough: one repeated value is what a
	// single-record sheet looks like, not what an option set looks like.
	if enumNameRe.MatchString(strings.TrimSpace(name)) && len(setVals) >= 2 && len(setVals) <= maxEnumOptions {
		allShort := true
		for _, v := range setVals {
			if jsUtf16Len(v) > maxEnumValueLen || dataValueRe.MatchString(v) {
				allShort = false
				break
			}
		}
		if allShort && float64(len(noEmpty))/float64(len(setVals)) >= enumRepetition {
			return "select", toAnySlice(setVals)
		}
	}

	// Email detection
	allMatch := func(re *regexp.Regexp, trim bool) bool {
		for _, v := range noEmpty {
			s := v
			if trim {
				s = strings.TrimSpace(s)
			}
			if !re.MatchString(s) {
				return false
			}
		}
		return true
	}
	if allMatch(emailRe, false) {
		return "email", []any{}
	}

	// Number detection (JS Number(x) semantics approximated by ParseFloat)
	allNumber := true
	for _, v := range noEmpty {
		t := strings.TrimSpace(v)
		if t == "" {
			allNumber = false
			break
		}
		if _, err := strconv.ParseFloat(t, 64); err != nil {
			allNumber = false
			break
		}
	}
	if allNumber {
		return "number", []any{}
	}

	// Date detection
	if allMatch(dateRe, true) {
		return "date", []any{}
	}
	// Time detection (HH:mm, HH:mm:ss)
	if allMatch(timeRe, true) {
		return "time", []any{}
	}

	// Long text -> textarea
	total := 0
	for _, v := range noEmpty {
		total += jsUtf16Len(v)
	}
	if float64(total)/float64(len(noEmpty)) > 50 {
		return "textarea", []any{}
	}

	// Mixed or unrecognized types -> fallback to text
	return "text", []any{}
}

func toAnySlice(vals []string) []any {
	out := make([]any, 0, len(vals))
	for _, v := range vals {
		out = append(out, v)
	}
	return out
}

// ---------- header → existing form matching ----------

// normalizeHeader is the comparison key for a column name or a field name:
// lowercased, whitespace removed, full-width punctuation folded to ASCII.
func normalizeHeader(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return headerSpaceRe.ReplaceAllString(s, "")
}

// matchHeaderKey folds the export noise ("姓名-1", "姓名(2)", "姓 名") down to
// the name a field actually carries, and drops throwaway placeholders.
func matchHeaderKey(s string) string {
	s = strings.NewReplacer(
		"（", "(", "）", ")", "：", ":", "，", ",", "．", ".", "－", "-", "　", "",
	).Replace(normalizeHeader(s))
	s = trailingParenRe.ReplaceAllString(s, "")
	if matchKeyRe.MatchString(s) {
		return ""
	}
	return indexSuffixRe.ReplaceAllString(s, "")
}

// fieldKeysByColumn indexes a candidate form's field ids by matchHeaderKey.
func fieldKeysByColumn(fields []Row) map[string]string {
	byKey := map[string]string{}
	for _, field := range fields {
		key := matchHeaderKey(asStr(field["field_name"]))
		if key == "" {
			continue
		}
		if _, ok := byKey[key]; !ok {
			byKey[key] = asStr(field["id"])
		}
	}
	return byKey
}

// matchColumns assigns each sheet column the id of the field it names, without
// handing the same field to two columns. "" means the column has no
// counterpart on this form and is therefore not imported.
func matchColumns(columns []string, byKey map[string]string) []string {
	ids := make([]string, len(columns))
	used := map[string]bool{}
	for i, key := range columns {
		if key == "" {
			continue
		}
		id, ok := byKey[key]
		if !ok || used[id] {
			continue
		}
		used[id] = true
		ids[i] = id
	}
	return ids
}

// matchTargetForm returns the existing form the sheet's header best fits, how
// many of that form's fields it covers, and the field id per sheet column.
//
// A form competes on coverage of its own fields rather than on how many header
// columns it absorbs, so that a form sharing a prefix of its columns with a
// wider one cannot win: a sheet with 姓名/电话/备注 matches the 3-field form that
// covers 3/3, not a form whose 备注 is a field of its own and whose other two
// columns happen to differ. Requiring at least half the form's fields also
// keeps a 2-field sheet from claiming a 10-field form it barely overlaps.
func matchTargetForm(header []any) (string, int, []string) {
	columns := make([]string, len(header))
	hasKey := false
	for i, cell := range header {
		columns[i] = matchHeaderKey(asStr(cell))
		if columns[i] != "" {
			hasKey = true
		}
	}
	if !hasKey {
		return "", 0, nil
	}

	best, bestCovered, bestFields := "", 0, 0
	for _, formName := range getFormList() {
		fields := getFieldList(formName)
		if len(fields) == 0 {
			continue
		}
		byKey := fieldKeysByColumn(fields)
		covered := 0
		for _, id := range matchColumns(columns, byKey) {
			if id != "" {
				covered++
			}
		}
		if covered*2 < len(fields) { // covers less than half of this form
			continue
		}
		// Ties go to the bigger form (more fields covered), then to name order.
		if covered > bestCovered || (covered == bestCovered && len(fields) > bestFields) {
			best, bestCovered, bestFields = formName, covered, len(fields)
		}
	}
	if best == "" {
		return "", 0, nil
	}
	byKey := fieldKeysByColumn(getFieldList(best))
	return best, bestCovered, matchColumns(columns, byKey)
}

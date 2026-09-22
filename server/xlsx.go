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
)

// analyzeCellType mirrors xlsx.ts analyzeCellType: infers the form field type
// (and select options) from one column of values.
func analyzeCellType(cells []any) (string, []any) {
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

	// Single unique value -> checkbox
	if len(setVals) == 1 {
		return "checkbox", toAnySlice(setVals)
	}

	// Low cardinality short values -> select
	allShort := true
	for _, v := range noEmpty {
		if jsUtf16Len(v) >= 8 {
			allShort = false
			break
		}
	}
	if allShort && float64(len(noEmpty))/float64(len(setVals)) > 10 {
		return "select", toAnySlice(setVals)
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

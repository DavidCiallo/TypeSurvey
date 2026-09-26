package main

import (
	"sort"
	"strings"

	"github.com/mozillazg/go-pinyin"
)

// Record module — submitted form data, grouped per item — mirrors
// server/modules/record/*.
//
// Two kinds of lookup live here and they must not be confused:
//   - authenticated admin paths, scoped by (team_id, form_name);
//   - the anonymous fill flow, where the item_id / field_id from the share link
//     IS the capability and there is no team to scope by. Those use the *Any
//     helpers, which deliberately skip the tenant filter.

// getRecords returns the item's rows newest-append-first (repository find()).
func getRecords(teamID, itemID string) []Row {
	return selectRows("records", Row{"team_id": teamID, "item_id": itemID},
		selectOpts{skipDeleted: true, reverse: true})
}

// getRecordsAny is the anonymous fill-flow lookup: the item_id is the capability
// (paired with the access code) and the respondent has no team.
func getRecordsAny(itemID string) []Row {
	return selectRows("records", Row{"item_id": itemID},
		selectOpts{skipDeleted: true, reverse: true, allTenants: true})
}

// submitRecord upserts one answer. The owning team is resolved from the field,
// because this runs on the anonymous path: stamping team_id here is what keeps
// a public write inside the right tenant.
func submitRecord(record Row) bool {
	fieldID := asStr(record["field_id"])
	teamID, formName := resolveFormByField(fieldID)
	if formName == "" {
		return false
	}
	itemID := asStr(record["item_id"])

	// Every answer filed under one item must belong to one form. Without this a
	// caller who knows two field_ids could staple one form's field onto another
	// item and merge two responses into a single row — which the admin reads as
	// a corrupted record rather than as something anyone did on purpose.
	if existing := getRecordsAny(itemID); len(existing) > 0 {
		eTeam, eForm := resolveFormByField(asStr(existing[0]["field_id"]))
		if eTeam != teamID || eForm != formName {
			return false
		}
	}

	record["team_id"] = teamID
	if exist := selectOne("records", Row{"team_id": teamID, "item_id": itemID, "field_id": fieldID}); exist != nil {
		return updateRowsIn("records", teamID, Row{"id": exist["id"]}, Row{"field_value": record["field_value"]})
	}
	insertRow("records", record)
	return true
}

func insertRecords(teamID string, records []Row) bool {
	for _, r := range records {
		r["team_id"] = teamID
	}
	batchInsertRows("records", records)
	return true
}

func deleteRecordByItem(teamID, itemID string) {
	hardDeleteRowsIn("records", teamID, Row{"item_id": itemID}, nil)
}

// ---------- pinyin search helpers (pinyin-pro parity) ----------

var (
	pyNormalArgs = pinyin.NewArgs()
	pyFirstArgs  = func() pinyin.Args {
		a := pinyin.NewArgs()
		a.Style = pinyin.FirstLetter
		return a
	}()
)

func pinyinFull(s string) string {
	var b strings.Builder
	for _, parts := range pinyin.Pinyin(s, pyNormalArgs) {
		for _, p := range parts {
			b.WriteString(p)
		}
	}
	return b.String()
}

func pinyinInitials(s string) string {
	var b strings.Builder
	for _, parts := range pinyin.Pinyin(s, pyFirstArgs) {
		for _, p := range parts {
			b.WriteString(p)
		}
	}
	return b.String()
}

// recordMatchesSearch mirrors the TS matcher: case-insensitive substring on
// the raw value, its full pinyin, or its pinyin initials.
func recordMatchesSearch(value any, query string) bool {
	text := jsString(value)
	if strings.Contains(strings.ToLower(text), query) {
		return true
	}
	if strings.Contains(strings.ToLower(pinyinFull(text)), query) {
		return true
	}
	return strings.Contains(strings.ToLower(pinyinInitials(text)), query)
}

// ---------- grouped listing ----------

// getAllRecord groups a team's records by item_id (newest submit first), with
// case-insensitive + pinyin search and pagination — semantics copied from
// record.service getAllRecord.
func getAllRecord(teamID, formName string, page, pageSize int, search string) Row {
	fieldIDs := map[string]bool{}
	selectEach("fields", Row{"team_id": teamID, "form_name": formName}, func(field Row) {
		fieldIDs[asStr(field["id"])] = true
	})
	if len(fieldIDs) == 0 {
		return Row{"records": []Row{}, "total": 0}
	}

	groupOrder := []string{}
	groups := map[string][]Row{}
	selectEach("records", Row{"team_id": teamID}, func(record Row) {
		if !fieldIDs[asStr(record["field_id"])] {
			return
		}
		itemID := asStr(record["item_id"])
		if _, ok := groups[itemID]; !ok {
			groupOrder = append(groupOrder, itemID)
		}
		groups[itemID] = append(groups[itemID], record)
	})

	rowTime := func(r Row) int64 {
		t := r["update_time"]
		if !jsTruthy(t) {
			t = r["create_time"]
		}
		if !jsTruthy(t) {
			return 0
		}
		return asInt64(t)
	}

	sorted := make([]Row, 0, len(groupOrder))
	for _, itemID := range groupOrder {
		data := groups[itemID]
		sort.SliceStable(data, func(i, j int) bool { return rowTime(data[i]) > rowTime(data[j]) })
		sorted = append(sorted, Row{"item_id": itemID, "data": data})
	}
	sort.SliceStable(sorted, func(i, j int) bool {
		di, _ := sorted[i]["data"].([]Row)
		dj, _ := sorted[j]["data"].([]Row)
		return rowTime(di[0]) > rowTime(dj[0])
	})

	filtered := sorted
	if search != "" {
		query := strings.ToLower(strings.TrimSpace(search))
		filtered = []Row{}
		for _, group := range sorted {
			data, _ := group["data"].([]Row)
			for _, r := range data {
				if recordMatchesSearch(r["field_value"], query) {
					filtered = append(filtered, group)
					break
				}
			}
		}
	}

	total := len(filtered)
	out := []Row{}
	// JS slice with NaN bounds yields [] — replicate via NaN-safe bounds
	if page > 0 {
		start, end := (page-1)*pageSize, page*pageSize
		if start < 0 {
			start = 0
		}
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}
		for _, group := range filtered[start:end] {
			data, _ := group["data"].([]Row)
			out = append(out, Row{
				"item_id": group["item_id"],
				"code":    codeGenerate(asStr(group["item_id"])),
				"data":    data,
			})
		}
	}
	return Row{"records": out, "total": total}
}

// ---------- handlers ----------

func recordHistory(c *Ctx) (any, error) {
	id := c.Str("id")
	code := c.Str("code")
	storedItemID := c.Str("item_id")

	// 1. id 是 item_id（已存在的记录）→ 直接返回该记录数据
	records := getRecordsAny(id)
	if len(records) > 0 {
		fieldID := asStr(records[0]["field_id"])
		teamID, formName := resolveFormByField(fieldID)
		if formName == "" {
			return nil, throwErr("表单不存在")
		}
		// A four-digit code is only enough because guessing is throttled per id:
		// the code always travels together with the item_id, so the id is the
		// thing worth locking after repeated mistakes.
		if !recordCodeLimiter.allow(id) {
			return nil, throwErr("尝试次数过多，请稍后再试")
		}
		if code == "" || code != codeGenerate(id) {
			recordCodeLimiter.fail(id)
			return nil, throwErr("鉴权失败")
		}
		recordCodeLimiter.reset(id)
		return Row{"form_name": formName, "item_id": records[0]["item_id"], "code": code,
			"fields": getFieldList(teamID, formName), "records": records}, nil
	}

	// 到这里 id 一定是 field_id。算出 URL 对应的 form 与所属团队。
	teamID, urlFormName := resolveFormByField(id)
	if urlFormName == "" {
		return nil, throwErr("表单不存在")
	}

	// 2. stored_item_id 可用且属于同一个 form → 恢复该 item 的草稿
	if jsTruthy(c.Value("item_id")) {
		// Same throttle as above: this branch is the other way to ask "is this
		// item_id + code pair correct?".
		if !recordCodeLimiter.allow(storedItemID) {
			return nil, throwErr("尝试次数过多，请稍后再试")
		}
		if code == codeGenerate(storedItemID) {
			recordCodeLimiter.reset(storedItemID)
			draft := getRecordsAny(storedItemID)
			sameForm := len(draft) > 0 && asStr(draft[0]["field_id"]) != "" &&
				fieldBelongsToForm(asStr(draft[0]["field_id"]), teamID, urlFormName)
			if sameForm {
				return Row{"form_name": urlFormName, "item_id": storedItemID, "code": code,
					"fields": getFieldList(teamID, urlFormName), "records": draft}, nil
			}
		} else {
			recordCodeLimiter.fail(storedItemID)
		}
	}

	// 3. 否则：新记录
	itemID := nanoID(6)
	return Row{"form_name": urlFormName, "item_id": itemID, "code": codeGenerate(itemID),
		"fields": getFieldList(teamID, urlFormName), "records": []Row{}}, nil
}

// fieldBelongsToForm reports whether a field is part of the given form. Replaces
// the old getFormNameByField(...) == name comparison, which could not tell two
// teams' identically-named forms apart.
func fieldBelongsToForm(fieldID, teamID, formName string) bool {
	ft, fn := resolveFormByField(fieldID)
	return ft == teamID && fn == formName
}

func recordSubmit(c *Ctx) (any, error) {
	value := c.Value("field_value")
	text := "undefined"
	if _, ok := c.Body["field_value"]; ok {
		text = jsString(value)
	}
	if jsUtf16Len(text) > 0x3e8 {
		return nil, throwErr("内容过长")
	}
	if !submitRecord(Row{
		"item_id": c.Str("item_id"), "field_id": c.Str("field_id"), "field_value": value,
	}) {
		// Either the field is gone or the item belongs to another form. Both used
		// to be swallowed, which meant an answer could be dropped while the
		// respondent was told it was saved.
		return nil, throwErr("提交失败")
	}
	return Row{}, nil
}

func recordAll(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("page")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	pageNum, ok := jsNumber(c.Value("page"))
	if !ok || pageNum < 1 {
		return nil, throwErr("参数错误")
	}
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	search := ""
	if c.Truthy("search") {
		search = c.Str("search")
	}
	return getAllRecord(teamID, formName, int(pageNum), 10, search), nil
}

func recordDel(c *Ctx) (any, error) {
	itemID := c.Str("item_id")
	if !jsTruthy(c.Value("item_id")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	deleteRecordByItem(teamID, itemID)
	return Row{}, nil
}

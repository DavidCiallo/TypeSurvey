package main

import "sort"

// Form module — forms are implicit groups of fields keyed by (team_id,
// form_name). Mirrors server/modules/form/*.
//
// Every function is pinned to one team. The handler resolves the caller's team
// (resolveTeamID) and threads it down, so a form name is only meaningful inside
// its team — two teams may each have a form called "客户问卷".

func getFormList(teamID string) []string {
	seen := map[string]bool{}
	out := []string{}
	selectEach("fields", Row{"team_id": teamID}, func(field Row) {
		name := asStr(field["form_name"])
		if !seen[name] {
			seen[name] = true
			out = append(out, name)
		}
	})
	return out
}

func getFormBriefList(teamID string) []Row {
	formList := getFormList(teamID)
	fieldToForm := map[string]string{}
	selectEach("fields", Row{"team_id": teamID}, func(field Row) {
		fieldToForm[asStr(field["id"])] = asStr(field["form_name"])
	})

	itemIDsByForm := map[string]map[string]bool{}
	lastSubmitByForm := map[string]int64{}
	for _, name := range formList {
		itemIDsByForm[name] = map[string]bool{}
		lastSubmitByForm[name] = 0
	}

	selectEach("records", Row{"team_id": teamID}, func(record Row) {
		formName, ok := fieldToForm[asStr(record["field_id"])]
		if !ok || formName == "" {
			return
		}
		itemIDsByForm[formName][asStr(record["item_id"])] = true
		t := record["update_time"]
		if !jsTruthy(t) {
			t = record["create_time"]
		}
		var ms int64
		if jsTruthy(t) {
			ms = asInt64(t)
		}
		if ms > lastSubmitByForm[formName] {
			lastSubmitByForm[formName] = ms
		}
	})

	out := []Row{}
	for _, name := range formList {
		out = append(out, Row{
			"form_name":   name,
			"records_num": len(itemIDsByForm[name]),
			"last_submit": lastSubmitByForm[name],
		})
	}
	return out
}

// resolveFormByField maps a public field_id (the ?t= value in a share link) to
// its team and form name. This lookup is intentionally unscoped: the field_id IS
// the capability, and the anonymous fill flow has no team to scope by.
func resolveFormByField(fieldID string) (teamID, formName string) {
	field := selectOneAny("fields", Row{"id": fieldID})
	if field == nil {
		return "", ""
	}
	return asStr(field["team_id"]), asStr(field["form_name"])
}

// getFieldList returns a team's fields for one form (position-sorted) with their
// radios attached.
func getFieldList(teamID, formName string) []Row {
	fieldsData := selectRows("fields", Row{"team_id": teamID, "form_name": formName}, selectOpts{skipDeleted: true})
	sort.SliceStable(fieldsData, func(i, j int) bool {
		return asInt64(fieldsData[i]["position"]) < asInt64(fieldsData[j]["position"])
	})

	radiosByField := map[string][]Row{}
	for _, f := range fieldsData {
		radiosByField[asStr(f["id"])] = []Row{}
	}
	selectEach("radios", Row{"team_id": teamID}, func(radio Row) {
		if arr, ok := radiosByField[asStr(radio["field_id"])]; ok {
			radiosByField[asStr(radio["field_id"])] = append(arr, radio)
		}
	})

	out := make([]Row, 0, len(fieldsData))
	for _, field := range fieldsData {
		item := Row{}
		for k, v := range field {
			item[k] = v
		}
		item["radios"] = radiosByField[asStr(field["id"])]
		out = append(out, item)
	}
	return out
}

// createField returns ("", false) when the (team, form_name, field_name) triple
// already exists.
func createField(teamID string, field Row) (string, bool) {
	where := Row{"team_id": teamID, "form_name": field["form_name"], "field_name": field["field_name"]}
	if selectOne("fields", where) != nil {
		return "", false
	}
	lastField := selectOneReverse("fields", Row{"team_id": teamID})
	position := asInt64(lastField["position"]) + 1
	entity := Row{}
	for k, v := range field {
		entity[k] = v
	}
	entity["team_id"] = teamID
	entity["position"] = position
	entity["comment"] = ""
	entity["placeholder"] = ""
	row := insertRow("fields", entity)
	return asStr(row["id"]), true
}

// updateSingleField returns false when the field is not in the caller's team,
// which is what stops a field_id belonging to another team from being edited.
func updateSingleField(teamID, id, key string, value any) bool {
	if selectOne("fields", Row{"team_id": teamID, "id": id}) == nil {
		return false
	}
	return updateRowsIn("fields", teamID, Row{"id": id}, Row{key: value})
}

func updateFormName(teamID, formName, newName string) bool {
	if selectOne("fields", Row{"team_id": teamID, "form_name": formName}) == nil {
		return false
	}
	// The team_id in this where clause is what stops the rename from touching
	// every other team's form that happens to share the name.
	return updateRowsIn("fields", teamID, Row{"form_name": formName}, Row{"form_name": newName})
}

// deleteForm removes the form's fields plus its records and radios. The team
// scope here is load-bearing: without it this would delete other teams' data.
func deleteForm(teamID, formName string) {
	fieldIDs := []string{}
	selectEach("fields", Row{"team_id": teamID, "form_name": formName}, func(field Row) {
		fieldIDs = append(fieldIDs, asStr(field["id"]))
	})
	if len(fieldIDs) > 0 {
		hardDeleteRowsIn("records", teamID, Row{}, map[string][]string{"field_id": fieldIDs})
		hardDeleteRowsIn("radios", teamID, Row{}, map[string][]string{"field_id": fieldIDs})
	}
	hardDeleteRowsIn("fields", teamID, Row{"form_name": formName}, nil)
}

// ---------- handlers ----------

func formList(c *Ctx) (any, error) {
	if !jsTruthy(c.Value("page")) || !jsTruthy(c.Value("auth")) {
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
	list := getFormBriefList(teamID)
	return Row{"list": list, "total": len(list)}, nil
}

func formCreate(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("auth")) {
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
	for _, name := range getFormList(teamID) {
		if name == formName {
			return nil, throwErr("表单已存在")
		}
	}
	id, ok := createField(teamID, Row{
		"form_name": formName, "field_name": "new", "field_type": "text",
		"required": false, "disabled": false,
	})
	if !ok || id == "" {
		return nil, throwErr("表单已存在")
	}
	return Row{}, nil
}

func formUpdate(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	newName := c.Str("new_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("new_name")) {
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
	if !updateFormName(teamID, formName, newName) {
		return nil, throwErr("修改表单失败")
	}
	return Row{}, nil
}

func formDel(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("auth")) {
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
	deleteForm(teamID, formName)
	return Row{}, nil
}

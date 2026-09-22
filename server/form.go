package main

import "sort"

// Form module — forms are implicit groups of fields (form_name).
// Mirrors server/modules/form/*.

func getFormList() []string {
	seen := map[string]bool{}
	out := []string{}
	selectEach("fields", Row{}, func(field Row) {
		name := asStr(field["form_name"])
		if !seen[name] {
			seen[name] = true
			out = append(out, name)
		}
	})
	return out
}

func getFormBriefList() []Row {
	formList := getFormList()
	fieldToForm := map[string]string{}
	selectEach("fields", Row{}, func(field Row) {
		fieldToForm[asStr(field["id"])] = asStr(field["form_name"])
	})

	itemIDsByForm := map[string]map[string]bool{}
	lastSubmitByForm := map[string]int64{}
	for _, name := range formList {
		itemIDsByForm[name] = map[string]bool{}
		lastSubmitByForm[name] = 0
	}

	selectEach("records", Row{}, func(record Row) {
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
			"form_name":    name,
			"records_num":  len(itemIDsByForm[name]),
			"last_submit":  lastSubmitByForm[name],
		})
	}
	return out
}

func getFormNameByField(fieldID string) string {
	field := selectOne("fields", Row{"id": fieldID})
	if field != nil {
		return asStr(field["form_name"])
	}
	return ""
}

// getFieldList returns fields (position-sorted) with their radios attached.
func getFieldList(formName string) []Row {
	fieldsData := selectRows("fields", Row{"form_name": formName}, selectOpts{skipDeleted: true})
	sort.SliceStable(fieldsData, func(i, j int) bool {
		return asInt64(fieldsData[i]["position"]) < asInt64(fieldsData[j]["position"])
	})

	radiosByField := map[string][]Row{}
	for _, f := range fieldsData {
		radiosByField[asStr(f["id"])] = []Row{}
	}
	selectEach("radios", Row{}, func(radio Row) {
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

// createField returns ("", false) when the (form_name, field_name) pair exists.
func createField(field Row) (string, bool) {
	where := Row{"form_name": field["form_name"], "field_name": field["field_name"]}
	if selectOne("fields", where) != nil {
		return "", false
	}
	lastField := selectOneReverse("fields", Row{})
	position := asInt64(lastField["position"]) + 1
	entity := Row{}
	for k, v := range field {
		entity[k] = v
	}
	entity["position"] = position
	entity["comment"] = ""
	entity["placeholder"] = ""
	row := insertRow("fields", entity)
	return asStr(row["id"]), true
}

func updateSingleField(id, key string, value any) bool {
	if selectOne("fields", Row{"id": id}) == nil {
		return false
	}
	return updateRows("fields", Row{"id": id}, Row{key: value})
}

func updateFormName(formName, newName string) bool {
	if selectOne("fields", Row{"form_name": formName}) == nil {
		return false
	}
	return updateRows("fields", Row{"form_name": formName}, Row{"form_name": newName})
}

// deleteForm removes the form's fields and (unlike the TS version, which
// silently no-ops on its unsupported $in matcher) its records and radios.
func deleteForm(formName string) {
	fieldIDs := []string{}
	selectEach("fields", Row{"form_name": formName}, func(field Row) {
		fieldIDs = append(fieldIDs, asStr(field["id"]))
	})
	if len(fieldIDs) > 0 {
		hardDeleteRows("records", Row{}, map[string][]string{"field_id": fieldIDs})
		hardDeleteRows("radios", Row{}, map[string][]string{"field_id": fieldIDs})
	}
	hardDeleteRows("fields", Row{"form_name": formName}, nil)
}

// ---------- handlers ----------

func formList(c *Ctx) (any, error) {
	if !jsTruthy(c.Value("page")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	list := getFormBriefList()
	return Row{"list": list, "total": len(list)}, nil
}

func formCreate(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	for _, name := range getFormList() {
		if name == formName {
			return nil, throwErr("表单已存在")
		}
	}
	id, ok := createField(Row{
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
	if !updateFormName(formName, newName) {
		return nil, throwErr("修改表单失败")
	}
	return Row{}, nil
}

func formDel(c *Ctx) (any, error) {
	formName := c.Str("form_name")
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	deleteForm(formName)
	return Row{}, nil
}

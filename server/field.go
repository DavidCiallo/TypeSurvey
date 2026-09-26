package main

// Field module — mirrors server/modules/field/field.controller.ts
// (including the no-op `del` handler).
//
// Every handler resolves the caller's team first, so a field_id from another
// team can neither be read nor written.

func fieldList(c *Ctx) (any, error) {
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
	list := getFieldList(teamID, formName)
	page, _ := jsNumber(c.Value("page")) // JS slicing coerces; NaN → empty slice
	start, end := int((page-1)*10), int(page*10)
	out := []Row{}
	if start >= 0 && start < len(list) {
		if end > len(list) {
			end = len(list)
		}
		out = list[start:end]
	}
	return Row{"list": out, "total": len(list)}, nil
}

func fieldCreate(c *Ctx) (any, error) {
	if !jsTruthy(c.Value("form_name")) || !jsTruthy(c.Value("field_name")) ||
		!jsTruthy(c.Value("field_type")) || !jsTruthy(c.Value("auth")) {
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
	id, ok := createField(teamID, Row{
		"form_name": c.Str("form_name"), "field_name": c.Str("field_name"),
		"field_type": c.Str("field_type"), "disabled": false, "required": false,
	})
	if !ok || id == "" {
		return nil, throwErr("创建字段失败，可能存在同名项")
	}
	return Row{}, nil
}

func fieldUpdate(c *Ctx) (any, error) {
	fieldID := c.Str("field_id")
	if !jsTruthy(c.Value("field_id")) || !jsTruthy(c.Value("auth")) {
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
	if c.Truthy("field_name") {
		if !updateSingleField(teamID, fieldID, "field_name", c.Str("field_name")) {
			return nil, throwErr("更新失败")
		}
	}
	if c.Truthy("field_type") {
		if !updateSingleField(teamID, fieldID, "field_type", c.Str("field_type")) {
			return nil, throwErr("更新失败")
		}
	}
	if c.Truthy("position") {
		if n, ok := c.Int("position"); ok {
			if !updateSingleField(teamID, fieldID, "position", n) {
				return nil, throwErr("更新失败")
			}
		}
	}
	if b, ok := c.IsBool("required"); ok {
		if !updateSingleField(teamID, fieldID, "required", b) {
			return nil, throwErr("更新失败")
		}
	}
	if b, ok := c.IsBool("disabled"); ok {
		if !updateSingleField(teamID, fieldID, "disabled", b) {
			return nil, throwErr("更新失败")
		}
	}
	if _, ok := c.IsString("comment"); ok {
		if !updateSingleField(teamID, fieldID, "comment", c.Str("comment")) {
			return nil, throwErr("更新失败")
		}
	}
	if _, ok := c.IsString("placeholder"); ok {
		if !updateSingleField(teamID, fieldID, "placeholder", c.Str("placeholder")) {
			return nil, throwErr("更新失败")
		}
	}
	return Row{}, nil
}

// fieldDel mirrors the TS handler: auth check only, no deletion happens.
func fieldDel(c *Ctx) (any, error) {
	if !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	return Row{}, nil
}

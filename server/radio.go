package main

// Radio module (select/checkbox options) — mirrors server/modules/radio/*.

// createRadio inserts with useful:true regardless of the request value —
// the TS service does the same.
func createRadio(fieldID, radioName string) (string, bool) {
	if selectOne("radios", Row{"field_id": fieldID, "radio_name": radioName}) != nil {
		return "", false
	}
	row := insertRow("radios", Row{"radio_name": radioName, "field_id": fieldID, "useful": true})
	return asStr(row["id"]), true
}

func updateRadio(id, key string, value any) bool {
	if selectOne("radios", Row{"id": id}) == nil {
		return false
	}
	return updateRows("radios", Row{"id": id}, Row{key: value})
}

func radioCreate(c *Ctx) (any, error) {
	fieldID := c.Str("field_id")
	radioName := c.Str("radio_name")
	if !jsTruthy(c.Value("field_id")) || !jsTruthy(c.Value("radio_name")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	id, ok := createRadio(fieldID, radioName)
	if !ok || id == "" {
		return nil, throwErr("创建选项失败，可能存在同名项")
	}
	return Row{}, nil
}

func radioUpdate(c *Ctx) (any, error) {
	radioID := c.Str("radio_id")
	if !jsTruthy(c.Value("radio_id")) || !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	if c.Truthy("radio_name") {
		if !updateRadio(radioID, "radio_name", c.Str("radio_name")) {
			return nil, throwErr("更新失败")
		}
	}
	if b, ok := c.IsBool("useful"); ok {
		if !updateRadio(radioID, "useful", b) {
			return nil, throwErr("更新失败")
		}
	}
	return Row{}, nil
}

// radioDel mirrors the TS handler: auth check only, no deletion happens.
func radioDel(c *Ctx) (any, error) {
	if !jsTruthy(c.Value("auth")) {
		return nil, throwErr("参数错误")
	}
	if getIdentifyByVerify(c.Auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	return Row{}, nil
}

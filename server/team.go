package main

import "strings"

// Team module — multi-tenancy. A team (not an account) owns forms, so forms
// survive staff turnover: a new colleague sees the team's forms the moment
// they join, and someone leaving stops seeing them without orphaning data.
//
// There is no upstream equivalent; this is the multi-tenant layer described in
// docs/multi-tenant-design.md.

// inviteTTLMillis is how long an invite link stays usable.
const inviteTTLMillis = 7 * 24 * 60 * 60 * 1000

// scope is the caller's data visibility.
//
// It is a struct rather than a []string on purpose: "belongs to no team" (deny)
// and "system admin" (see everything) must not be representable by the same
// value. As a slice they would both be empty, and one mistake would fail open —
// the worst possible direction for an authorization check.
type scope struct {
	all   bool     // system admin: do not filter by team
	teams []string // teams the caller belongs to (admins keep their own too)
}

// scopeForAccount builds a scope from an account row. Used by the login response
// and by callerScope, so both agree on what an account can see.
func scopeForAccount(account Row) scope {
	if account == nil {
		return scope{}
	}
	ids := liveTeamIDs(asStr(account["id"]))
	if asInt64(account["is_admin"]) != 0 {
		// Admins are not filtered (they operate across teams) but still carry
		// their own memberships, so a request omitting team_id can resolve.
		return scope{all: true, teams: ids}
	}
	return scope{teams: ids}
}

// callerScope resolves the caller's visibility from their token.
//
// It returns an error when the caller belongs to no team, so a request is
// rejected before any query runs. Enforcing this only in the client would leave
// a team-less account able to call the API directly.
func callerScope(c *Ctx) (scope, error) {
	s, _, err := looseScope(c)
	if err != nil {
		return scope{}, err
	}
	if !s.all && len(s.teams) == 0 {
		return scope{}, throwErr("请先创建或加入一个团队")
	}
	return s, nil
}

// looseScope resolves the caller WITHOUT requiring a team, and also returns the
// account row. The team-module routes use it because onboarding (list / create /
// join) has to be reachable exactly when the caller has no team yet.
func looseScope(c *Ctx) (scope, Row, error) {
	email := getIdentifyByVerify(c.Auth)
	if email == "" {
		return scope{}, nil, throwErr("Unauthorized")
	}
	// The global api key resolves to a synthetic identity with no account row.
	// It is a deployment-level credential, so treat it as system scope.
	if email == apiKeyIdentity {
		return scope{all: true}, nil, nil
	}
	account := getAccountByEmail(email)
	if account == nil {
		return scope{}, nil, throwErr("Unauthorized")
	}
	return scopeForAccount(account), account, nil
}

// liveTeamIDs returns the teams an account belongs to, excluding soft-deleted
// ones. A soft-deleted team keeps its rows — it just disappears for its members;
// a system admin retains visibility and can restore it.
func liveTeamIDs(accountID string) []string {
	ids := []string{}
	if accountID == "" {
		return ids
	}
	seen := map[string]bool{}
	for _, m := range selectRows("team_members", Row{"account_id": accountID}, selectOpts{skipDeleted: true}) {
		tid := asStr(m["team_id"])
		if tid == "" || seen[tid] {
			continue
		}
		if getTeam(tid) == nil {
			continue // soft-deleted or missing
		}
		seen[tid] = true
		ids = append(ids, tid)
	}
	return ids
}

// getTeam returns a live (non-deleted) team row, or nil.
func getTeam(teamID string) Row {
	team := selectOneIgnoreDelete("teams", Row{"id": teamID})
	if team == nil || team["delete_time"] != nil {
		return nil
	}
	return team
}

// teamRows returns every team, or only the live ones.
func teamRows(includeDeleted bool) []Row {
	return selectRows("teams", Row{}, selectOpts{skipDeleted: !includeDeleted})
}

// visibleTeams lists the teams the caller can act in, as {id, name, deleted}.
//
// A system admin sees every team including soft-deleted ones — flagged, not
// hidden — because deleting a team keeps all of its data and this is the only
// way that data stays reachable afterwards.
func visibleTeams(s scope, accountID string) []Row {
	out := []Row{}
	if s.all {
		for _, team := range teamRows(true) {
			out = append(out, Row{
				"id": asStr(team["id"]), "name": asStr(team["name"]),
				"deleted": team["delete_time"] != nil,
			})
		}
		return out
	}
	for _, tid := range s.teams {
		team := getTeam(tid)
		if team == nil {
			continue
		}
		out = append(out, Row{"id": tid, "name": asStr(team["name"]), "deleted": false})
	}
	return out
}

// teamRole returns the account's role in a team, or "" when not a member.
// Only live memberships count, so a removed member immediately loses the role.
func teamRole(accountID, teamID string) string {
	if accountID == "" || teamID == "" {
		return ""
	}
	m := selectOne("team_members", Row{"team_id": teamID, "account_id": accountID})
	if m == nil {
		return ""
	}
	return asStr(m["role"])
}

// resolveTeamID picks the team a request applies to.
//
//	team_id given   -> must be a team the caller belongs to (admins may target any)
//	team_id omitted -> only unambiguous when the caller has exactly one team
//
// It returns an error rather than a fallback, so an ambiguous request can never
// be silently applied to the wrong team.
func resolveTeamID(c *Ctx, s scope) (string, error) {
	// c.Str() maps an *absent* key to the string "null" (jsString(nil)), not to
	// "", so the presence check has to come first. Reading it directly made every
	// request that omitted team_id fail instead of resolving implicitly.
	requested := ""
	if jsTruthy(c.Value("team_id")) {
		requested = c.Str("team_id")
	}
	if requested == "" {
		if len(s.teams) == 1 {
			return s.teams[0], nil
		}
		return "", throwErr("请指定团队")
	}
	if s.all {
		// Admins may target a soft-deleted team as well, so its data stays
		// reachable and the delete can be undone.
		if selectOneIgnoreDelete("teams", Row{"id": requested}) == nil {
			return "", throwErr("团队不存在")
		}
		return requested, nil
	}
	for _, tid := range s.teams {
		if tid == requested {
			return requested, nil
		}
	}
	return "", throwErr("无权访问该团队")
}

// requireTeamOwner verifies the caller owns the team (or is a system admin).
func requireTeamOwner(c *Ctx, s scope, teamID string) error {
	if s.all {
		return nil
	}
	_, account, err := looseScope(c)
	if err != nil {
		return err
	}
	if account == nil || teamRole(asStr(account["id"]), teamID) != "owner" {
		return throwErr("需要团队管理员权限")
	}
	return nil
}

// ---------- invites ----------

// revokeTeamInvites invalidates every outstanding invite for a team, so a
// deleted team cannot still be joined through a link that was already sent.
func revokeTeamInvites(teamID string) {
	hardDeleteRows("team_invites", Row{"team_id": teamID}, nil)
}

// liveInvites returns a team's unused, unexpired invites.
func liveInvites(teamID string) []Row {
	out := []Row{}
	for _, inv := range selectRows("team_invites", Row{"team_id": teamID}, selectOpts{skipDeleted: true}) {
		if asStr(inv["used_by"]) != "" {
			continue
		}
		if exp := asInt64(inv["expire_time"]); exp > 0 && nowMillis() > exp {
			continue
		}
		out = append(out, inv)
	}
	return out
}

// ---------- handlers ----------

func teamList(c *Ctx) (any, error) {
	s, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	// Deliberately reachable with no team: this is how the client learns it
	// needs to run onboarding.
	return Row{"list": visibleTeams(s, asStr(account["id"]))}, nil
}

func teamCreate(c *Ctx) (any, error) {
	name := c.Str("name")
	if !jsTruthy(c.Value("name")) {
		return nil, throwErr("参数错误")
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return nil, throwErr("系统身份无法创建团队")
	}
	accountID := asStr(account["id"])

	// A user may create at most one team. Only live teams count, so deleting one
	// frees the slot.
	if len(selectRows("teams", Row{"creator_id": accountID}, selectOpts{skipDeleted: true})) > 0 {
		return nil, throwErr("你已创建过一个团队")
	}

	teamID := nanoID(6)
	insertRow("teams", Row{"id": teamID, "name": name, "creator_id": accountID})
	insertRow("team_members", Row{"team_id": teamID, "account_id": accountID, "role": "owner"})
	return Row{"id": teamID, "name": name}, nil
}

func teamUpdate(c *Ctx) (any, error) {
	name := c.Str("name")
	if !jsTruthy(c.Value("name")) {
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
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	if !updateRows("teams", Row{"id": teamID}, Row{"name": name}) {
		return nil, throwErr("修改失败")
	}
	return Row{}, nil
}

// teamDel soft-deletes: the team disappears for its members but every field,
// record and radio stays, so a mistaken deletion is recoverable.
func teamDel(c *Ctx) (any, error) {
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	team := getTeam(teamID)
	if team == nil {
		return nil, throwErr("团队不存在")
	}
	team["delete_time"] = nowMillis()
	if err := persistRow("teams", team); err != nil {
		return nil, throwErr("删除失败")
	}
	revokeTeamInvites(teamID)
	return Row{}, nil
}

// teamRestore undoes a soft delete. Admin only: once a team is deleted it leaves
// its owner's list, so the owner has no route back to it.
func teamRestore(c *Ctx) (any, error) {
	teamID := c.Str("team_id")
	if !jsTruthy(c.Value("team_id")) {
		return nil, throwErr("参数错误")
	}
	if err := requireAdmin(c.Auth); err != nil {
		return nil, err
	}
	team := selectOneIgnoreDelete("teams", Row{"id": teamID})
	if team == nil {
		return nil, throwErr("团队不存在")
	}
	if team["delete_time"] == nil {
		return nil, throwErr("团队未被删除")
	}
	team["delete_time"] = nil
	if err := persistRow("teams", team); err != nil {
		return nil, throwErr("恢复失败")
	}
	return Row{}, nil
}

func teamMemberList(c *Ctx) (any, error) {
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	accountID := asStr(account["id"])
	// A non-admin must be a member of the team to see who else is in it.
	if !s.all && teamRole(accountID, teamID) == "" {
		return nil, throwErr("无权访问该团队")
	}

	out := []Row{}
	for _, m := range selectRows("team_members", Row{"team_id": teamID}, selectOpts{skipDeleted: true}) {
		mid := asStr(m["account_id"])
		name := ""
		email := ""
		if acc := selectOneIgnoreDelete("accounts", Row{"id": mid}); acc != nil {
			name = asStr(acc["name"])
			email = asStr(acc["email"])
		}
		out = append(out, Row{
			"account_id": mid, "name": name, "email": email,
			"role": asStr(m["role"]), "is_self": mid == accountID,
		})
	}
	return Row{"list": out}, nil
}

func teamMemberRemove(c *Ctx) (any, error) {
	targetID := c.Str("account_id")
	if !jsTruthy(c.Value("account_id")) {
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
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	if targetID == asStr(account["id"]) {
		return nil, throwErr("不能移除自己，请使用退出团队")
	}
	if !hardDeleteRows("team_members", Row{"team_id": teamID, "account_id": targetID}, nil) {
		return nil, throwErr("成员不存在")
	}
	return Row{}, nil
}

func teamLeave(c *Ctx) (any, error) {
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	accountID := asStr(account["id"])
	role := teamRole(accountID, teamID)
	if role == "" {
		return nil, throwErr("你不是该团队成员")
	}

	// The last owner cannot leave: the team would have nobody who can manage it.
	if role == "owner" {
		owners := 0
		for _, m := range selectRows("team_members", Row{"team_id": teamID}, selectOpts{skipDeleted: true}) {
			if asStr(m["role"]) == "owner" {
				owners++
			}
		}
		if owners <= 1 {
			return nil, throwErr("团队至少需要一名管理员")
		}
	}
	hardDeleteRows("team_members", Row{"team_id": teamID, "account_id": accountID}, nil)
	return Row{}, nil
}

// teamInviteCreate mints a single-use invite link. The code is a bearer
// credential granting access to the whole team's data, so it is a 24-character
// nanoID (~143 bits) — nothing like the 4-digit per-item code, which is only
// ever meaningful together with an item_id.
func teamInviteCreate(c *Ctx) (any, error) {
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}

	code := nanoID(24)
	expire := nowMillis() + inviteTTLMillis
	row := insertRow("team_invites", Row{
		"team_id": teamID, "code": code, "created_by": asStr(account["id"]),
		"expire_time": expire, "used_by": "", "used_time": 0,
	})
	return Row{
		"id":          asStr(row["id"]),
		"code":        code,
		"expire_time": expire,
		"url":         strings.TrimSuffix(getSetting("client_url"), "/") + "/join?c=" + code,
	}, nil
}

func teamInviteList(c *Ctx) (any, error) {
	s, err := callerScope(c)
	if err != nil {
		return nil, err
	}
	teamID, err := resolveTeamID(c, s)
	if err != nil {
		return nil, err
	}
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	out := []Row{}
	for _, inv := range liveInvites(teamID) {
		out = append(out, Row{
			"id": asStr(inv["id"]), "code": asStr(inv["code"]),
			"expire_time": inv["expire_time"], "create_time": inv["create_time"],
		})
	}
	return Row{"list": out}, nil
}

func teamInviteRevoke(c *Ctx) (any, error) {
	inviteID := c.Str("invite_id")
	if !jsTruthy(c.Value("invite_id")) {
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
	if err := requireTeamOwner(c, s, teamID); err != nil {
		return nil, err
	}
	if !hardDeleteRows("team_invites", Row{"team_id": teamID, "id": inviteID}, nil) {
		return nil, throwErr("邀请码不存在")
	}
	return Row{}, nil
}

// teamJoin redeems an invite link. Reachable with no team — that is the point.
func teamJoin(c *Ctx) (any, error) {
	code := c.Str("code")
	if !jsTruthy(c.Value("code")) {
		return nil, throwErr("参数错误")
	}
	_, account, err := looseScope(c)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return nil, throwErr("系统身份无法加入团队")
	}
	accountID := asStr(account["id"])

	invite := selectOne("team_invites", Row{"code": code})
	if invite == nil {
		return nil, throwErr("邀请码无效")
	}
	teamID := asStr(invite["team_id"])
	if asStr(invite["used_by"]) != "" {
		return nil, throwErr("邀请码已被使用")
	}
	if exp := asInt64(invite["expire_time"]); exp > 0 && nowMillis() > exp {
		return nil, throwErr("邀请码已过期")
	}
	// A soft-deleted team must not be joinable through an old link.
	if getTeam(teamID) == nil {
		return nil, throwErr("团队不存在")
	}
	// Already a member: succeed without burning the invite.
	if teamRole(accountID, teamID) != "" {
		return Row{"team_id": teamID}, nil
	}

	insertRow("team_members", Row{"team_id": teamID, "account_id": accountID, "role": "member"})
	invite["used_by"] = accountID
	invite["used_time"] = nowMillis()
	if err := persistRow("team_invites", invite); err != nil {
		return nil, throwErr("加入失败")
	}
	return Row{"team_id": teamID}, nil
}

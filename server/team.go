package main

// Team module — multi-tenancy. A team (not an account) owns forms, so forms
// survive staff turnover: a new colleague sees the team's forms the moment
// they join, and someone leaving stops seeing them without orphaning data.
//
// There is no upstream equivalent; this is the multi-tenant layer described in
// docs/multi-tenant-design.md.

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

// callerScope resolves the caller's visibility from their token.
//
// It returns an error when the caller belongs to no team, so a request is
// rejected before any query runs. Enforcing this only in the client would
// leave a team-less account able to call the API directly.
func callerScope(c *Ctx) (scope, error) {
	email := getIdentifyByVerify(c.Auth)
	if email == "" {
		return scope{}, throwErr("Unauthorized")
	}

	// The global api key resolves to a synthetic identity with no account row.
	// It is a deployment-level credential, so treat it as system scope.
	if email == apiKeyIdentity {
		return scope{all: true}, nil
	}

	account := getAccountByEmail(email)
	if account == nil {
		return scope{}, throwErr("Unauthorized")
	}

	ids := liveTeamIDs(asStr(account["id"]))
	if asInt64(account["is_admin"]) != 0 {
		// Admins are not filtered (they need to operate across teams) but still
		// carry their own memberships, so a request that omits team_id can
		// still resolve to a sensible default.
		return scope{all: true, teams: ids}, nil
	}
	if len(ids) == 0 {
		return scope{}, throwErr("请先创建或加入一个团队")
	}
	return scope{teams: ids}, nil
}

// liveTeamIDs returns the teams an account belongs to, excluding soft-deleted
// ones. A soft-deleted team keeps its rows — it just disappears for its
// members; a system admin retains visibility and can restore it.
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

// allTeamIDs returns every live team. Admin-only paths use this to populate the
// same team selector a regular user sees.
func allTeamIDs() []string {
	ids := []string{}
	for _, team := range selectRows("teams", Row{}, selectOpts{skipDeleted: true}) {
		ids = append(ids, asStr(team["id"]))
	}
	return ids
}

// visibleTeams lists the teams the caller can act in, as {id, name}. A system
// admin sees every live team — matching the all-teams form list they get — so
// the client's team selector stays consistent with the data behind it.
func visibleTeams(s scope, accountID string) []Row {
	ids := s.teams
	if s.all {
		ids = allTeamIDs()
	}
	out := []Row{}
	for _, tid := range ids {
		team := getTeam(tid)
		if team == nil {
			continue
		}
		out = append(out, Row{"id": tid, "name": asStr(team["name"])})
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
//	team_id given     -> must be a team the caller belongs to (admins may target any)
//	team_id omitted   -> only unambiguous when the caller has exactly one team
//
// Returns an error rather than a fallback so an ambiguous request can never be
// silently applied to the wrong team.
func resolveTeamID(c *Ctx, s scope) (string, error) {
	requested := c.Str("team_id")
	if requested == "" {
		if len(s.teams) == 1 {
			return s.teams[0], nil
		}
		if s.all && len(s.teams) == 0 {
			return "", throwErr("请指定团队")
		}
		return "", throwErr("请指定团队")
	}
	if s.all {
		if getTeam(requested) == nil {
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
	email := getIdentifyByVerify(c.Auth)
	account := getAccountByEmail(email)
	if account == nil {
		return throwErr("Unauthorized")
	}
	if teamRole(asStr(account["id"]), teamID) != "owner" {
		return throwErr("需要团队管理员权限")
	}
	return nil
}

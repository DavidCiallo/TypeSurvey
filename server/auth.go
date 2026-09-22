package main

import (
	"net/url"
	"strconv"
	"strings"
)

// Auth module — mirrors server/modules/auth/* exactly (token crypto,
// verification-mail registration, api-key resolution).

const apiKeyIdentity = "apikey@system.org"

var allMenus = []string{"form", "field", "record"}

func genTokenForIdentify(identity string) string {
	expiry := nowMillis() + 1000*60*60*24*3
	return aesEncrypt(identity + "|-|" + strconv.FormatInt(expiry, 10))
}

// getIdentifyByVerify returns the token identity, or "" when invalid/expired.
func getIdentifyByVerify(token string) string {
	decrypted, ok := aesDecrypt(token)
	if !ok {
		return ""
	}
	parts := strings.Split(decrypted, "|-|")
	identity := parts[0]
	expired := ""
	if len(parts) > 1 {
		expired = parts[1]
	}
	// JS quirk preserved: a missing expiry parses as NaN, and `Date.now() >
	// NaN` is false, so such tokens stay valid.
	if ms, err := strconv.ParseInt(expired, 10, 64); err == nil && nowMillis() > ms {
		return ""
	}
	return identity
}

// resolveApiKeyAuth mirrors auth.service resolveApiKeyAuth: routes flagged
// apikey:true accept the global API key as a token for the system identity.
func resolveApiKeyAuth(presented string, routeAllowsAPIKey bool) string {
	if presented == "" {
		return ""
	}
	globalKey := getSetting("api_key")
	if routeAllowsAPIKey && globalKey != "" && presented == globalKey {
		return genTokenForIdentify(apiKeyIdentity)
	}
	return presented
}

func requireAdmin(auth string) error {
	if auth == "" {
		return throwErr("Authorization failed")
	}
	email := getIdentifyByVerify(auth)
	if email == "" {
		return throwErr("Authorization failed")
	}
	account := getAccountByEmail(email)
	if account == nil || asInt64(account["is_admin"]) == 0 {
		return throwErr("Permission denied")
	}
	return nil
}

func getAccountByEmail(email string) Row {
	return selectOne("accounts", Row{"email": email})
}

func menuRoles(isAdmin int64) []any {
	roles := []any{}
	if isAdmin != 0 {
		for _, name := range allMenus {
			roles = append(roles, Row{"name": name, "type": "menu"})
		}
	}
	return roles
}

// loginUser returns an empty row on bad credentials (controller decides the message).
func loginUser(email, password string) Row {
	password = hashGenerate(password)
	account := selectOne("accounts", Row{"email": email, "password": password})
	if account == nil {
		return Row{}
	}
	isAdmin := asInt64(account["is_admin"])
	return Row{"token": genTokenForIdentify(email), "is_admin": account["is_admin"], "roles": menuRoles(isAdmin)}
}

func checkAllowedDomain(email string) string {
	allowedDomains := getSetting("allowed_domains")
	if allowedDomains == "" {
		return ""
	}
	idx := strings.LastIndex(email, "@")
	if idx < 0 {
		return "Invalid email format"
	}
	domain := strings.ToLower(email[idx+1:])
	var domains []string
	for _, d := range strings.Split(allowedDomains, ",") {
		d = strings.ToLower(strings.TrimSpace(d))
		if d != "" {
			domains = append(domains, d)
		}
	}
	for _, d := range domains {
		if d == domain {
			return ""
		}
	}
	return "Registration is limited to " + strings.Join(domains, ", ") + " email addresses"
}

// preRegisterUser emails a verification link; ok=false means failure/exists,
// err carries the thrown domain-policy message.
func preRegisterUser(name, email, password string) (bool, error) {
	if domainErr := checkAllowedDomain(email); domainErr != "" {
		return false, throwErr(domainErr)
	}
	if selectOneIgnoreDelete("accounts", Row{"email": email}) != nil {
		return false, nil
	}
	payload := strings.Join([]string{name, email, password}, "|-|")
	verificationToken := aesEncrypt(payload)
	clientURL := getSetting("client_url")
	verifyURL := clientURL + "/verify?token=" + url.QueryEscape(verificationToken)

	fromSetting := getSetting("allowed_from_domains")
	if fromSetting == "" {
		fromSetting = getSetting("allowed_domains")
	}
	from := "noreply@ehex.cc"
	if first := strings.Split(fromSetting, ",")[0]; strings.TrimSpace(first) != "" {
		from = "noreply@" + strings.TrimSpace(first)
	}
	subject, html := buildVerificationEmail(verifyURL)
	if !sendEmail(from, email, subject, html) {
		return false, nil
	}
	return true, nil
}

// completeRegistration finishes a verified registration; nil = invalid/dup.
func completeRegistration(token string) Row {
	decrypted, ok := aesDecrypt(token)
	if !ok {
		return nil
	}
	parts := strings.Split(decrypted, "|-|")
	if len(parts) < 3 {
		return nil
	}
	name, email, plainPassword := parts[0], parts[1], parts[2]
	if selectOneIgnoreDelete("accounts", Row{"email": email}) != nil {
		return nil
	}
	account := insertRow("accounts", Row{
		"name": name, "email": email, "password": hashGenerate(plainPassword),
		"is_admin": 0, "api_key": "", "balance": 0, "last_daily_time": nil,
	})
	if account == nil {
		return nil
	}
	return Row{"account": account, "token": genTokenForIdentify(email)}
}

// ---------- handlers ----------

func authAlive(c *Ctx) (any, error) {
	auth := c.Str("auth")
	if auth == "" || getIdentifyByVerify(auth) == "" {
		return nil, throwErr("Unauthorized")
	}
	email := getIdentifyByVerify(auth)
	account := getAccountByEmail(email)
	if account == nil {
		return Row{"is_admin": 0, "roles": []any{}}, nil
	}
	return Row{"is_admin": account["is_admin"], "roles": menuRoles(asInt64(account["is_admin"]))}, nil
}

func authLogin(c *Ctx) (any, error) {
	identify, _ := c.Value("identify").(map[string]any)
	if identify == nil {
		return nil, throwErr("Login data is required")
	}
	if !jsTruthy(identify["email"]) || !jsTruthy(identify["password"]) {
		return nil, throwErr("Email and password are required")
	}
	result := loginUser(jsString(identify["email"]), jsString(identify["password"]))
	if asStr(result["token"]) == "" {
		return nil, throwErr("Invalid email or password")
	}
	return result, nil
}

func authRegister(c *Ctx) (any, error) {
	if getSetting("allow_register") == "0" {
		return nil, throwErr("Registration has been disabled")
	}
	identify, _ := c.Value("identify").(map[string]any)
	if identify == nil {
		return nil, throwErr("Register data is missing")
	}
	if !jsTruthy(identify["name"]) || !jsTruthy(identify["email"]) || !jsTruthy(identify["password"]) {
		return nil, throwErr("Name, email and password are required")
	}
	ok, err := preRegisterUser(jsString(identify["name"]), jsString(identify["email"]), jsString(identify["password"]))
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, throwErr("Registration failed, email may already exist")
	}
	return Row{"needs_verification": true}, nil
}

func authConfig(c *Ctx) (any, error) {
	splitDomains := func(raw string) []any {
		out := []any{}
		for _, d := range strings.Split(raw, ",") {
			if d = strings.TrimSpace(d); d != "" {
				out = append(out, d)
			}
		}
		return out
	}
	return Row{
		"allowed_domains":       splitDomains(getSetting("allowed_domains")),
		"allowed_from_domains":  splitDomains(getSetting("allowed_from_domains")),
		"allow_register":        getSetting("allow_register") != "0",
	}, nil
}

func authVerify(c *Ctx) (any, error) {
	token := c.Str("token")
	if !jsTruthy(c.Value("token")) {
		return nil, throwErr("Token is required")
	}
	result := completeRegistration(token)
	if result == nil {
		return nil, throwErr("Invalid or expired verification link, or email already registered")
	}
	account, _ := result["account"].(Row)
	return Row{"token": result["token"], "is_admin": account["is_admin"]}, nil
}

func authCode(c *Ctx) (any, error) {
	code := c.Str("code")
	if !jsTruthy(c.Value("code")) {
		return nil, throwErr("Missing code")
	}
	result := loginUser(code, "")
	if asStr(result["token"]) == "" {
		return nil, throwErr("Invalid login code")
	}
	return result, nil
}

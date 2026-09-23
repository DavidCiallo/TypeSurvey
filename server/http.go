package main

import (
	"compress/gzip"
	"encoding/json"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
)

// ---------- request context / handler registry ----------
// Mirrors server/lib/mount.ts: routes are matched by exact path (any HTTP
// method), handlers receive one merged map (query, then body, then auth) and
// the response is wrapped in the {"success":true,"data":…} envelope.

type Ctx struct {
	Auth    string
	Headers map[string]string
	RawBody string
	Body    map[string]any // merged: query params, then body, then auth
}

// policy is how much identity a route requires. It is enforced centrally in
// serveAPI so that a handler cannot forget to check.
type policy uint8

const (
	// policyPublic requires no identity: login/registration, and the anonymous
	// fill flow (which is guarded by the per-item access code instead).
	policyPublic policy = iota
	// policyUser requires a valid token.
	policyUser
	// policyAdmin requires a valid token belonging to an admin account.
	policyAdmin
)

// routeEntry carries the handler plus the per-route access rules from the TS
// router tables (e.g. apikey: true on /api/form/list).
type routeEntry struct {
	handler     Handler
	allowAPIKey bool
	policy      policy
}

type Handler func(c *Ctx) (any, error)

var apiHandlers = map[string]routeEntry{}

func route(path string, pol policy, allowAPIKey bool, h Handler) {
	apiHandlers[path] = routeEntry{handler: h, allowAPIKey: allowAPIKey, policy: pol}
}

type handlerError struct{ msg string }

func (e *handlerError) Error() string { return e.msg }

func throwErr(msg string) error { return &handlerError{msg} }

// ---- JS-ish value coercion (the TS handlers rely on runtime coercions) ----

func (c *Ctx) Value(key string) any { return c.Body[key] }

func (c *Ctx) Has(key string) bool {
	v, ok := c.Body[key]
	return ok && v != nil
}

// Str mirrors JS String(x) for scalars.
func (c *Ctx) Str(key string) string { return jsString(c.Body[key]) }

// Num mirrors JS Number(x) coercion; ok=false when the result would be NaN.
func (c *Ctx) Num(key string) (float64, bool) { return jsNumber(c.Body[key]) }

func (c *Ctx) Int(key string) (int64, bool) {
	f, ok := jsNumber(c.Body[key])
	if !ok {
		return 0, false
	}
	return int64(f), true
}

// IsBool returns the value only when it is a real JSON boolean
// (matches `typeof x === "boolean"` checks in the TS handlers).
func (c *Ctx) IsBool(key string) (bool, bool) {
	b, ok := c.Body[key].(bool)
	return b, ok
}

// IsString returns the value only when it is a real JSON string
// (matches `typeof x === "string"` checks in the TS handlers).
func (c *Ctx) IsString(key string) (string, bool) {
	s, ok := c.Body[key].(string)
	return s, ok
}

// Truthy mirrors JS truthiness.
func (c *Ctx) Truthy(key string) bool { return jsTruthy(c.Body[key]) }

func jsTruthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case json.Number:
		f, err := t.Float64()
		return err == nil && f != 0 && !math.IsNaN(f)
	case float64:
		return t != 0 && !math.IsNaN(t)
	default:
		return true
	}
}

func jsNumber(v any) (float64, bool) {
	switch t := v.(type) {
	case nil:
		return math.NaN(), false
	case bool:
		if t {
			return 1, true
		}
		return 0, true
	case json.Number:
		f, err := t.Float64()
		if err != nil {
			return math.NaN(), false
		}
		return f, true
	case float64:
		return t, true
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return 0, true
		}
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return math.NaN(), false
		}
		return f, true
	default:
		return math.NaN(), false
	}
}

func jsString(v any) string {
	switch t := v.(type) {
	case nil:
		return "null"
	case bool:
		if t {
			return "true"
		}
		return "false"
	case json.Number:
		return t.String()
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case string:
		return t
	default:
		b, _ := json.Marshal(v)
		return string(b)
	}
}

// jsUtf16Len counts UTF-16 code units like JS String#length.
func jsUtf16Len(s string) int { return len(utf16.Encode([]rune(s))) }

// corsAllowlist holds the origins permitted to call the API cross-origin. It
// is empty by default, which means "same-origin only" — this server serves the
// SPA itself, so no CORS header is needed. Set CORS_ORIGINS (comma separated)
// for split deployments.
var corsAllowlist = []string{}

func initCORS() {
	for _, o := range strings.Split(os.Getenv("CORS_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			corsAllowlist = append(corsAllowlist, strings.ToLower(o))
		}
	}
}

// writeSecurityHeaders sets headers that are safe on every response.
func writeSecurityHeaders(w http.ResponseWriter) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	h.Set("Cross-Origin-Opener-Policy", "same-origin")
	// These directives cannot break asset loading but do block clickjacking,
	// <base> hijacking, form-action hijacking and plugin embedding. A stricter
	// script-src policy can be supplied via CSP_POLICY.
	h.Set("Content-Security-Policy", envStr("CSP_POLICY",
		"frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"))
}

func writeCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Vary", "Origin")
	origin := r.Header.Get("Origin")
	if origin == "" || len(corsAllowlist) == 0 {
		return
	}
	for _, allowed := range corsAllowlist {
		if allowed == "*" || allowed == strings.ToLower(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, token, Authorization, x-api-key")
			return
		}
	}
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, payload string) {
	writeSecurityHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	// API responses are per-user and must never be cached by any CDN or proxy.
	w.Header().Set("Cache-Control", "no-store")
	writeCORS(w, r)
	w.WriteHeader(status)
	io.WriteString(w, payload)
}

// writeFail emits the standard error envelope.
func writeFail(w http.ResponseWriter, r *http.Request, status int, message string) {
	payload, _ := json.Marshal(map[string]any{"success": false, "message": message, "data": nil})
	writeJSON(w, r, status, string(payload))
}

// maxRequestBodyBytes caps request bodies. File uploads carry base64 inside
// JSON, so a 10 MB file costs ~13.7 MB on the wire; this leaves headroom for
// the JSON wrapper.
const maxRequestBodyBytes = 16 << 20

func serveAPI(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		writeSecurityHeaders(w)
		writeCORS(w, r)
		w.WriteHeader(http.StatusOK)
		return true
	}
	entry, ok := apiHandlers[r.URL.Path]
	if !ok {
		return false
	}

	headers := map[string]string{}
	for k, v := range r.Header {
		headers[strings.ToLower(k)] = strings.Join(v, ",")
	}
	auth := r.Header.Get("token")
	if auth == "" {
		auth = r.Header.Get("x-api-key")
	}
	if auth == "" {
		auth = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	}
	auth = resolveApiKeyAuth(auth, entry.allowAPIKey)

	// Central access control. Enforced here, before the handler runs, so that
	// no route can ship without an identity check by omission.
	switch entry.policy {
	case policyUser:
		if auth == "" || getIdentifyByVerify(auth) == "" {
			writeFail(w, r, http.StatusUnauthorized, "Unauthorized")
			return true
		}
	case policyAdmin:
		if err := requireAdmin(auth); err != nil {
			writeFail(w, r, http.StatusForbidden, err.Error())
			return true
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	rawBody, readErr := io.ReadAll(r.Body)
	if readErr != nil {
		writeFail(w, r, http.StatusRequestEntityTooLarge, "请求体过大")
		return true
	}
	body := map[string]any{}
	ct := r.Header.Get("Content-Type")
	if len(rawBody) > 0 {
		parseBody := func() map[string]any {
			if strings.Contains(ct, "application/x-www-form-urlencoded") {
				return parseFormBody(string(rawBody))
			}
			dec := json.NewDecoder(strings.NewReader(string(rawBody)))
			dec.UseNumber()
			var m map[string]any
			if err := dec.Decode(&m); err == nil && m != nil {
				return m
			}
			return parseFormBody(string(rawBody))
		}
		body = parseBody()
	}
	// query params first, body overrides (same merge order as the TS mount)
	for k, vs := range r.URL.Query() {
		if _, exists := body[k]; !exists && len(vs) > 0 {
			body[k] = vs[0]
		}
	}
	body["auth"] = auth
	body["__raw_body"] = string(rawBody)
	body["__headers"] = headers

	ctx := &Ctx{Auth: auth, Headers: headers, RawBody: string(rawBody), Body: body}

	result, err := func() (res any, herr error) {
		defer func() {
			if rec := recover(); rec != nil {
				res = nil
				herr = &handlerError{"Internal server error"}
			}
		}()
		return entry.handler(ctx)
	}()

	if err != nil {
		msg := err.Error()
		if he, ok := err.(*handlerError); ok {
			msg = he.msg
		}
		writeFail(w, r, http.StatusBadRequest, msg)
		return true
	}

	payload, _ := json.Marshal(map[string]any{"success": true, "data": result})
	writeJSON(w, r, http.StatusOK, string(payload))
	return true
}

func parseFormBody(raw string) map[string]any {
	m := map[string]any{}
	vals, err := url.ParseQuery(raw)
	if err != nil {
		return m
	}
	for k, vs := range vals {
		if len(vs) > 0 {
			m[k] = vs[0]
		}
	}
	return m
}

// ---------- static SPA + uploads serving ----------

var contentTypes = map[string]string{
	".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
	".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
	".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
	".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
	".ttf": "font/ttf", ".map": "application/json", ".webp": "image/webp",
	".txt": "text/plain; charset=utf-8", ".wasm": "application/wasm",
	".pdf": "application/pdf", ".doc": "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls": "application/vnd.ms-excel",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".bmp": "image/bmp",
}

// serveUploads handles /uploads/* from the data/uploads directory
// (path-traversal protected, plain 404 without SPA fallback — same as TS).
func serveUploads(w http.ResponseWriter, r *http.Request) bool {
	p := r.URL.Path
	if !strings.HasPrefix(p, "/uploads/") {
		return false
	}
	if strings.Contains(p, "..") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return true
	}
	filePath := filepath.Join(uploadsDir, path.Clean("/"+p[len("/uploads/"):] ))
	if resolved := filepath.Clean(filePath); !strings.HasPrefix(resolved, filepath.Clean(uploadsDir)+string(os.PathSeparator)) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return true
	}
	if fileExists(filePath) {
		serveFile(w, r, filePath)
		return true
	}
	http.Error(w, "Not Found", http.StatusNotFound)
	return true
}

func serveStatic(w http.ResponseWriter, r *http.Request) bool {
	p := r.URL.Path
	if strings.HasSuffix(p, ".mjs") || strings.Contains(p, "..") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return true
	}
	filePath := filepath.Join(distDir, path.Clean("/"+p))
	if p == "/" {
		filePath = filepath.Join(distDir, "index.html")
	}
	if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
		serveFile(w, r, filePath)
		return true
	}
	if !strings.HasPrefix(p, "/api") {
		serveFile(w, r, filepath.Join(distDir, "index.html"))
		return true
	}
	return false
}

// cacheControlFor returns the Cache-Control value for a request path.
//   - /static/* holds hash-named build assets: the name changes whenever the
//     content does, so they are safe to cache forever (immutable).
//   - /uploads/* holds user attachments (often PII): private browser caching
//     only, shared CDN caches must never store them.
//   - everything else (index.html, favicons) must revalidate on every visit so
//     a new release shows up immediately.
func cacheControlFor(urlPath string) string {
	switch {
	case strings.HasPrefix(urlPath, "/uploads/"):
		return "private, max-age=31536000, immutable"
	case strings.HasPrefix(urlPath, "/static/"):
		return "public, max-age=31536000, immutable"
	default:
		return "no-cache"
	}
}

// gzipTypes lists compressible extensions (text-ish). Wasm is included because
// gzip still cuts it roughly in half on the wire.
var gzipTypes = map[string]bool{
	".html": true, ".css": true, ".js": true, ".mjs": true,
	".json": true, ".svg": true, ".txt": true, ".map": true, ".wasm": true,
}

// wantsGzip reports whether the response should be served gzip-encoded. Range
// requests skip compression: byte ranges of an encoded stream are meaningless.
func wantsGzip(r *http.Request, ext string, size int64) bool {
	return gzipTypes[ext] && size > 512 &&
		r.Header.Get("Range") == "" &&
		strings.Contains(r.Header.Get("Accept-Encoding"), "gzip")
}

func fileETag(info os.FileInfo) string {
	return `"` + strconv.FormatInt(info.ModTime().UnixNano(), 16) +
		"-" + strconv.FormatInt(info.Size(), 16) + `"`
}

// notModified writes a 304 when the client's precondition matches, mirroring
// what http.ServeContent does on the raw path. Used on the gzip path only.
func notModified(w http.ResponseWriter, r *http.Request, etag string, mod time.Time) bool {
	if inm := r.Header.Get("If-None-Match"); inm != "" {
		for _, candidate := range strings.Split(inm, ",") {
			candidate = strings.TrimSpace(candidate)
			if candidate == "*" || candidate == etag {
				w.WriteHeader(http.StatusNotModified)
				return true
			}
		}
		return false
	}
	if ims := r.Header.Get("If-Modified-Since"); ims != "" {
		if t, err := http.ParseTime(ims); err == nil &&
			!mod.Truncate(time.Second).After(t.Truncate(time.Second)) {
			w.WriteHeader(http.StatusNotModified)
			return true
		}
	}
	return false
}

func serveFile(w http.ResponseWriter, r *http.Request, filePath string) {
	writeSecurityHeaders(w)
	f, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}
	defer f.Close()
	info, _ := f.Stat()
	ext := strings.ToLower(filepath.Ext(filePath))
	if ct, ok := contentTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}
	etag := fileETag(info)
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", cacheControlFor(r.URL.Path))
	w.Header().Add("Vary", "Accept-Encoding")
	if wantsGzip(r, ext, info.Size()) {
		if notModified(w, r, etag, info.ModTime()) {
			return
		}
		data, err := os.ReadFile(filePath)
		if err != nil {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		gz.Write(data)
		gz.Close()
		return
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}

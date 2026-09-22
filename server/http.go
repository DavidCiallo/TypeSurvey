package main

import (
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

// routeEntry carries the handler plus per-route flags from the TS router
// tables (e.g. apikey: true on /api/form/list).
type routeEntry struct {
	handler     Handler
	allowAPIKey bool
}

type Handler func(c *Ctx) (any, error)

var apiHandlers = map[string]routeEntry{}

func route(path string, allowAPIKey bool, h Handler) {
	apiHandlers[path] = routeEntry{handler: h, allowAPIKey: allowAPIKey}
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

var corsHeaders = map[string]string{
	"Access-Control-Allow-Origin":  "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, token, Authorization, x-api-key",
}

func writeCORS(w http.ResponseWriter) {
	for k, v := range corsHeaders {
		w.Header().Set(k, v)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload string) {
	w.Header().Set("Content-Type", "application/json")
	writeCORS(w)
	w.WriteHeader(status)
	io.WriteString(w, payload)
}

func serveAPI(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		writeCORS(w)
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

	rawBody, _ := io.ReadAll(r.Body)
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
		payload, _ := json.Marshal(map[string]any{"success": false, "message": msg, "data": nil})
		writeJSON(w, http.StatusBadRequest, string(payload))
		return true
	}

	payload, _ := json.Marshal(map[string]any{"success": true, "data": result})
	writeJSON(w, http.StatusOK, string(payload))
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

func serveFile(w http.ResponseWriter, r *http.Request, filePath string) {
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
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}

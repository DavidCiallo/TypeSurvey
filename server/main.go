package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// TypeSurvey (简表) Go server — drop-in replacement for the Bun server:
// same routes, same request/response envelope, same token crypto, SQLite
// storage instead of JSONL (JSONL imported once on first boot).

func registerRoutes() {
	// auth (auth.router.ts) — unauthenticated by definition.
	route("/api/auth/login", policyPublic, false, authLogin)
	route("/api/auth/alive", policyPublic, false, authAlive)
	route("/api/auth/register", policyPublic, false, authRegister)
	route("/api/auth/config", policyPublic, false, authConfig)
	route("/api/auth/verify", policyPublic, false, authVerify)

	// form (form.router.ts — list allows the global api key)
	route("/api/form/list", policyUser, true, formList)
	route("/api/form/create", policyUser, false, formCreate)
	route("/api/form/update", policyUser, false, formUpdate)
	route("/api/form/del", policyUser, false, formDel)

	// field (field.router.ts)
	route("/api/field/list", policyUser, true, fieldList)
	route("/api/field/create", policyUser, false, fieldCreate)
	route("/api/field/update", policyUser, false, fieldUpdate)
	route("/api/field/del", policyUser, false, fieldDel)

	// radio (radio.router.ts)
	route("/api/radio/create", policyUser, false, radioCreate)
	route("/api/radio/update", policyUser, false, radioUpdate)
	route("/api/radio/del", policyUser, false, radioDel)

	// record (record.router.ts) — history and submit stay public because the
	// fill page is anonymous; they are gated by the per-item access code.
	route("/api/record/history", policyPublic, false, recordHistory)
	route("/api/record/submit", policyPublic, true, recordSubmit)
	route("/api/record/all", policyUser, true, recordAll)
	route("/api/record/del", policyUser, false, recordDel)

	// file (file.router.ts) — authenticated: these parse uploads and write
	// records into the database.
	route("/api/file/readxlsx", policyUser, false, fileReadXlsx)
	route("/api/file/confirm", policyUser, false, fileConfirm)
	route("/api/file/upload", policyUser, false, fileUpload)

	// settings + app (settings.router.ts) — admin only.
	route("/api/settings/list", policyAdmin, false, settingsList)
	route("/api/settings/save", policyAdmin, false, settingsSave)
	route("/api/app/export", policyAdmin, false, appExport)
	route("/api/app/import", policyAdmin, false, appImport)
}

func main() {
	loadDotEnv(".env")
	loadDotEnv("../.env")
	loadDotEnv("../../.env")
	initPaths()
	initCrypto()
	initCORS()

	if err := openDB(); err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	if err := migrateJSONL(); err != nil {
		log.Fatalf("JSONL migration failed: %v", err)
	}
	loadSettings()

	// default admin from env (same as the Bun server's initialize)
	if name, email, password := os.Getenv("ADMIN_NAME"), os.Getenv("ADMIN_EMAIL"), os.Getenv("ADMIN_PASSWORD"); name != "" && email != "" && password != "" {
		if selectOne("accounts", Row{"email": email}) == nil {
			insertRow("accounts", Row{
				"name": name, "email": email, "password": hashPassword(password),
				"is_admin": 1, "api_key": "", "balance": 0, "last_daily_time": nil,
			})
			fmt.Printf("[Init] Admin account created: %s\n", email)
		}
	}

	registerRoutes()

	server := &http.Server{
		Addr: fmt.Sprintf(":%d", port),
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if serveWS(w, r) {
				return
			}
			if serveAPI(w, r) {
				return
			}
			if serveUploads(w, r) {
				return
			}
			if serveStatic(w, r) {
				return
			}
			if strings.HasPrefix(r.URL.Path, "/api") {
				writeJSON(w, r, http.StatusNotFound, `{"error":"API not found"}`)
				return
			}
			http.NotFound(w, r)
		}),
	}
	fmt.Printf("\nServer is running at http://localhost:%d\n", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

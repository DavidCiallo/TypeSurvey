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
	// auth (auth.router.ts)
	route("/api/auth/login", false, authLogin)
	route("/api/auth/alive", false, authAlive)
	route("/api/auth/register", false, authRegister)
	route("/api/auth/config", false, authConfig)
	route("/api/auth/code", false, authCode)
	route("/api/auth/verify", false, authVerify)

	// form (form.router.ts — list allows the global api key)
	route("/api/form/list", true, formList)
	route("/api/form/create", false, formCreate)
	route("/api/form/update", false, formUpdate)
	route("/api/form/del", false, formDel)

	// field (field.router.ts)
	route("/api/field/list", true, fieldList)
	route("/api/field/create", false, fieldCreate)
	route("/api/field/update", false, fieldUpdate)
	route("/api/field/del", false, fieldDel)

	// radio (radio.router.ts)
	route("/api/radio/create", false, radioCreate)
	route("/api/radio/update", false, radioUpdate)
	route("/api/radio/del", false, radioDel)

	// record (record.router.ts — submit/all allow the global api key)
	route("/api/record/history", false, recordHistory)
	route("/api/record/submit", true, recordSubmit)
	route("/api/record/all", true, recordAll)
	route("/api/record/del", false, recordDel)

	// file (file.router.ts)
	route("/api/file/readxlsx", false, fileReadXlsx)
	route("/api/file/confirm", false, fileConfirm)
	route("/api/file/upload", false, fileUpload)

	// settings + app (settings.router.ts)
	route("/api/settings/list", false, settingsList)
	route("/api/settings/save", false, settingsSave)
	route("/api/app/export", false, appExport)
	route("/api/app/import", false, appImport)
}

func main() {
	loadDotEnv(".env")
	loadDotEnv("../.env")
	loadDotEnv("../../.env")
	initPaths()
	initCrypto()

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
				"name": name, "email": email, "password": hashGenerate(password),
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
				writeJSON(w, http.StatusNotFound, `{"error":"API not found"}`)
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

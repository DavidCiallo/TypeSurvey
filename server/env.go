package main

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// loadDotEnv is a minimal .env reader — existing keys always win
// (same semantics as the dotenv config() used by the Bun server).
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		kv := strings.SplitN(line, "=", 2)
		if len(kv) != 2 {
			continue
		}
		k := strings.TrimSpace(kv[0])
		v := strings.Trim(strings.TrimSpace(kv[1]), `"'`)
		if os.Getenv(k) == "" {
			os.Setenv(k, v)
		}
	}
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

var (
	repoRoot  string
	dataDir   string
	distDir   string
	uploadsDir string
	port      int
)

func initPaths() {
	if wd, err := os.Getwd(); err == nil {
		// The binary runs from server/ in dev, or from the repo root in
		// Docker — detect by looking for repo-root markers in the CWD itself.
		if dirExists(filepath.Join(wd, "dist")) || dirExists(filepath.Join(wd, "data")) || fileExists(filepath.Join(wd, ".env")) {
			repoRoot = wd
		} else {
			repoRoot = filepath.Dir(wd)
		}
	} else {
		repoRoot = "."
	}
	dataDir = envStr("DATA_DIR", filepath.Join(repoRoot, "data"))
	distDir = envStr("DIST_DIR", filepath.Join(repoRoot, "dist"))
	uploadsDir = envStr("UPLOADS_DIR", filepath.Join(dataDir, "uploads"))
	port = envInt("SERVER_PORT", 3300)
	os.MkdirAll(dataDir, 0o755)
	os.MkdirAll(uploadsDir, 0o755)
}

func nowMillis() int64 { return time.Now().UnixMilli() }

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

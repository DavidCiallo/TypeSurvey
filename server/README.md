# TypeSurvey (简表) Go Server

[English](README.md) | [简体中文](README.zh-CN.md)

Go port of the Bun/TypeScript server, targeting low-memory VPS deployment:
resident memory drops from 200–350 MB (Bun) to ~20 MB. The porting approach
follows the same pattern used in the `email-typer` project.

## Compatibility with the TS version

- **Fully API-compatible**: every route is `POST /api/<module>/<action>` with an
  identical response envelope (`200 {"success":true,"data":…}` /
  `400 {"success":false,"message":…,"data":null}`). The frontend needs zero
  changes (`dist/` is served directly; SPA fallback, `.mjs`/`..` → 403,
  `/uploads/*` path-traversal protection and the `/ws` endpoint all behave the
  same).
  - query/body merge order (body overrides query), `__headers` injection,
    `token / x-api-key / Bearer` auth resolution and `apikey: true` routes
    (`/api/form/list`, `/api/field/list`, `/api/record/submit`, `/api/record/all`
    can trade the global `api_key` for a system identity token) match the TS
    mount exactly.
  - JS weak-typing semantics in every handler (truthy checks,
    `typeof x === "boolean"`, UTF-16 `String(x).length`, NaN slice behaviour…)
    are replicated case by case.
- **Token & password compatibility**: AES-256-CBC with key=SHA256(SECRET),
  iv=SHA256("cfrs-iv-"+SECRET)[:16], nonce-suffix + string reversal. Tokens in
  the legacy TS format are still accepted (`verifyLegacyToken`; tokens without
  an expiry are rejected), while new logins issue signed v2 tokens. Password
  hashes remain compatible and are transparently upgraded to bcrypt on the next
  login. Old verification links keep working (verified against the live
  `data/account.jsonl`).
- **Storage**: `data/*.jsonl` (account/field/radio/record/settings) is imported
  once into SQLite (`data/typesurvey.db`, WAL mode) on first boot. The JSONL
  files are kept as backup; the import is idempotent (meta marker). Row order
  (JSONL append order) is preserved by a `seq` column, matching the TS
  Repository listing semantics. Row bodies are stored as raw JSON so `field_value`
  string/number/boolean types round-trip losslessly.
- **XLSX import**: SheetJS semantics reproduced with excelize (blank → null,
  formatted text, date cells normalized to `yyyy-mm-dd`, header-row detection,
  cell-type inference text/email/number/date/time/textarea/checkbox/select);
  chunked upload assembly, 10 MB per-file limit and the extension allowlist all
  match.
- **Pinyin search**: pinyin-pro full-name / initial matching reproduced with
  `mozillazg/go-pinyin` ("beijing"/"bj" match "北京") — verified.
- **Record codes**: `codeGenerate` (character-code sum modulo) is bit-identical,
  so old record links validate.

## Deliberate fixes to TS-version bugs (behavior differences — all bug fixes)

1. **Form deletion leaked data**: TS `deleteForm` passed `{$in: […]}` to
   `hardDelete`, whose strict matcher does not support operators — records and
   radios were never deleted. The Go version cascades via `field_id IN (…)`.
2. **Export/import lost fields**: TS `getAllData`/`importAllData` used the
   nonexistent `form_field` repo, so fields always exported empty and were lost
   on import. The Go version uses the `fields` table.
3. **CORS preflight**: in TS, OPTIONS requests to registered routes ran the
   handler and failed with 400. The Go version answers OPTIONS with 200 + CORS
   headers (same-origin frontends are unaffected).

## Security hardening (PR #41, contributed by @KrobAber)

- Explicit per-route auth policies (`public` / `user` / `admin`) enforced before
  handlers run — a handler can no longer forget its check
- Passwords hashed with bcrypt (legacy hashes auto-upgrade on login); new
  session tokens are signed (v2) and tokens without an expiry are rejected
- `/api/auth/code` removed (unused by the frontend)
- Startup refuses to run without `SECRET`; request bodies are size-capped;
  CORS is allowlist-based (`CORS_ORIGINS`); standard security response headers

## Minor differences (safe to ignore)

- JSON response keys are alphabetically ordered (TS used insertion order); key
  order is semantically irrelevant.
- XLSX date parsing edge time zones follow the same rules as JS
  (`new Date("yyyy-mm-dd")` UTC vs `"yyyy/mm/dd"` local); exotic inputs such as
  year `"172"` are no longer replicated.
- JS-only numeric literals like `Number("0x10")` parse as standard floats in
  cell number inference.

## Build & Run

```
cd server
go build -o typesurvey .
./typesurvey          # reads the repo-root .env; default port SERVER_PORT=3300
```

Or from the repository root: `npm run serve` (= `cd server && go run .`).

Environment variables are shared with the TS version (SECRET, NONCE_LENGTH,
SERVER_PORT, ADMIN_*, ALLOW_REGISTER, ALLOWED_REGISTER_DOMAINS,
ALLOWED_FROM_DOMAINS, RESEND_API_KEY, CLIENT_URL, API_KEY, CORS_ORIGINS);
`DATA_DIR`, `DIST_DIR` and `UPLOADS_DIR` override the data / static / uploads
directories. Frontend builds accept `ASSET_PREFIX=https://cdn.example.com` to
point asset URLs at a CDN domain (default `/`, same-origin).

## Deployment Notes

- First boot runs the JSONL → SQLite migration (~1 s for 12k records); later
  boots read the database directly.
- Backups must include `data/` (the `typesurvey.db` plus `-wal`/`-shm` files and
  `uploads/`). The JSONL files are a historical backup only — the Go server no
  longer appends to them.
- Do not run the TS server and the Go server against the same data directory at
  the same time.
- Static responses already carry standard HTTP caching semantics (`/static/*`
  immutable for a year, HTML `no-cache` + ETag, `/api` `no-store`, `/uploads`
  `private`) with gzip for text — any CDN that honors origin `Cache-Control`
  works out of the box. See the “CDN acceleration” section in the root README.

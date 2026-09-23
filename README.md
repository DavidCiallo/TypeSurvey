# TypeSurvey / 简表

[English](README.md) | [简体中文](README.zh-CN.md)

An open-source form builder: create surveys, registration forms and data-collection
tools with zero code, share a link, and review responses in one place. A
lightweight, self-hosted alternative to Typeform / Google Forms.

## Features

- **Form builder** — 14 field types: text, email, password, number, month, date,
  time, color, textarea, select, multiselect, checkbox, checkbox group, file
  upload; per-field required / placeholder / comment
- **Data collection** — public fill link, paginated one-page-at-a-time form,
  required-field validation, draft restore, and code-protected editing of past
  submissions
- **Results** — responses grouped per submission, text and Chinese pinyin search
  (`beijing` / `bj` matches `北京`), inline editing of any field
- **Import & export** — bulk-import records from XLSX, create a whole form from an
  XLSX file, one-click full backup / restore
- **Accounts** — email-verified registration, admin bootstrapped from env,
  global API key with per-route scope for third-party integrations
- **i18n & theme** — English / 简体中文, light / dark
- **Lightweight** — Go server with SQLite storage, resident memory ≈ 20 MB,
  single static binary; first boot automatically migrates legacy JSONL data

## Tech Stack

- Frontend: React 19 + react-router-dom 7 + shadcn/ui (Radix UI + Tailwind CSS v4)
  + lucide-react, built with rsbuild
- Backend: Go `net/http` + SQLite (WAL); see [server/README.md](server/README.md)
  for compatibility notes on the legacy Bun/TypeScript server

## Quick Start

```bash
git clone https://github.com/DavidCiallo/TypeSurvey
cd TypeSurvey
bun install            # or: npm install
cp .env.example .env   # then edit it (at least set SECRET)
```

Start the backend and the frontend dev server in two terminals:

```bash
npm run serve          # backend: cd server && go run .   (Go 1.23+)
npm run dev            # frontend: rsbuild dev --open
```

> The dev server proxies `/api`, `/uploads` and `/ws` to `127.0.0.1:3400`
> (see `rsbuild.config.ts`), so run the backend with `SERVER_PORT=3400`,
> or adjust the proxy target. The legacy Bun/TypeScript server remains in
> `server/app` etc. as a reference only.

## Configuration

Environment variables (`.env` at the repository root):

| Variable | Description | Default |
|---|---|---|
| `SECRET` | Token / crypto secret — **change it** | — |
| `NONCE_LENGTH` | Token nonce length | `4` |
| `SERVER_PORT` | HTTP listen port | `3300` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account on first start | — |
| `ALLOW_REGISTER` | Set `0` to disable public registration (**recommended on the public internet**) | enabled |
| `ALLOWED_REGISTER_DOMAINS` | Restrict registration to these email domains | unrestricted |
| `ALLOWED_FROM_DOMAINS` | Allowed sender domains for the Resend mailer | — |
| `RESEND_API_KEY` | Resend API key for verification emails | — |
| `CLIENT_URL` | Public site URL used in verification emails | — |
| `API_KEY` | Global API key for third-party access | — |
| `CORS_ORIGINS` | Allowed origins for cross-origin API calls | same-origin |
| `DATA_DIR` / `DIST_DIR` / `UPLOADS_DIR` | Override data / static / uploads directories | `./data` etc. |

## Build & Deployment

```bash
npm run build                                   # frontend → dist/
cd server && go build -o typesurvey . && ./typesurvey
```

- **Server deployment (recommended)**: the Go binary serves `dist/` + the API in
  one process, resident memory ≈ 20 MB; `DockerFile` / `docker-compose.yml`
  implement this mode.
- **Static hosting**: `dist/` can be deployed to any static host (the API must be
  served separately).

The app works headless: exposing the server port alone unlocks every feature.

### CDN acceleration (optional)

On small-bandwidth servers, serving static assets from a CDN edge helps a lot.
The principle: **the origin emits standard HTTP caching semantics (built in),
so any CDN works out of the box** — no vendor lock-in.

| Path | Origin header | Notes |
|---|---|---|
| `/static/*` (hash-named) | `Cache-Control: public, max-age=31536000, immutable` | name = version |
| `/index.html` (and SPA routes) | `Cache-Control: no-cache` + ETag | 304 revalidation, releases show instantly |
| `/api/*` | `Cache-Control: no-store` | dynamic, never cached |
| `/uploads/*` | `Cache-Control: private, max-age=31536000, immutable` | browser-private only — **set the CDN to pass through, do not cache** (user attachments) |

Text assets (JS/CSS/HTML/JSON…) are gzip-encoded automatically (~2/3 smaller on
the wire).

Generic setup (shown with Qiniu Cloud; Cloudflare / Aliyun / Tencent Cloud work
the same way):

1. **Reverse proxy** on the origin (nginx example — WebSocket needs HTTP/1.1 +
   upgrade headers):

   ```nginx
   server {
       listen 80;
       server_name survey.example.com;
       return 301 https://$host$request_uri;
   }
   server {
       listen 443 ssl;
       server_name survey.example.com;
       ssl_certificate     /etc/letsencrypt/live/survey.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/survey.example.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # WebSocket (/ws)
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 300s;
       }
   }
   ```

2. **CDN**: add the acceleration domain (e.g. `survey.example.com`) → origin type
   **custom origin** (server IP) → origin Host = your domain → **origin protocol:
   HTTPS**.
3. **Cache rules**: pick "honor origin Cache-Control" (or manually: cache
   `/static/*` for 30 days; never cache `/index.html`, `/api/*`, `/uploads/*`).
4. **DNS**: change the record from `A → server IP` to `CNAME → CDN target`
   (lower the TTL first so you can roll back in seconds).
5. **Verify**:

   ```bash
   curl -I https://survey.example.com/static/js/lib-react.75017f39.js
   #   expect Cache-Control: public, max-age=31536000, immutable (+ CDN hit headers)
   curl -I https://survey.example.com/
   #   expect Cache-Control: no-cache (releases take effect immediately)
   ```

Caveats:

- **Always pull origin over HTTPS.** The port-80 block above only redirects; a
  CDN pulling over HTTP receives a 301/302 pointing at itself → infinite loop.
- `/ws` needs WebSocket passthrough (all major CDNs support it); otherwise point
  the page at the origin directly.
- `/uploads/*` holds user-submitted attachments (may be personal data): keep it
  CDN pass-through to avoid copies on edge nodes.
- Release order: update static assets first, then HTML (rollback in reverse).

Advanced (optional): assets can live entirely on object storage + CDN — build
with `ASSET_PREFIX=https://static.example.com npm run build`, upload `dist/` to
the bucket (`qshell` / `ossutil` / `s3cmd`, one command each), and let the origin
serve only HTML + API. Do **not** put `index.html` in the bucket: bucket-level
caching usually cannot be overridden per object, which would break releases.

## API

All endpoints are `POST /api/<module>/<action>` and share one envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "message": "...", "data": null }
```

Modules: `auth`, `form`, `field`, `radio`, `record`, `settings`, `app`, `file`.
Authenticate with the `token` header (from `auth/login`) or the global API key
(`x-api-key` header or `Authorization: Bearer`). Four endpoints accept the global
API key directly for third-party integrations: `form/list`, `field/list`,
`record/submit`, `record/all`. Request/response DTOs live in `shared/`.

## Security & Privacy Checklist

Before exposing a deployment to the internet:

- **Registration is enabled by default** — set `ALLOW_REGISTER=0` (or turn it off
  in Settings) unless you really want open sign-ups.
- **`/uploads/*` files are unguessable but unauthenticated** — anyone holding a
  link can download the file. Avoid collecting highly sensitive documents until
  an auth layer is added.
- Terminate TLS at a reverse proxy or CDN (see above); keep `data/` private.
- Backups: copy the whole `data/` directory (SQLite database + `uploads/`).

## Known Limitations

- No conditional branching / skip logic yet
- Format validation is limited to built-in input types plus a 1000-character
  server-side cap (no custom regex / length rules yet)
- No submit notifications (email / webhook) yet
- The data model is single-tenant: every logged-in account sees all forms and
  responses (no per-form ACL yet)

## License

MIT

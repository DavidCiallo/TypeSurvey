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

Build the frontend and the server, then run the binary — it serves `dist/` and
the API from one process (resident memory ≈ 20 MB):

```bash
npm run build                                  # frontend → dist/
cd server && go build -o typesurvey . && ./typesurvey
```

The app works headless: exposing the server port alone unlocks every feature.
`dist/` can also be hosted statically if you serve the API separately.

### Docker

`DockerFile` is a three-stage build (rsbuild frontend → pure-Go binary → Alpine
runtime) and the resulting image contains only the static binary and `dist/`:

```bash
docker build -t typesurvey .
docker run -d --name typesurvey --restart unless-stopped \
  -p 3000:3000 -e SERVER_PORT=3000 \
  --env-file .env -v typesurvey-data:/data \
  typesurvey
```

`docker compose up -d --build` does the same thing (it sets `SERVER_PORT` for
you). Points worth knowing:

- All mutable state lives in the `/data` volume: the SQLite database **and**
  `uploads/`, which defaults to a subdirectory of the data directory.
- `SERVER_PORT` must match the published port. The image keeps the application
  default (`3300`), so publishing `3000:3000` requires `-e SERVER_PORT=3000`;
  the compose file already does this.
- Keep `SECRET` and friends in `.env` and pass the file with `--env-file`
  (the `.env` is never baked into the image).
- Back up the volume with
  `docker run --rm -v typesurvey-data:/data -v "$PWD":/backup alpine tar czf /backup/typesurvey-data.tar.gz -C /data .`
- To keep data in a host directory instead, swap the volume for
  `-v "$PWD/data:/data"`.
- `.dockerignore` keeps `node_modules/`, `dist/`, `data/` and `.env` out of the
  build context.

### Reverse proxy (HTTPS)

```nginx
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

Terminate TLS at this layer (or at the CDN) and redirect port 80 to 443.

### CDN acceleration (optional)

The origin already emits standard HTTP caching semantics, so **any CDN that
honours the origin `Cache-Control` works as-is** — there is no vendor SDK or
provider-specific code in this repository:

| Path | Origin response | CDN rule |
|---|---|---|
| `/static/*` (hash-named) | `public, max-age=31536000, immutable` | cache long |
| `/index.html` + SPA routes | `no-cache` + ETag | do not cache |
| `/api/*` | `no-store` | do not cache |
| `/uploads/*` | `private, max-age=31536000, immutable` | pass through (user attachments) |

Add the domain as a custom-origin CDN (origin = your server, **origin protocol
HTTPS**), choose "honour origin Cache-Control", then point DNS at the CDN with a
CNAME. Text assets are gzip-encoded on the fly (~2/3 smaller on the wire).

Two things that bite: pulling the origin over HTTP lands on the HTTPS redirect
and loops, and `/ws` needs WebSocket passthrough. Assets can also live on object
storage — build with `ASSET_PREFIX=https://static.example.com`, upload `dist/`,
and keep `index.html` on the origin (bucket-level caching usually ignores
per-object headers, which would break releases).

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

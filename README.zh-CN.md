# 简表（TypeSurvey / JianBiao）

[English](README.md) | [简体中文](README.zh-CN.md)

一个开源的表单系统：只需简单配置，即可快速构建调查问卷、报名表和数据收集工具，
通过链接分享填写，在一处统一查看回收结果。Typeform / Google Forms 的轻量自托管替代。

## 功能特性

- **表单管理** — 14 种字段类型：文本、邮箱、密码、数字、月份、日期、时间、颜色、
  文本域、下拉选择、多选、复选框、复选框组、文件上传；支持必填 / 占位提示 / 备注
- **数据收集** — 公开填写链接、每页一题的分页填写、必填校验、草稿恢复、
  带口令的回访编辑
- **数据查看** — 按条目分组浏览回收结果，文本 + 中文拼音搜索（`beijing` / `bj`
  即可匹配「北京」），任意字段可在线编辑
- **导入导出** — XLSX 批量导入记录、XLSX 一键建表、整站数据一键备份 / 恢复
- **账号体系** — 邮箱验证注册、环境变量引导管理员、带路由级权限的全局 API key
  （便于第三方系统对接）
- **多语言与主题** — 中文 / 英文、暗色 / 亮色
- **轻量** — Go 服务端 + SQLite 存储，常驻内存约 20 MB，单个静态二进制；
  首次启动自动迁移历史 JSONL 数据

## 技术栈

- 前端：React 19 + react-router-dom 7 + shadcn/ui（Radix UI + Tailwind CSS v4）
  + lucide-react，rsbuild 构建
- 后端：Go `net/http` + SQLite（WAL）；与旧 Bun/TypeScript 服务端的兼容性说明见
  [server/README.zh-CN.md](server/README.zh-CN.md)

## 快速开始

```bash
git clone https://github.com/DavidCiallo/TypeSurvey
cd TypeSurvey
bun install            # 或：npm install
cp .env.example .env   # 然后编辑（至少设置 SECRET）
```

前后端分别启动（两个终端）：

```bash
npm run serve          # 后端：cd server && go run .（需要 Go 1.23+）
npm run dev            # 前端：rsbuild dev --open
```

> 开发服务器把 `/api`、`/uploads`、`/ws` 代理到 `127.0.0.1:3400`
> （见 `rsbuild.config.ts`），因此后端请以 `SERVER_PORT=3400` 启动，
> 或自行调整代理目标。历史版本的 Bun/TypeScript 服务端保留在 `server/app`
> 等目录中仅供参考，运行时不再需要。

## 环境变量

（仓库根目录 `.env`）

| 变量 | 说明 | 默认 |
|---|---|---|
| `SECRET` | token / 加密密钥 — **务必修改** | — |
| `NONCE_LENGTH` | token nonce 长度 | `4` |
| `SERVER_PORT` | HTTP 监听端口 | `3300` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 首次启动引导的管理员账号 | — |
| `ALLOW_REGISTER` | 设为 `0` 关闭公开注册（**公网部署建议关闭**） | 开启 |
| `ALLOWED_REGISTER_DOMAINS` | 限制可注册的邮箱域名 | 不限 |
| `ALLOWED_FROM_DOMAINS` | Resend 发件域名白名单 | — |
| `RESEND_API_KEY` | 验证邮件（Resend）API key | — |
| `CLIENT_URL` | 验证邮件中使用的站点地址 | — |
| `API_KEY` | 第三方接入用的全局 API key | — |
| `CORS_ORIGINS` | 允许跨域调用 API 的来源 | 同源 |
| `DATA_DIR` / `DIST_DIR` / `UPLOADS_DIR` | 覆盖数据 / 静态 / 上传目录 | `./data` 等 |

## 构建与部署

构建前端与服务端后直接运行二进制——单进程同时提供 `dist/` 静态资源与 API
（常驻内存约 20 MB）：

```bash
npm run build                                  # 前端 → dist/
cd server && go build -o typesurvey . && ./typesurvey
```

本应用支持无头（Headless）部署，仅暴露服务端端口即可使用全部功能；
`dist/` 也可单独交给静态托管（API 需另行部署）。

### Docker

`DockerFile` 为三段式构建（rsbuild 构建前端 → 纯 Go 编译二进制 → Alpine 运行），
最终镜像只包含静态二进制与 `dist/`：

```bash
docker build -t typesurvey .
docker run -d --name typesurvey --restart unless-stopped \
  -p 3000:3000 -e SERVER_PORT=3000 \
  --env-file .env -v typesurvey-data:/data \
  typesurvey
```

`docker compose up -d --build` 等价（compose 已替你设好 `SERVER_PORT`）。几个要点：

- 所有可变状态都在 `/data` 卷里：SQLite 数据库**以及** `uploads/`（上传目录默认位于
  数据目录之下）。
- `SERVER_PORT` 必须与映射端口一致。镜像沿用应用默认值（`3300`），因此映射
  `3000:3000` 时要加 `-e SERVER_PORT=3000`（compose 已配置）。
- `SECRET` 等配置放进 `.env` 并用 `--env-file` 传入（`.env` 不会被打进镜像）。
- 备份整个卷：
  `docker run --rm -v typesurvey-data:/data -v "$PWD":/backup alpine tar czf /backup/typesurvey-data.tar.gz -C /data .`
- 想用宿主目录存数据，把卷换成 `-v "$PWD/data:/data"` 即可。
- `.dockerignore` 已把 `node_modules/`、`dist/`、`data/`、`.env` 排除在构建上下文外。

### 反向代理（HTTPS）

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

        # WebSocket（/ws）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
```

TLS 在这一层（或 CDN 层）终结，并把 80 端口跳转到 443。

### CDN 加速（可选）

源站已经发出标准的 HTTP 缓存语义，因此**任何「遵循源站 Cache-Control」的 CDN
都能直接生效**——仓库里没有任何厂商 SDK 或专有代码：

| 路径 | 源站响应 | CDN 规则 |
|---|---|---|
| `/static/*`（hash 文件名） | `public, max-age=31536000, immutable` | 长缓存 |
| `/index.html` 及 SPA 路由 | `no-cache` + ETag | 不缓存 |
| `/api/*` | `no-store` | 不缓存 |
| `/uploads/*` | `private, max-age=31536000, immutable` | 直通不缓存（用户附件） |

在 CDN 侧添加加速域名（源站选「自有源站」，填服务器地址，**回源协议选 HTTPS**），
缓存规则选「遵循源站」，再把 DNS 改成指向 CDN 的 CNAME 即可。文本类资源自带 gzip
（约省 2/3 体积）。

两个容易踩的点：用 HTTP 回源会撞上 HTTPS 跳转形成死循环；`/ws` 需要 CDN 支持
WebSocket 透传。静态资源也可完全外置到对象存储——构建时设
`ASSET_PREFIX=https://static.example.com`，把 `dist/` 上传到桶，`index.html` 留在
源站（桶级缓存通常无法按对象覆盖，会导致发版不生效）。

## API

全部接口为 `POST /api/<module>/<action>`，响应使用统一封装：

```json
{ "success": true, "data": { } }
{ "success": false, "message": "...", "data": null }
```

模块：`auth`、`form`、`field`、`radio`、`record`、`settings`、`app`、`file`。
鉴权方式：`token` 请求头（来自 `auth/login`）或全局 API key（`x-api-key` 头 /
`Authorization: Bearer`）。其中四个接口可直接用全局 API key 供第三方对接：
`form/list`、`field/list`、`record/submit`、`record/all`。请求/响应 DTO 见 `shared/`。

## 安全与隐私检查表

公网部署前请过一遍：

- **注册默认开放** — 除非确实需要开放注册，否则请设置 `ALLOW_REGISTER=0`
  （或在设置页关闭）。
- **`/uploads/*` 文件链接不可猜但无鉴权** — 持有链接者均可下载。在增加访问
  鉴权之前，避免收集高敏感证件类文件。
- 在反向代理或 CDN 层终结 TLS（见上文）；确保 `data/` 目录不对外。
- 备份：整目录拷贝 `data/`（SQLite 数据库 + `uploads/`）。

## 已知限制

- 暂不支持条件跳转（skip logic）
- 格式校验目前仅有输入类型自带的（邮箱/数字/日期等）+ 服务端 1000 字上限，
  暂无自定义正则 / 字数规则
- 暂无提交通知（邮件 / webhook）
- 数据模型为单租户：所有登录账号可见全部表单与回访（暂无表级权限）

## 许可证

MIT

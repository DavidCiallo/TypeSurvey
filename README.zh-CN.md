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

```bash
npm run build                                   # 前端 → dist/
cd server && go build -o typesurvey . && ./typesurvey
```

- **服务器部署（推荐）**：Go 二进制单进程托管 `dist/` + API，常驻内存约 20 MB；
  `DockerFile` / `docker-compose.yml` 即此模式
- **静态托管**：`dist/` 可部署至任何静态托管平台（API 需另行部署）

本应用支持无头（Headless）部署，仅暴露服务端端口即可使用全部功能。

### CDN 加速（可选）

服务器带宽较小时，把静态资源放到 CDN 边缘可以显著提速。核心思路：**源站把
HTTP 缓存语义做对（本项目已内置），任意 CDN 即插即用**，不绑定任何厂商。

| 路径 | 源站响应头 | 说明 |
|---|---|---|
| `/static/*`（hash 文件名） | `Cache-Control: public, max-age=31536000, immutable` | 名字即版本，可长缓存 |
| `/index.html`（及 SPA 路由） | `Cache-Control: no-cache` + ETag | 每次协商 304，发版即时生效 |
| `/api/*` | `Cache-Control: no-store` | 动态数据，任何环节都不缓存 |
| `/uploads/*` | `Cache-Control: private, max-age=31536000, immutable` | 仅浏览器私有缓存；**CDN 请设直通不缓存**（用户隐私附件） |

文本类资源（JS/CSS/HTML/JSON 等）自带 gzip（实测约省 2/3 体积）。

通用接入步骤（以七牛云融合 CDN 为例，Cloudflare / 阿里云 / 腾讯云同理）：

1. **反向代理层**（nginx 示例；WebSocket 需要 HTTP/1.1 + Upgrade 头）：

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

           # WebSocket（/ws）
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 300s;
       }
   }
   ```

2. **CDN 配置**：添加加速域名（如 `survey.example.com`）→ 源站类型选
   **自有源站**（填服务器 IP）→ 回源 Host 填站点域名 → **回源协议选 HTTPS**。
3. **缓存规则**：选"遵循源站 Cache-Control"（或手动配：`/static/*` 缓存 30 天，
   `/index.html`、`/api/*`、`/uploads/*` 不缓存）。
4. **DNS**：把域名从 `A 记录 → 服务器 IP` 改成 `CNAME → CDN 分配的地址`
   （先把 TTL 调低，配置有误时可秒级回滚）。
5. **验证**：

   ```bash
   curl -I https://survey.example.com/static/js/lib-react.75017f39.js
   #   期望 Cache-Control: public, max-age=31536000, immutable，且带 CDN 命中头
   curl -I https://survey.example.com/
   #   期望 Cache-Control: no-cache（发版立即生效）
   ```

注意事项：

- **回源协议务必选 HTTPS**：上面 nginx 的 80 块只做 HTTPS 跳转，若 CDN 用
  HTTP 回源 80 会得到 301/302 且指向自身，形成无限重定向循环。
- `/ws` 需要 CDN 支持 WebSocket 透传（主流 CDN 均支持）；不支持时可让页面
  直连源站。
- `/uploads/*` 存放用户提交的附件（可能含个人隐私资料），建议 CDN 直通不缓存，
  避免数据在边缘节点留副本。
- 发版顺序：先更新静态资源，再更新 HTML；回滚反之（避免旧页面引用已删除资源）。

进阶（可选）：静态资源也可以完全外置到对象存储 + CDN——构建时设置
`ASSET_PREFIX=https://static.example.com npm run build`，`dist/` 上传到存储桶
（各家 CLI 一行即可，如 `qshell` / `ossutil` / `s3cmd`），源站只出 HTML 与 API。
注意 HTML 不要放进存储桶（桶级缓存通常无法按对象覆盖，会导致发版不生效）。

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

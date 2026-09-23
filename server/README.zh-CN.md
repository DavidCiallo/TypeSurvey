# TypeSurvey（简表）Go 服务端

[English](README.md) | [简体中文](README.zh-CN.md)

Bun/TypeScript 服务端的 Go 移植版，目标是把常驻内存从 200–350 MB（Bun）
降到 ~20 MB，适配小内存 VPS。移植方案参考 `email-typer` 项目的同类实践。

## 与 TS 版的兼容性

- **API 完全兼容**：全部路由为 `POST /api/<module>/<action>`，响应封装一致
  （成功 `200 {"success":true,"data":…}`，失败 `400 {"success":false,"message":…,"data":null}`），
  前端无需任何改动（`dist/` 静态资源由本服务直接托管，SPA 回退、`.mjs`/`..` 403、
  `/uploads/*` 路径穿越防护与 WS `/ws` 行为一致）。
  - query/body 合并顺序（body 覆盖 query）、`__headers` 注入、`token / x-api-key / Bearer`
    鉴权解析、`apikey: true` 路由（`/api/form/list`、`/api/field/list`、`/api/record/submit`、
    `/api/record/all` 可用全局 `api_key` 换取系统身份 token）均与 TS mount 一致。
  - 各 handler 的 JS 弱类型语义（truthy 判断、`typeof x === "boolean"`、
    `String(x).length` 的 UTF-16 计数、slice 的 NaN 行为等）逐条对齐。
- **token / 密码兼容**：AES-256-CBC，key=SHA256(SECRET)、iv=SHA256("cfrs-iv-"+SECRET)[:16]、
  nonce 后缀 + 字符串反转。旧 TS 格式的登录 token 仍然有效（`verifyLegacyToken`，
  无有效期的判无效），新登录改发加签 v2 token；密码哈希保持兼容，下次登录自动
  升级为 bcrypt；注册验证链接继续有效（已用现有 `data/account.jsonl` 实测）。
- **存储**：`data/*.jsonl`（account/field/radio/record/settings）首次启动时整体导入
  SQLite（`data/typesurvey.db`，WAL 模式），JSONL 文件保留作备份，导入幂等（meta 标记），
  行序（JSONL 追加序）由 `seq` 列保留，与 TS Repository 的列表排序语义一致。
  行体以原始 JSON 存储，`field_value` 的 string/number/boolean 类型往返保真。
- **XLSX 导入**：SheetJS 语义由 excelize 复刻（空格补 null、格式化文本、日期单元格
  统一 `yyyy-mm-dd`、表头行探测、单元格类型推断 text/email/number/date/time/
  textarea/checkbox/select 一致）；分块上传组装、10MB 单文件上传、扩展名白名单一致。
- **拼音搜索**：`pinyin-pro` 全拼/首字母匹配由 `mozillazg/go-pinyin` 复刻
  （如 "beijing"/"bj" 匹配 "北京"），已实测。
- **记录 code**：`codeGenerate`（字符码求和取模）逐位一致，旧记录链接的 code 校验通过。

## 有意修复的 TS 版问题（行为差异，均为缺陷修复）

1. **表单删除不清理记录/选项**：TS `deleteForm` 给 `hardDelete` 传 `{$in: […]}`，
   但其严格匹配器不支持操作符，导致记录/选项永远删不掉（孤儿数据）。
   Go 版实现 `field_id IN (…)` 级联删除。
2. **数据导出/导入丢失字段**：TS `getAllData`/`importAllData` 用的集合名是
   `form_field`（不存在），字段永远导出为空、导入丢失。Go 版使用 `fields` 表。
3. **CORS 预检**：TS 中 OPTIONS 打到已注册路由会直接跑 handler 返回 400，
   跨域预检失败；Go 版对 OPTIONS 统一返回 200 + CORS 头（同域前端不受影响）。

## 安全加固（PR #41，由 @KrobAber 贡献）

- 路由层显式鉴权策略（`public` / `user` / `admin`），在 handler 之前统一拦截，
  不再依赖每个 handler 自觉检查
- 密码改用 bcrypt（旧哈希下次登录自动升级）；新会话 token 加签（v2），
  无有效期的 token 直接判无效
- 删除 `/api/auth/code`（前端未使用）
- 缺 `SECRET` 拒绝启动；请求体加上限；CORS 改白名单（`CORS_ORIGINS`）；
  补齐标准安全响应头

## 微小差异（可忽略）

- JSON 响应的键顺序为字母序（TS 为插入序）；JSON 对象键序无语义，前端不受影响。
- XLSX 日期解析的时区边界（JS `new Date("yyyy-mm-dd")` 按 UTC、`"yyyy/mm/dd"` 按本地）
  已按相同规则实现；极端格式（如 `"172"` 年份）不再复刻。
- `Number("0x10")` 等 JS 特有数字字面量在单元格数字推断中按标准浮点解析。

## 构建与运行

```
cd server
go build -o typesurvey .
./typesurvey          # 读取仓库根目录 .env，默认端口 SERVER_PORT=3300
```

或在仓库根目录 `npm run serve`（= `cd server && go run .`）。

环境变量与 TS 版共用（SECRET、NONCE_LENGTH、SERVER_PORT、ADMIN_*、ALLOW_REGISTER、
ALLOWED_REGISTER_DOMAINS、ALLOWED_FROM_DOMAINS、RESEND_API_KEY、CLIENT_URL、API_KEY、
CORS_ORIGINS），`DATA_DIR`、`DIST_DIR`、`UPLOADS_DIR` 可覆盖数据、静态资源与上传目录。
构建前端时可用 `ASSET_PREFIX=https://cdn.example.com` 把静态资源引用指向自定义
CDN 域名（默认 `/` 同源，行为不变）。

## 部署注意

- 首次启动自动执行 JSONL → SQLite 迁移（1.2 万条记录约一秒内），之后启动直接读库。
- 备份仍需 `data/`（含 `typesurvey.db` 及 -wal/-shm、`uploads/`）一起拷贝；
  JSONL 仅作历史备份，Go 版运行后不再追加。
- 与 TS 版**不要同时**对同一数据目录运行，避免两边同时写入。
- 静态资源响应已内置标准 HTTP 缓存语义（`/static/*` immutable 一年、HTML
  `no-cache` + ETag、`/api` `no-store`、`/uploads` `private`）并支持 gzip，
  任意 CDN 选"遵循源站缓存规则"即可接入，详见根 README 的「CDN 加速」一节。

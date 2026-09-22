# 简表（JianBiao / TypeSurvey）

## 项目介绍

一个开源的表单系统，只需简单配置，即可快速构建调查问卷、信息收集表单和数据统计工具。

- **表单管理** — 创建、编辑、分组管理表单字段
- **数据收集** — 通过链接分享表单，在线填写提交
- **数据查看** — 按条目分组浏览收集结果，支持搜索
- **导入导出** — 支持 XLSX 格式数据导入
- **文件上传** — 支持图片 / 文档类型的附件字段，提交后可在记录页预览或下载
- **多语言** — 内置中文 / 英文切换
- **暗色主题** — 基于 shadcn/ui 的暗色 / 亮色主题

本项目为全栈应用，前端基于 [React 19](https://react.dev/) + [shadcn/ui](https://ui.shadcn.com/)（[Radix UI](https://www.radix-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)），后端基于 [Go](https://go.dev/)（`net/http` + SQLite），常驻内存约 20 MB。

## 技术栈

- 前端：React 19 + react-router-dom 7 + shadcn/ui + lucide-react
- 后端：Go `net/http` + SQLite（首次启动自动迁移历史 JSONL 数据）
- 构建：rsbuild（前端）+ `go build`（服务端），详见 [server/README.md](server/README.md)

## 快速开始

### 克隆项目

```bash
git clone https://github.com/DavidCiallo/TypeSurvey
cd TypeSurvey
```

### 安装依赖

```bash
npm install -g bun
bun install
```

### 编辑环境变量

新建 `.env` 文件，内容可参考 `.env.example`；或执行

```bash
cp .env.example .env
```

### 启动开发环境

```bash
# 同时启动前后端
npm run dev
```

也可单独启动：

```bash
npm run dev       # 前端（rsbuild dev）
npm run serve     # 后端（cd server && go run .）
```

> 后端需要 Go 1.23+。历史版本的 Bun/TypeScript 服务端仍保留在 `server/app`、
> `server/modules` 等目录中作为参考，运行时不再需要。

## 目录结构

```
.
├── client/      # 前端（React + shadcn/ui + TypeScript）
├── server/      # 后端（Go，见 server/README.md）
├── shared/      # 前后端共享：路由表、DTO、Impl 类型
├── data/        # SQLite 数据 + uploads/ 上传目录（gitignored）
├── README.md
```

## 字段类型

支持以下表单字段类型：文本、邮箱、密码、数字、月份、日期、时间、颜色、文本域、下拉选择、多选、复选框、复选框组、**文件上传**。

## 构建与部署

```bash
npm run build     # 构建前端到 dist/
cd server && go build -o typesurvey . && ./typesurvey
```

构建产物部署模式：

- **服务器部署（推荐）**：Go 二进制直接托管 `dist/` 静态资源 + API，单文件部署，
  常驻内存约 20 MB；`DockerFile` / `docker-compose.yml` 即此模式
- **静态托管**：`dist/` 目录内容可部署至任何静态托管平台（需另行提供 API 服务）

本应用支持无头（Headless）部署，仅通过暴露服务端端口即可实现项目的全部功能。

## 许可证

MIT

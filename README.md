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

本项目为全栈应用，前端基于 [React 19](https://react.dev/) + [shadcn/ui](https://ui.shadcn.com/)（[Radix UI](https://www.radix-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)），后端基于 [Bun](https://bun.sh/)，使用 [TypeScript](https://www.typescriptlang.org/) 开发。

## 技术栈

- 前端：React 19 + react-router-dom 7 + shadcn/ui + lucide-react
- 后端：Bun 原生 `Bun.serve` + JSONL 文件存储
- 构建：rsbuild（前端）+ `bun build`（服务端 bundle）

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
npm run serve     # 后端（bun run server/app）
```

## 目录结构

```
.
├── client/      # 前端（React + shadcn/ui + TypeScript）
├── server/      # 后端（Bun + TypeScript）
├── shared/      # 前后端共享：路由表、DTO、Impl 类型
├── data/        # JSONL 数据存储 + uploads/ 上传目录（gitignored）
├── README.md
```

## 字段类型

支持以下表单字段类型：文本、邮箱、密码、数字、月份、日期、时间、颜色、文本域、下拉选择、多选、复选框、复选框组、**文件上传**。

## 构建与部署

```bash
npm run build
```

构建产物提供两种部署模式：

- **静态托管**：`dist/` 目录内容可部署至任何静态托管平台
- **服务器部署**：`dist/typesurvey.mjs` 用于部署在 Node.js / Bun 服务器上

本应用支持无头（Headless）部署，仅通过暴露服务端端口即可实现项目的全部功能。

## 许可证

MIT

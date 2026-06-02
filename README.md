# TypeForm

## 项目介绍

一个开源的表单系统，只需简单配置，即可快速构建调查问卷、信息收集表单和数据统计工具。

- **表单管理** — 创建、编辑、分组管理表单字段
- **数据收集** — 通过链接分享表单，在线填写提交
- **数据查看** — 按条目分组浏览收集结果，支持搜索
- **导入导出** — 支持 XLSX 格式数据导入

本项目为全栈应用，前端基于 [React](https://react.dev/) + [HeroUI](https://heroicons.com/)，后端基于 [Bun](https://bun.sh/)，使用 [TypeScript](https://www.typescriptlang.org/) 开发。

## 技术栈

- 前端：React + HeroUI
- 后端：Bun

## 快速开始

### 克隆项目

```bash
git clone https://github.com/DavidCiallo/TypeForm
cd TypeForm
```

### 安装依赖

```bash
npm install -g bun
bun install
```

### 编辑环境变量

新建.env文件，内容可参考.env.example；或执行

```bash
cp .env.example .env
```

### 启动开发环境

#### 启用前端

```bash
npm run dev
```

#### 单独启用后端

```bash
npm run serve
```

## 目录结构

```
.
├── client/      # 前端代码（React + HeroUI + TypeScript）
├── server/      # 后端代码（TypeScript）
├── shared/      # 共享代码（TypeScript）
├── README.md
```

## 构建与部署

```bash
npm run build
```

构建产物提供两种部署模式：
静态托管： dist/ 目录内容可部署至任何静态托管平台。
服务器部署： typesurvey.mjs 文件用于部署在 Node.js 服务器上。
本应用支持无头（Headless）部署，仅通过暴露服务端端口即可实现项目的全部功能。

## 许可证

MIT

# TypeForm

## 项目介绍

一个开源的表单系统，只需简单配置，即可构建属于你的调查问卷/收集表单/统计工具。

本项目为全栈应用，前端基于 [React](https://react.dev/) [HeroUI](https://heroicons.com/) ，后端基于 [Express](https://expressjs.com/)，使用[TypeScript](https://www.typescriptlang.org/) 进行开发，推荐使用 [Bun](https://bun.sh/)。

## 技术栈

- 前端：React + HeroUI
- 后端：Express
- 运行环境：Bun (nodejs)

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

#### 示例用

```bash
npm run all
```

#### 单独启用前端

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
├── server/      # 后端代码（Express + TypeScript）
├── shared/      # 共享代码（TypeScript）
├── README.md
```

## 构建与部署

```bash
npm run build
```

构建产物提供两种部署模式：
静态托管： dist/ 目录内容可部署至任何静态托管平台。
服务器部署： bundle.js 文件用于部署在 Node.js 服务器上。
本应用支持无头（Headless）部署，仅通过暴露服务端端口即可实现项目的全部功能。

## 许可证

MIT

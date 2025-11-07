# Quick-Form

## 项目介绍
本项目为全栈应用，前端基于 [React](https://react.dev/) [HeroUI](https://heroicons.com/) ，后端基于 [Express](https://expressjs.com/)，使用[TypeScript](https://www.typescriptlang.org/) 进行开发，推荐使用 [Bun](https://bun.sh/)。

## 技术栈

- 前端：React + HeroUI
- 后端：Express
- 运行环境：Bun (nodejs)

## 快速开始

### 克隆项目

```bash
git clone https://github.com/DcolorWei/Quick-Form
cd Quick-Form
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
但开发环境与部署环境不同，部署仅需单个端口，HTTP只需指定唯一变量SERVER_HTTP_PORT即可

### 启动开发环境

####
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
将在 dist 目录下生成前端静态打包文件，可部署到任何静态文件服务器中；同时生成bundle.mjs文件，可部署到任何支持Node.js的服务器中。


## 许可证

MIT
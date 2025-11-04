## 目标

帮助 AI 编码代理快速理解并在本仓库中高效工作。关注架构、构建/开发流程、项目约定与关键文件示例。

## 项目概述

Spectra 是一个自托管的在线工具集合，面向个人分享与协作，主要功能包括：

- 文件快传（上传并分享文件）
- 短链接（short URL）生成与管理
- Pastebin 风格的文本/代码片段分享
- 用户与会话管理（包含管理员账户、cookie-based 会话和可配置的 Turnstile 验证）

实现要点：后端用 Rust（axum + sqlx + SQLite）提供 API 和静态前端资源托管；前端使用 Preact + Vite 提供单页 Dashboard（位于 `web/dashboard/`）。数据与文件存储在 `service.data_dir` 指向的目录，数据库为 SQLite 文件（通常是 `data.db`）。

此项目适合需要轻量、可嵌入到系统服务（systemd unit）并带有离线静态资源打包能力的自托管部署场景。

## 快速概览（大局）

- 后端：Rust（workspace -> `backend/`），使用 axum 提供 HTTP 服务，sqlx+SQLite 作为数据库，配置来自 `config.toml`（默认路径 `./config.toml`）。入口：`backend/src/main.rs`。后端还包含 `service/*`（api/frontend/scheduled）与 `data.rs/types.rs`。
- 前端：基于 Preact + Vite，代码在 `web/`（dashboard 位于 `web/dashboard/`）。入口：`web/dashboard/main.tsx`。UI 组件在 `web/src/components` 与 `web/dashboard/components`。
- 构建/打包：前端通过 `pnpm`（见 `package.json`），脚本 `dev`/`build` 由 `scripts/dev.js` 和 `scripts/build.js` 协调。后端使用 Cargo（workspace 在仓库根 `Cargo.toml` 指向 `backend/`）。

## 关键开发命令

- 本地开发（按 README 中步骤执行）：
  - 创建 `.env`，例如：`DATABASE_URL=sqlite:./data.db`
  - 安装前端依赖：`pnpm install`
  - 安装 sqlx cli（用于迁移/初始化）：`cargo install sqlx-cli`
  - 初始化数据库（使用 sqlx）：`sqlx database setup`
  - 启动开发环境（前后端由脚本协同）：`pnpm dev`

- 单独运行后端：
  - 在仓库根或 `backend/` 运行：`cargo run --manifest-path backend/Cargo.toml`（可附加 `--release`）。

- 打包/生产构建：
  - 前端：`pnpm build`（或 `node scripts/build.js`），输出由脚本/`build.rs` 与 `rust-embed` 集成到后端。
  - 后端：`cargo build --release --manifest-path backend/Cargo.toml`

## 项目特定约定与易错点（务必注意）

- 配置与密钥：默认配置样例在 `backend/assets/config_example.toml`。后端强制要求 `service.cookie_key` 长度 >= 64；生成密钥可用后端的 `generate-cookie-key` 子命令或 `spectra generate-cookie-key`（参见 `backend/src/main.rs`）。
- 数据目录与 DB：`service.data_dir` 指向数据目录，数据库为 SQLite 文件（示例 `./data.db`）。后端在启动时会尝试创建该目录与文件。
- 定时任务：后端使用 `tokio-cron-scheduler` 与 `service.refresh_time`（cron 表达式）来注册定时任务，请勿随意更改字符串格式。
- 静态资源打包：后端使用 `rust-embed` 与 `build.rs` 将前端产物嵌入，可在 CI/打包流程中先运行前端构建再构建后端。
- Migrations：SQL 文件在 `migrations/`，配合 `sqlx` 使用；使用 `sqlx-cli` 执行迁移/初始化。
- Windows 构建问题：Rust 构建在 Windows 机器上可能找不到 `cmake`，可通过将 `CMAKE` 路径写入 `spectra/.cargo/config.toml` 解决（见 README）。

## 与代码相关的可举例定位（当需要修改或理解实现时，直接打开这些文件）

- 后端入口：`backend/src/main.rs`（初始化、配置与路由挂载）
- 服务路由：`backend/src/service/mod.rs`、`backend/src/service/frontend.rs`、`backend/src/service/api/*`
- 数据访问：`backend/src/data.rs`（数据库与文件访问封装）
- 类型/状态：`backend/src/types.rs`（AppState 等）
- 前端入口：`web/dashboard/main.tsx`（AccountCtx、页面 Tab 逻辑）
- 前端组件示例：`web/dashboard/components/AreaShortUrl.tsx`、`AreaFileShare.tsx`、`TopBar.tsx` 等（UI 与 API 调用模式一致）

## API 与交互约定（可从代码推断）

- 后端将前端路由与 API 分离：前端路由由 `make_frontend_router()` 提供，后端在 `main.rs` 将 `app.nest("/api", service::api::make_router())` 挂载 API。
- 前端通过统一的 HTTP 接口与后端交互，前端组件通常放在 `web/dashboard/components/*`，遵循通过 context（`AccountCtx`）驱动登录/共享列表刷新。

## 要求 AI 代理遵循的工作方式

- 当修改后端 API 或数据模型时，同时更新 `migrations/` 与前端调用处（`web/dashboard/components/*`）。
- 优先查阅并修改 `backend/src/types.rs` 与 `backend/src/data.rs` 以保证状态与 DB 一致性。
- 在添加新后端依赖或需要本地 DB 迁移时，说明要同时运行 `cargo install sqlx-cli` 与 `sqlx database setup`。

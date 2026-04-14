# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JSON Tools 是一个离线 JSON 桌面工具，基于 Tauri 2.x (Rust) + Vue 3 (TypeScript) 构建。提供 JSON 格式化（可折叠树视图）、压缩、转义/反转义，以及时间戳转换功能。UI 和文档均为中文。

## Rules

- **每次打包必须提升版本号**：执行 `npm run build` 或 `npx tauri build` 前，必须先更新 `src-tauri/tauri.conf.json` 中的 `version` 字段以及 `src-tauri/Cargo.toml` 中的 `version` 字段，确保两者保持一致。

## Build & Dev Commands

```bash
# 安装依赖（需要两步）
npm install              # 根目录（安装 @tauri-apps/cli）
cd src && npm install    # 前端依赖

# 开发模式（启动 Vite dev server + Tauri 应用）
npm run dev

# 构建完整桌面应用
npm run build

# 仅构建前端
cd src && npm run build   # vue-tsc 类型检查 + vite build

# 构建 NSIS 安装包（推荐使用项目脚本，会自动设置 GNU 工具链 PATH）
scripts/build.bat
# 或直接运行：
D:/cp/project/json-tools/scripts/build.bat
# 产物路径：src-tauri/target/release/bundle/nsis/JSON Tools_1.1.0_x64-setup.exe

## Toolchain

- **平台**: 仅限 Windows，使用 GNU Rust 工具链（x86_64-pc-windows-gnu）
- **链接器**: MSYS2/MinGW (`C:\msys64\mingw64\bin\gcc.exe`)
- **前端**: Vite 8.x + Vue 3.5.x + TypeScript 6.x
- **构建产物**: `src-tauri/target/release/bundle/nsis/JSON Tools_<version>_x64-setup.exe`

## Architecture

### 整体结构

```
src/              # 前端 (Vue 3 + Vite + TypeScript)
src-tauri/        # 后端 (Rust / Tauri 2.x — 仅作为 webview 壳)
scripts/          # Windows 构建脚本 (.bat)
docs/             # 需求文档
```

### 核心设计: Tauri 后端为零逻辑层

Rust 后端 (`src-tauri/src/lib.rs`) 不包含任何自定义 Tauri 命令 (`#[tauri::command]`)。所有业务逻辑完全在浏览器端 TypeScript 中运行：

- `src/src/json.ts` — JSON 处理核心（格式化/压缩/转义/反转义/语法高亮）
- `src/src/timestamp.ts` — 时间戳转换逻辑（支持秒/毫秒/纳秒精度，12 个时区）
- `src/src/types.ts` — `ToolDef` 接口定义 + 工具列表

Rust 层仅负责：创建窗口（初始隐藏 → 页面加载完成后显示）和 debug 日志插件。

### 前端组件

- `App.vue` — 根组件，工具标签页切换 + 主题切换（跟随系统 `prefers-color-scheme`）
- `JsonEditor.vue` — JSON 编辑器主组件（分栏布局、拖放文件、键盘快捷键、状态栏）
- `JsonTreeNode.vue` — 递归树节点组件（可折叠 JSON 树视图，通过 provide/inject 通信）
- `TimestampConverter.vue` — 时间戳转换器（双向转换、相对时间显示、实时当前时间）

### 前端约定

- Vue 3 Composition API (`<script setup lang="ts">`)
- 状态管理: 无 Vuex/Pinia，使用组件内 `ref()`/`computed()` + `provide()`/`inject()` 跨组件通信
- 样式: 单一全局 `style.css`，CSS 自定义属性实现 light/dark 主题切换（`data-theme` 属性）
- 无 ESLint/Prettier 配置；TypeScript 开启 `noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`

### 键盘快捷键 (JsonEditor)

- `Ctrl+Enter` 格式化 | `Ctrl+Shift+M` 压缩 | `Ctrl+Shift+E` 转义 | `Ctrl+Shift+U` 反转义 | `Ctrl+Shift+C` 复制结果

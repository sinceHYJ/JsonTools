# JSON Tools

轻量级 JSON 桌面工具，基于 Tauri 2.x + Vue 3 构建。

功能：格式化（支持折叠/展开）、压缩、转义、去转义。

## 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) (Tauri 编译所需)
- Windows 10/11

## 安装依赖

```bash
npm install
cd src && npm install
```

## 开发

```bash
npm run dev
```

## 构建

### 仅构建前端

```bash
cd src && npm run build
```

产物输出到 `src/dist/`。

### 构建桌面安装包

```bash
# 使用所有打包器（NSIS + WiX MSI）
npm run build

# 仅使用 NSIS 打包器（推荐，更稳定）
npx tauri build --bundles nsis
```

安装包输出路径：

| 格式 | 路径 |
|---|---|
| NSIS (.exe) | `src-tauri/target/release/bundle/nsis/JSON Tools_1.0.0_x64-setup.exe` |
| MSI (.msi) | `src-tauri/target/release/bundle/msi/JSON Tools_1.0.0_x64_en-US.msi` |

## 项目结构

```
json-tools/
├── src/                    # 前端 (Vue 3 + Vite)
│   └── src/
│       ├── components/
│       │   ├── JsonEditor.vue      # 主编辑器组件
│       │   └── JsonTreeNode.vue    # 递归树形节点组件
│       ├── style.css               # 全局样式（含主题）
│       ├── json.ts                 # JSON 处理逻辑
│       └── main.ts                 # 入口
├── src-tauri/              # 后端 (Rust / Tauri)
│   ├── src/
│   │   └── lib.rs
│   └── tauri.conf.json
├── package.json            # 根 package.json (Tauri CLI)
└── src/package.json        # 前端依赖
```

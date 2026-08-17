# 新增一个插件子项目（CONTRIBUTING）

> dsh-plugs 是一个**集合仓库**：每个插件是仓库里的一个独立子目录。新增插件只需照此规范执行。

## 目录规范

```
<plugin-name>/
├── README.md          # 必填：功能 / 安装 / 开发 / 架构 / 致谢
├── QUICKSTART.md      # 推荐：安装与开发速查
├── LICENSE            # 必填：MIT（含你的版权行）
├── package.json       # 必填：见下方字段规范
├── src/               # 源码（TypeScript）
├── scripts/           # 构建 / 调试脚本（esbuild 等）
├── test/              # 回归测试（jsdom / node）
└── dist/              # 构建产物（client.js 入库，支持免构建安装）
```

## package.json 字段规范

```jsonc
{
  "name": "dsh-<plugin>",            // 全局唯一，桌面版靠它做符号链接名
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "main": "lib/index.js",            // 插件元数据入口（Node 侧）
  "exports": {
    ".": "./lib/index.js",
    "./client": "./dist/client.js",  // ★ 客户端 bundle；只 import @deepseek-ai/*/client 与 react
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "...",                  // esbuild 两步构建 → dist/client.js
    "typecheck": "tsc --noEmit",
    "test": "..."
  }
}
```

## 客户端 bundle 铁律

- 只 import `@deepseek-ai/*/client` 公开入口与 react，**构建时全部 external**
- 原因：模块表双实例会导致插槽对不上、设置行不渲染
- 不依赖任何 CSS-module 哈希类名；需要锚点就用运行时稳定的 DOM 属性（如 `[data-shell-overlay]`）

## 完成后登记

1. 在根 [README.md](README.md) 的「插件目录」表加一行
2. 如果插件有典型工作流，补进根 QUICKSTART 的示例
3. 提交信息建议：`feat: 新增 <plugin> 插件（一句话说明）`

## 提交到本仓库

```bash
# 方案 A：直接作为子目录提交（推荐，集合仓库形态）
mkdir <plugin> && cp -R /path/to/your/plugin/* <plugin>/
git add <plugin>
git commit -m "feat: 新增 <plugin> 插件（一句话说明）"

# 方案 B：保留插件自身历史（subtree 导入）
git subtree add --prefix=<plugin> <plugin-git-url> main
```

> 注：桌面版 profile 若已符号链接旧路径，导入后把链接目标改为仓库内路径即可。

## 发布到 npm

1. 确认 `package.json` 满足：`license: "MIT"`、`files` 含 `lib`/`dist`/`README.md`、`exports["./client"]` 指向已构建产物
2. 本地验证：`npm install && npm run build && npm test` 全绿
3. 登录并发布：
   ```sh
   npm login          # 首次需要（在本人终端执行）
   npm publish        # 包名需先在 registry 未被占用（npm view <name> 检查）
   ```
4. 回主 [README.md](README.md) 更新「从 npm 安装」表格的发布状态
5. 之后每次改动发布新版本：`npm version patch && npm publish`（记得同步更新仓库内 version 与 README 表格）
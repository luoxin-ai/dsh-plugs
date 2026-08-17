# dsh-frosted-glass 快速上手（QUICKSTART）

> **毛玻璃皮肤 for DeepSeek Harness** — 真正的 `backdrop-filter` 模糊 + 半透明表面 token + 自定义壁纸。
> 本插件隶属于 [dsh-plugs](https://github.com/luoxin-ai/dsh-plugs) 合集。

## 60 秒安装

### 桌面版（无 pnpm 环境）

```bash
npm install --cache ./.npm-cache
npm run build

# 安装进桌面版 profile（符号链接 + bundles 登记）
PROFILE="$HOME/Library/Application Support/dsh-desktop/harness/profiles/web"
mkdir -p "$PROFILE/node_modules"
ln -sfn "$(pwd)" "$PROFILE/node_modules/dsh-frosted-glass"
# 在 $PROFILE/package.json 的 dsh.profile.bundles 追加 "dsh-frosted-glass"
```

**重启桌面版**。入口：**设置 → 通用设置 → 毛玻璃**。

### CLI 环境（有 pnpm）

```bash
npm install
npm run build
dsh plugin --profile web add .
```

## 功能一览

| 功能 | 说明 |
| --- | --- |
| 全界面玻璃 | 页面底层、面板、侧栏、聊天气泡、菜单、代码块——所有表面 token 变为半透明 |
| 真模糊 | `backdrop-filter: blur()` 作用于外壳三个内容列；浮层层（`data-shell-overlay`）排除，避免 containing-block 副作用 |
| 实时调节 | 设置 → 通用设置 → 毛玻璃：开关 / 透明度滑块（3%–95%）/ 模糊强度（0–30px）/ 背景图（上传自动压缩或 URL） |
| 偏好持久化 | localStorage（第三方视觉偏好不进 Host settings wire） |

## 开发

```bash
npm run build      # esbuild 两步构建 → dist/client.js
npm run typecheck  # tsc --noEmit
npm test           # jsdom 回归测试
```

改 `src/` 后重新 `npm run build`，再重启 DSH（bundle 哈希在启动时写入引导图，桌面版没有 dev watcher）。

## 卸载

- 从 `$PROFILE/package.json` 的 `dsh.profile.bundles` 移除 `dsh-frosted-glass`
- 删除 `$PROFILE/node_modules/dsh-frosted-glass` 符号链接
- 重启桌面版

> 完整说明（功能 / 架构 / 关键技术决策 / 致谢）见 [README.md](README.md)。
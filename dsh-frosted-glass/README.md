# dsh-frosted-glass

> 所属合集：[dsh-plugs](https://github.com/luoxin-ai/dsh-plugs) ｜ 安装速查：[QUICKSTART.md](QUICKSTART.md)

**毛玻璃皮肤 for DeepSeek Harness** — 真正的 `backdrop-filter` 模糊 + 半透明表面 token + 自定义壁纸。

Frosted-glass skin for the DSH Web UI (desktop and `dsh web`): real backdrop blur over translucent surface tokens, with a full-page wallpaper.

## 功能

- **全界面玻璃**：页面底层、面板、侧栏、聊天气泡、菜单、代码块——所有表面 token 变为半透明
- **真模糊**：`backdrop-filter: blur()` 作用于外壳的三个内容列（侧栏 / 对话区 / 详情列），浮层层（`data-shell-overlay`）明确排除，避免 containing-block 副作用弄坏设置对话框
- **实时调节**：设置 → 通用设置 → 毛玻璃：开关、透明度滑块（3%–95%）、模糊强度滑块（0–30px）、背景图（上传自动压缩 / URL）
- **偏好持久化**：localStorage（第三方视觉偏好不进 Host settings wire，这是官方边界）

## 安装

### 桌面版（无 pnpm 环境）

```sh
# 1. 构建
npm install --cache ./.npm-cache
npm run build

# 2. 安装进桌面版 profile（符号链接 + bundles 登记）
PROFILE="$HOME/Library/Application Support/dsh-desktop/harness/profiles/web"
mkdir -p "$PROFILE/node_modules"
ln -sfn "$PWD" "$PROFILE/node_modules/dsh-frosted-glass"
# 3. 在 $PROFILE/package.json 的 dsh.profile.bundles 追加 "dsh-frosted-glass"
```

重启桌面版。入口：**设置 → 通用设置 → 毛玻璃**。

### CLI 环境（有 pnpm）

```sh
npm install
npm run build
dsh plugin --profile web add .
```

## 开发

```sh
npm run build      # esbuild 两步构建 → dist/client.js
npm run typecheck  # tsc --noEmit
npm test           # jsdom 回归测试（开关往返 / 透明度 / 重入守卫 / 延迟挂载）
```

改 `src/` 后重新 `npm run build`，再重启 DSH（bundle 哈希在启动时写入引导图，桌面版没有 dev watcher）。

## 架构

```
src/core.ts      纯函数引擎：GlassConfig → ThemeRuntime token 覆盖表（不碰 DOM，可单测）
src/storage.ts   localStorage 读写 + 数值校验
src/dom.ts       唯一碰 DOM 的模块：壁纸层、body base、按 [data-shell-overlay] 锚点定位内容列并注入 blur
src/locale.ts    zh/en 字典
src/settings.tsx 设置行组件（开关 / 透明度 / 模糊度 / 背景图）
src/plugin.ts    装配入口（exports.apply / exports.inject）
scripts/build.mjs esbuild 打包 → 嵌入 window.__ModuleLoader__.load 包装（与官方 ui-* 包同构）
```

### 关键技术决策

1. **`ctx.theme.overrideTokens()` 而非 `theme.register()`**：皮肤需要实时滑块调节与卸载恢复语义，token 覆盖层正是为此设计；`register()` 是"可选主题"语义，不适合一键皮肤。
2. **blur 的落点**：`backdrop-filter` 会让元素成为 fixed/absolute 后代的 containing block——早期玻璃皮肤（`dsh-liquid-glass`）因此弃用 blur。本插件通过运行时锚点 `[data-shell-overlay]`（ui-layout AppFrame 设置，版本稳定）取到 frame，只对三个内容列加 blur，浮层层排除。不依赖任何 CSS-module 哈希类名。
3. **壁纸层是毛玻璃的物理前提**：没有壁纸时 body 保留设计 token 底色；有壁纸时 body 透明、壁纸以 `z-index:-1` 垫底，blur 才有东西可糊。
4. **`theme/change` 重放**：ThemeRuntime 重建会丢弃覆盖层，插件监听该事件重放（liquid-glass 验证过的坑）。
5. **`exports["./client"]` 子路径**：客户端 bundle 只 import `@deepseek-ai/*/client` 与 react，esbuild 全部 external——避免模块表双实例导致插槽对不上。

## 致谢

- 结构参考 [Ultronen/dsh-liquid-glass](https://github.com/Ultronen/dsh-liquid-glass)（MIT）：token 覆盖层模式、设置行注册模式、壁纸压缩方案。
- 表面 token 清单取自 rc.6 `design-platform.css`。

## License

MIT

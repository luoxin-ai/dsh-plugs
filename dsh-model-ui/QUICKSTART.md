# dsh-model-ui 快速上手（QUICKSTART）

> **拆分模型选择与推理档位** — 原生模型下拉 + Claude Code `/effort` 风格档位滑块，MAX/ultra 档位带均衡器音浪与滑块轨道联动波浪。
> 本插件隶属于 [dsh-plugs](https://github.com/luoxin-ai/dsh-plugs) 合集。

## 60 秒安装

### 桌面版（无 pnpm 环境）

```bash
npm install --cache ./.npm-cache
npm run build

# 安装进桌面版 profile（符号链接 + bundles 登记）
PROFILE="$HOME/Library/Application Support/dsh-desktop/harness/profiles/web"
mkdir -p "$PROFILE/node_modules"
ln -sfn "$(pwd)" "$PROFILE/node_modules/dsh-model-ui"
# 在 $PROFILE/package.json 的 dsh.profile.bundles 追加 "dsh-model-ui"
```

**重启桌面版**。输入栏右侧原模型座位即变为：`[模型 ▾] [档位 ⚡]` 两个独立控件。

### CLI 环境（有 pnpm）

```bash
npm install
npm run build
dsh plugin --profile web add .
```

> `cordis.patch.yml` 已含：禁用原生 `ui-model-selection` 行 + 注册 `model-ui`，装完即生效，无需手工改配。

## 功能一览

| 功能 | 说明 |
| --- | --- |
| 模型下拉 | 提供方分组列表、当前模型高亮、加载失败行；切换提交 `{provider, model}`，默认档由宿主适配器决定（与原生语义一致） |
| 档位控制 | `/effort` 风格——点胶囊弹横向滑块（离散档位 + 释放吸附）、档位名 + 描述、「使用模型默认」一键复位；模型无推理档位时不显示 |
| 双浪效果 | 最高档（MAX/ultra）时胶囊内 4 根均衡器音浪条跳动，弹出面板滑块轨道同步变成流动波浪 |

## 开发

```bash
npm run build      # esbuild 两步构建 → dist/client.js
npm run typecheck  # tsc --noEmit
npm test           # jsdom 回归测试
```

## 卸载

- 从 `$PROFILE/package.json` 的 `dsh.profile.bundles` 移除 `dsh-model-ui`
- 删除 `$PROFILE/node_modules/dsh-model-ui` 符号链接
- 重启桌面版

> 完整说明（功能 / 架构 / 设计决策 / 版权声明）见 [README.md](README.md)。
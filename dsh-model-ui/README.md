# dsh-model-ui

> 所属合集：[dsh-plugs](https://github.com/luoxin-ai/dsh-plugs) ｜ 安装速查：[QUICKSTART.md](QUICKSTART.md)

**拆分模型选择与推理档位**（方案四「双浪」）：原生模型下拉 + Claude /effort 风格档位滑块，MAX/ultra 档位带均衡器音浪与滑块轨道联动波浪。

Split model & effort seat for DSH: a native-style model dropdown plus an independent effort control with a discrete snap slider; at the highest effort the chip shows equalizer bars and the slider track shows a flowing wave.

## 功能

- **拆分成两个独立控件**：`[模型 ▾] [档位 ⚡]` 并排（输入栏右侧原座位位置）
- **模型下拉**：提供方分组列表、当前模型高亮、加载失败行；切换模型提交 `{provider, model}`（默认档由宿主适配器决定，与原生语义一致）
- **档位控制**：Claude Code `/effort` 风格——点胶囊弹横向滑块（离散档位 + 释放吸附）、档位名 + 描述、「使用模型默认」一键复位；模型无推理档位时不显示
- **波动效果（方案四「双浪」）**：当前档位为最高档（MAX/ultra）时，胶囊内 4 根均衡器音浪条跳动，弹出的面板里滑块轨道同时变成流动波浪

## 架构

- 复用官方数据层：`ModelDirectoryResolver` / `ModelDirectory` 已 **vendor** 进 `src/directory.ts`（原因：本插件通过 patch 禁用了原生 `ui-model-selection` 行，而客户端模块表只服务已启用的 roster 行——运行时 require 被禁用包的 client bundle 会失败；vendor 后自包含）。行为 1:1 移植（惰性按会话目录、连接重置重拉、适配器/设置变更刷新、composer 路由阻塞）。
- 座位注册进 `conversation.input.model` 插槽（原生同款注入面：`{available, directory, load, select}`）。
- 保留 `/model` popupSelect 命令（同款 options/onSelect 语义）。

```
src/directory.ts  vendored ModelDirectory + ModelDirectoryResolver（官方 MIT 代码）
src/seat.tsx      拆分座位：模型下拉 + 档位胶囊 + 弹出面板（滑块/吸附/重置）
src/styles.ts     注入样式（dmu- 前缀 + 设计 token；均衡器/波浪动画）
src/locale.ts     zh/en 字典（与原生键对齐）
src/plugin.ts     装配：挂 resolver、/model 命令、座位注册
```

## 安装

```sh
npm install --cache ./.npm-cache
npm run build
npm test
```

桌面版（无 pnpm）：`ln -sfn "$PWD" "$HOME/Library/Application Support/dsh-desktop/harness/profiles/web/node_modules/dsh-model-ui"`，
并把 `dsh-model-ui` 追加到该 profile 的 `package.json` 的 `dsh.profile.bundles`。重启桌面版。

`cordis.patch.yml` 已包含：禁用 `ui-model-selection` + 注册 `model-ui`。

## 设计决策记录

1. **禁用原生行而非共存**：`conversation.input.model` 插槽单占用者，两个座位会重复渲染。
2. **滑块提交用原生 `change` 事件**：React 的 `onChange` 对 range 映射到连续的 `input` 事件（拖动中每次触发）；原生 `change` 只在释放时触发——正是"释放吸附"语义。
3. **最高档判定**：`effectiveEffort === efforts[efforts.length - 1].id`（档位数组按强度升序）。
4. **切模型不带 effort**：原生座位语义就是只提交 `{provider, model}`，默认档由宿主决定。

## License

MIT（`src/directory.ts` 版权归 DeepSeek Harness 项目，MIT 许可，见文件头注释）。

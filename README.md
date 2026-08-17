# dsh-plugs — DeepSeek Harness 插件合集

> 面向 **DSH 桌面版** 与 `dsh web` 的插件集合仓库。每个子目录是一个**独立、自包含**的插件，可单独安装、单独维护、单独升级。

A curated collection of plugins (skins / tools) for the DeepSeek Harness Web UI — desktop and CLI.

## 插件目录

| 子项目 | 版本 | 类型 | 一句话说明 | 快速开始 |
| --- | --- | --- | --- | --- |
| [dsh-frosted-glass](dsh-frosted-glass/) | 0.1.0 | 可视化皮肤 | 毛玻璃皮肤：真实 `backdrop-filter` 模糊 + 半透明表面 + 自定义壁纸，设置面板实时调节 | [QUICKSTART](dsh-frosted-glass/QUICKSTART.md) |
| [dsh-model-ui](dsh-model-ui/) | 0.1.0 | 输入区增强 | 拆分模型选择与推理档位：模型下拉 + Claude `/effort` 风格档位滑块（吸附），MAX/ultra 档位双浪动效 | [QUICKSTART](dsh-model-ui/QUICKSTART.md) |

> 更多插件持续收集中——新增插件请遵循 [CONTRIBUTING.md](CONTRIBUTING.md) 规范。

## 快速开始

30 秒上手请见 [QUICKSTART.md](QUICKSTART.md)。核心就两步：

1. 选择一个子项目（如 `dsh-frosted-glass`）
2. 按该子项目的 QUICKSTART 安装进你的 DSH 环境（桌面版走符号链接，CLI 走 `dsh plugin`）

### 从 npm 安装（已发布的插件）

| 包名 | 发布状态 |
| --- | --- |
| `dsh-frosted-glass` | 待发布（`npm login` 后执行 `npm publish` 即可） |
| `dsh-model-ui` | 待发布（同上） |

发布后即可在 DSH profile 目录内安装：

```sh
# 在 DSH profile 目录内安装（npm registry 方式）
npm install dsh-frosted-glass
# 再按插件的 QUICKSTART 完成 bundles 登记即可
```

## 效果预览

| 插件 | 截图 |
| --- | --- |
| dsh-frosted-glass | [主界面](dsh-frosted-glass/docs/screenshots/1-main.png) · [设置面板](dsh-frosted-glass/docs/screenshots/2-settings.png) · [毛玻璃开/关对比](dsh-frosted-glass/docs/screenshots/4-glass-on-again.png) |

> 截图由各插件自带的 CDP 脚本生成（详见 [dsh-frosted-glass/README.md](dsh-frosted-glass/README.md) 的「效果预览」）——首次克隆仓库时截图未入库，运行脚本生成后提交即可。

## 仓库结构

```
dsh-plugs/
├── README.md                 ← 本文件：集合说明 + 插件目录索引
├── QUICKSTART.md             ← 总快速上手（克隆 → 选插件 → 安装）
├── CONTRIBUTING.md           ← 新增插件的目录规范与模板
├── LICENSE                   ← 本仓库 MIT 许可证
└── <plugin>/
    ├── README.md             ← 插件自身说明（功能 / 架构 / 踩坑）
    ├── QUICKSTART.md         ← 插件的安装 / 开发速查
    ├── LICENSE               ← 插件自身 MIT 许可证
    ├── package.json          ← 插件清单（exports["./client"] 等）
    ├── src/                  ← 源码（TypeScript）
    ├── scripts/              ← 构建 / 调试脚本
    └── test/                 ← 回归测试
```

## 插件质量要求

每个子项目必须满足：

- ✅ 独立自包含：不依赖仓库内其他子项目，clone 后即可单独构建安装
- ✅ `package.json` 声明 `exports["./client"]`，客户端 bundle 只 import `@deepseek-ai/*/client` 公开入口（避免模块表双实例）
- ✅ 自带 README（功能 / 安装 / 开发 / 架构）与 LICENSE
- ✅ 有回归测试（`npm test`）与构建脚本（`npm run build`）
- ✅ 不引入任何 DeepSeek 专有源码，仅通过官方公开 API 与设计 token 扩展

## License

[MIT](LICENSE) © 2026 luoxin-ai。每个子项目保留各自的版权声明（详见其目录内 LICENSE）。
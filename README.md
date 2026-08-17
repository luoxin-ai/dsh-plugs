# dsh-plugs — DeepSeek Harness 插件合集

> 面向 **DSH 桌面版** 与 `dsh web` 的插件集合仓库。每个子目录是一个**独立、自包含**的插件，可单独安装、单独维护、单独升级。

A curated collection of plugins (skins / tools) for the DeepSeek Harness Web UI — desktop and CLI.

## 插件目录

| 子项目 | 版本 | 类型 | 一句话说明 | 快速开始 |
| --- | --- | --- | --- | --- |
| [dsh-frosted-glass](dsh-frosted-glass/) | 0.1.0 | 可视化皮肤 | 毛玻璃皮肤：真实 `backdrop-filter` 模糊 + 半透明表面 + 自定义壁纸，设置面板实时调节 | [QUICKSTART](dsh-frosted-glass/QUICKSTART.md) |

> 更多插件持续收集中——新增插件请遵循 [CONTRIBUTING.md](CONTRIBUTING.md) 规范。

## 快速开始

30 秒上手请见 [QUICKSTART.md](QUICKSTART.md)。核心就两步：

1. 选择一个子项目（如 `dsh-frosted-glass`）
2. 按该子项目的 QUICKSTART 安装进你的 DSH 环境（桌面版走符号链接，CLI 走 `dsh plugin`）

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
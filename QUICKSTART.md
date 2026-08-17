# dsh-plugs 快速上手（QUICKSTART）

> 目标：克隆仓库 → 选一个插件 → 装进你的 DSH（桌面版或 CLI）→ 开始使用。

## 1. 克隆

```bash
git clone git@github.com:luoxin-ai/dsh-plugs.git
cd dsh-plugs
```

## 2. 选择插件

查看 [README.md](README.md) 的插件目录表，进入对应子目录（如 `dsh-frosted-glass`）。

## 3. 安装插件

每个插件支持**两种环境**，进入插件子目录查看它的 `QUICKSTART.md` 获取完整步骤。以 dsh-frosted-glass 为例：

### 桌面版（无 pnpm）

```bash
cd dsh-frosted-glass
npm install --cache ./.npm-cache
npm run build

# 符号链接进桌面版 profile
PROFILE="$HOME/Library/Application Support/dsh-desktop/harness/profiles/web"
mkdir -p "$PROFILE/node_modules"
ln -sfn "$PWD" "$PROFILE/node_modules/dsh-frosted-glass"
# 再在 $PROFILE/package.json 的 dsh.profile.bundles 追加 "dsh-frosted-glass"
```

重启桌面版。入口：**设置 → 通用设置 → 毛玻璃**。

### CLI 环境（有 pnpm）

```bash
cd dsh-frosted-glass
npm install
npm run build
dsh plugin --profile web add .
```

## 4. 验证

- 桌面版：重启 App，设置 → 通用设置 中出现「毛玻璃」卡片
- CLI：`dsh plugin --profile web list` 应能看到该插件

## 5. 卸载 / 更新

- **更新**：`git pull` 后重新 `npm run build` 并重启 DSH（bundle 哈希在启动时写入引导图）
- **卸载**：从 profile 的 `dsh.profile.bundles` 移除该名字，删掉 `node_modules` 下的符号链接即可

## 常见问题

| 症状 | 处理 |
| --- | --- |
| 装完没效果 | 确认已重启 DSH；bundle 哈希在启动时固化，必须重启 |
| 设置面板里没有插件项 | 检查 bundles 登记是否生效（`package.json` 的 `dsh.profile.bundles`） |
| 想装到其他 profile | 把命令里的 `web` 换成目标 profile 名即可 |
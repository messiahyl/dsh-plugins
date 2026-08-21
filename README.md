# dsh-plugins

DSH（DeepSeek Harness）插件总仓库：**多插件 monorepo 开发 + 插件目录管理 + 插件安装源**。

| 定位 | 说明 | 入口 |
|------|------|------|
| 📦 多插件开发 | `packages/*` 一个插件一个目录，pnpm workspace 统一管理 | [`docs/02-plugin-dev-guide.md`](docs/02-plugin-dev-guide.md) |
| 🗂️ 插件管理 | 自有插件 + 第三方收录统一登记，生成安装源目录 | [`registry/README.md`](registry/README.md) |
| 🔌 插件安装源 | 三通道：registry.json / npm / GitHub 镜像 | [`docs/04-install-source.md`](docs/04-install-source.md) |

## 仓库结构

```
dsh-plugins/
├── packages/            # 插件源码（monorepo）
│   ├── _template/       # 插件脚手架模板（scripts/create-plugin.mjs 使用）
│   └── dsh-xxx/         # 实际插件（新建见下）
├── registry/            # 插件安装源
│   ├── registry.json    # 安装源注册表（脚本生成，勿手改）
│   └── third-party/     # 第三方插件收录（人工维护）
├── scripts/             # 仓库级工具
│   ├── create-plugin.mjs      # 新建插件脚手架
│   ├── build-registry.mjs     # 生成安装源目录
│   ├── install-to-profile.mjs # 安装到本地 DSH profile（link 调试）
│   ├── publish.mjs            # 发布（npm + registry）
│   └── sync-github.sh         # Gitee → GitHub 镜像（安装源通道）
├── docs/                # 文档
│   ├── 01-architecture.md    # DSH 插件机制原理
│   ├── 02-plugin-dev-guide.md# 插件开发指南
│   ├── 03-release-flow.md    # 发布流程
│   ├── 04-install-source.md  # 安装源三通道说明
│   └── 05-catalog-schema.md  # registry.json 格式定义
└── skills/              # 配套 AI 技能（复制到 ~/.agents/skills/ 生效）
    ├── dsh-plugin-dev/       # 插件开发
    ├── dsh-plugin-release/   # 插件发布
    └── dsh-catalog/          # 安装源目录维护
```

## 快速开始

```sh
# 新建一个插件（自动复制模板并改名）
node scripts/create-plugin.mjs dsh-my-tool

# 装依赖、构建、类型检查
cd packages/dsh-my-tool && pnpm install && pnpm run build && pnpm run typecheck

# 本地调试：link 安装到 web profile，重启 dsh web 生效
node scripts/install-to-profile.mjs dsh-my-tool

# 发布（npm + 刷新安装源目录）
node scripts/publish.mjs dsh-my-tool patch

# 同步 GitHub 安装源通道
bash scripts/sync-github.sh
```

## 安装本仓库的插件

```sh
# npm 通道（已发布）
dsh plugin --profile web add dsh-my-tool

# GitHub 通道（已同步镜像）
dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/dsh-my-tool

# 安装源目录（供 workshop 风格工具读取）
# https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json
```

## 配套 skill（AI 开发助手）

`skills/` 下三个技能用于指导 AI 在此仓库工作，复制到 `~/.agents/skills/` 后
会话中自动可用：

```sh
cp -r skills/dsh-plugin-dev skills/dsh-plugin-release skills/dsh-catalog ~/.agents/skills/
```

| Skill | 用途 |
|-------|------|
| `dsh-plugin-dev` | 新建/修改/调试 DSH 插件（双面插件、agent 工具、GUI 面板） |
| `dsh-plugin-release` | 版本管理、npm/GitHub 发布、安装源同步 |
| `dsh-catalog` | 维护安装源目录、收录第三方插件 |

## 文档索引

- [DSH 插件机制原理](docs/01-architecture.md) —— profile、bundle patch、双面插件模型
- [插件开发指南](docs/02-plugin-dev-guide.md) —— 从脚手架到发布前检查清单
- [发布流程](docs/03-release-flow.md) —— npm / GitHub / registry 三通道
- [安装源说明](docs/04-install-source.md) —— 如何把本仓库变成安装源
- [registry 格式定义](docs/05-catalog-schema.md) —— 目录条目字段与兼容性

## 关联仓库

- [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) —— 用户全家桶 monorepo（packages/ 18 包 + 聚合包），本仓库的双面插件参考实现
- [dsh-workshop](https://github.com/loguhan/dsh-workshop) —— 创意工坊（registry 消费端）
- [dsh-recommend](https://github.com/zp-home/dsh-recommend) —— 社区目录数据源

## License

Apache-2.0

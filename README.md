# dsh-plugins

DSH（DeepSeek Harness）插件总仓库：**多插件 monorepo 开发 + 插件目录管理 + 插件安装源**。

| 定位 | 说明 | 入口 |
|------|------|------|
| 📦 多插件开发 | `packages/*` 一个插件一个目录，pnpm workspace 统一管理 | [`docs/02-plugin-dev-guide.md`](docs/02-plugin-dev-guide.md) |
| 🗂️ 插件管理 | 自有插件 + 第三方收录统一登记，生成安装源目录 | [`registry/README.md`](registry/README.md) |
| 🔌 插件安装源 | 四通道：本地归档 / npm / GitHub 镜像 / 索引 | [`docs/04-install-source.md`](docs/04-install-source.md) |

## 仓库结构

```
dsh-plugins/
├── packages/            # 插件源码（monorepo）
│   ├── _template/       # 插件脚手架模板（scripts/create-plugin.mjs 使用）
│   └── dsh-xxx/         # 实际插件（新建见下）
├── registry/            # 插件安装源（索引 + 安装包归档）
│   ├── registry.json    # 安装源注册表（脚本生成，勿手改）
│   ├── packages/        # 安装包归档 .tgz（pnpm pack 产物，国内网络友好）
│   └── third-party/     # 第三方插件收录（人工维护）
├── scripts/             # 仓库级工具
│   ├── create-plugin.mjs      # 新建插件脚手架
│   ├── build-registry.mjs     # 生成安装源目录（含 sha256 校验和）
│   ├── pack.mjs               # 打包安装包归档（registry/packages/）
│   ├── install-from-registry.mjs # 安装器：按索引选通道（local→npm→github）+ 校验
│   ├── install-to-profile.mjs # link 安装/卸载到本地 DSH profile
│   ├── publish.mjs            # 单包发布（密钥扫描 + npm + 归档 + registry）
│   ├── publish-all.mjs        # 一键全量发布
│   └── sync-github.sh         # Gitee → GitHub 镜像（安装源通道）
├── docs/                # 文档
│   ├── 01-architecture.md    # DSH 插件机制原理
│   ├── 02-plugin-dev-guide.md# 插件开发指南
│   ├── 03-release-flow.md    # 发布流程
│   ├── 04-install-source.md  # 安装源四通道说明
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

# 发布（密钥扫描 + npm + 打包归档 + 刷新安装源目录）
node scripts/publish.mjs dsh-my-tool patch

# 一键全量发布全部插件（跳过 npm 用 --no-npm）
node scripts/publish-all.mjs

# 仅打包安装包归档（不发布 npm）
node scripts/pack.mjs dsh-my-tool

# 从安装源安装（auto 选通道：local 归档 → npm → github）
node scripts/install-from-registry.mjs dsh-my-tool

# 同步 GitHub 安装源通道
bash scripts/sync-github.sh
```

## 安装本仓库的插件

```sh
# 方式一：本仓库安装器（读索引 auto 选通道，local 优先 + sha256 校验）
node scripts/install-from-registry.mjs dsh-my-tool

# 方式二：本地归档（国内网络，下载 registry/packages/ 的 tgz 后安装）
dsh plugin --profile web add file:./registry/packages/dsh-my-tool-0.1.0.tgz

# 方式三：npm 通道（已发布）
dsh plugin --profile web add dsh-my-tool

# 方式四：GitHub 通道（已同步镜像）
dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/dsh-my-tool

# 安装源目录（索引，含 install.local 通道与 checksum）
# https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json
```

## 配套 skill（AI 开发助手）

`skills/` 下三个技能用于指导 AI 在此仓库工作。**技能不会自动生效**，需安装到你的 agent 环境：

```sh
# 方式一：复制到用户级技能目录（Claude Code / 兼容 agent 的 ~/.agents/skills）
cp -r skills/dsh-plugin-dev skills/dsh-plugin-release skills/dsh-catalog ~/.agents/skills/

# 方式二：用 skill-installer / find-skill 等技能管理工具按仓库路径安装
```

| Skill | 用途 |
|-------|------|
| `dsh-plugin-dev` | 新建/修改/调试 DSH 插件（双面插件、agent 工具、GUI 面板） |
| `dsh-plugin-release` | 版本管理、npm/GitHub 发布、安装源同步 |
| `dsh-catalog` | 维护安装源目录、收录第三方插件 |

> 说明：skills 为操作要点 + 检查清单（指针式），权威口径以 `docs/` 为准。

## 文档索引

- [DSH 插件机制原理](docs/01-architecture.md) —— profile、bundle patch、双面插件模型
- [插件开发指南](docs/02-plugin-dev-guide.md) —— 从脚手架到发布前检查清单
- [发布流程](docs/03-release-flow.md) —— 本地归档 / npm / GitHub / 索引 四通道
- [安装源说明](docs/04-install-source.md) —— 如何把本仓库变成安装源
- [registry 格式定义](docs/05-catalog-schema.md) —— 目录条目字段与兼容性
- [端到端示例](docs/06-quickstart.md) —— dsh-hello 从建插件到三通道安装
- [故障排查](docs/08-troubleshooting.md) —— 常见失败现象与处置

## 关联仓库

- [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) —— 用户全家桶 monorepo（packages/ 18 包 + 聚合包），本仓库的双面插件参考实现
- [dsh-workshop](https://github.com/loguhan/dsh-workshop) —— 创意工坊（registry 消费端）
- [dsh-recommend](https://github.com/zp-home/dsh-recommend) —— 社区目录数据源

## License

Apache-2.0

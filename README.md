# dsh-plugins

DSH（DeepSeek Harness）插件总仓库：**多插件 monorepo 开发 + 插件目录管理 + 插件安装源**。

| 定位 | 说明 | 入口 |
|------|------|------|
| 📦 多插件开发 | `packages/*` 一个插件一个目录，pnpm workspace 统一管理 | [`docs/02-plugin-dev-guide.md`](docs/02-plugin-dev-guide.md) |
| 🗂️ 插件管理 | 自有插件 + 第三方收录统一登记，生成安装源目录 | [`registry/README.md`](registry/README.md) |
| 🔌 插件安装源 | 四通道：本地归档 / npm / GitHub 镜像 / 索引 | [`docs/04-install-source.md`](docs/04-install-source.md) |

---

## 🧭 给 Agent / 新人的快速地图

**这是什么**：DSH 插件的"开发 + 目录 + 分发"一体化仓库。所有插件源码在 `packages/`，安装源（索引/归档/收录）全部由脚本从源码生成，**源码是唯一事实源**。

**我该先读什么**（按角色）：

| 角色 | 先读 |
|------|------|
| Agent（AI 协作） | `AGENTS.md`（协作规则与红线）→ `docs/06-quickstart.md`（端到端示例） |
| 想装插件的用户 | 本 README「使用：安装插件」→ `docs/04-install-source.md` |
| 想开发插件 | `docs/02-plugin-dev-guide.md` → `packages/_template/`（脚手架） |
| 想发布插件 | `docs/03-release-flow.md`（密钥扫描/四通道发布） |
| 想收录第三方 | `CONTRIBUTING.md` + `registry/third-party/README.md` |
| 遇到问题 | `docs/08-troubleshooting.md` |

**我能做什么**（3 条命令起步）：

```sh
node scripts/install-from-registry.mjs --list      # 看安装源有哪些插件
node scripts/install-from-registry.mjs dsh-xxx     # 装一个（auto 选通道 + 校验）
node scripts/create-plugin.mjs dsh-my-tool         # 建一个新插件
```

---

## 仓库结构

```
dsh-plugins/
├── packages/            # 插件源码（monorepo）
│   ├── _template/       # 插件脚手架模板（scripts/create-plugin.mjs 使用）
│   └── dsh-xxx/         # 实际插件（新建见下）
├── registry/            # 插件安装源（索引 + 安装包归档 + 第三方收录）
│   ├── registry.json    # 安装源注册表（脚本生成，勿手改）
│   ├── packages/        # 安装包归档 .tgz（pnpm pack 产物，国内网络友好）
│   └── third-party/     # 第三方插件收录（人工维护，每个插件一个 .json）
├── scripts/             # 仓库级工具
│   ├── create-plugin.mjs      # 新建插件脚手架
│   ├── build-registry.mjs     # 生成安装源目录（含 sha256 校验和）
│   ├── pack.mjs               # 打包安装包归档（registry/packages/）
│   ├── install-from-registry.mjs # 安装器：按索引选通道（local→npm→github）+ 校验
│   ├── install-to-profile.mjs # link 安装/卸载到本地 DSH profile
│   ├── publish.mjs            # 单包发布（密钥扫描 + npm + 归档 + registry）
│   ├── publish-all.mjs        # 一键全量发布
│   └── sync-github.sh         # Gitee → GitHub 镜像（安装源通道）
├── docs/                # 文档（01~09，见下方索引）
├── skills/              # 配套 AI 技能（需安装到 ~/.agents/skills/ 生效）
│   ├── dsh-plugin-dev/       # 插件开发
│   ├── dsh-plugin-release/   # 插件发布
│   └── dsh-catalog/          # 安装源目录维护
├── AGENTS.md             # AI 协作指南（规则与红线）
├── CONTRIBUTING.md       # 外部贡献指南（收录/PR/CHANGELOG 约定）
└── .github/workflows/ci.yml  # 构建 + 索引一致性门禁
```

## 目录功能速查

| 目录/文件 | 功能 | 关键规则 |
|-----------|------|----------|
| `packages/*` | 插件源码，一插件一目录（可发布 npm） | 新建必须用 `create-plugin.mjs`；构建产物 `lib/` 提交入库 |
| `registry/registry.json` | 安装源索引（生成产物） | **禁止手改**，改 `packages/`/`third-party/` 后重新生成 |
| `registry/packages/` | 安装包归档 `.tgz`（含 sha256） | `pack.mjs` 生成，随仓库提交 |
| `registry/third-party/` | 第三方收录（人工元数据） | 收录 ≠ 背书；`verified` 恒 false；`npm`/`github` 通道受白名单校验 |
| `scripts/` | 仓库级工具链（脚手架/打包/索引/安装/发布/同步） | 命名与密钥校验走 `lib/` 公共模块 |
| `docs/` | 方案/机制/开发/发布/安装源/格式/上手/排查/盘点 | 权威口径；skills 为指针式，以 docs 为准 |
| `skills/` | AI 技能（复制到 `~/.agents/skills/` 生效） | 指针式：只留要点 + 检查清单 |
| `AGENTS.md` | AI 协作规则（红线） | 新 Agent 必读 |
| `.github/workflows/ci.yml` | 构建 + typecheck + 索引一致性门禁 | 生成后 `git diff` 必须无差异 |

---

## 快速开始

```sh
# 1. 新建插件（自动复制模板并改名）
node scripts/create-plugin.mjs dsh-my-tool

# 2. 装依赖、构建、类型检查
cd packages/dsh-my-tool && pnpm install && pnpm run build && pnpm run typecheck

# 3. 本地调试：link 安装到 web profile，重启 dsh web 生效
node scripts/install-to-profile.mjs dsh-my-tool

# 4. 发布（密钥扫描 + npm + 打包归档 + 刷新安装源目录）
node scripts/publish.mjs dsh-my-tool patch

# 5. 同步 GitHub 安装源通道
bash scripts/sync-github.sh
```

## 使用：安装插件

```sh
# 方式一：本仓库安装器（读索引 auto 选通道：local 归档 → npm → github，含 sha256 校验）
node scripts/install-from-registry.mjs dsh-xxx
node scripts/install-from-registry.mjs --list            # 浏览安装源全部插件
node scripts/install-from-registry.mjs dsh-xxx --remote  # 另一台机器拉远端索引安装

# 方式二：本地归档（国内网络首选，tgz 已在 registry/packages/）
dsh plugin --profile web add file:./registry/packages/dsh-xxx-0.1.0.tgz

# 方式三：npm 通道（已发布）
dsh plugin --profile web add dsh-xxx

# 方式四：GitHub 通道（已同步镜像）
dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/dsh-xxx

# 安装源目录（索引，含 install.local 通道与 checksum）
# https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json
```

## 收录的插件

本仓库当前收录 **18 个第三方高价值插件**（来源：本机实际使用盘点，见
[`docs/09-local-plugin-inventory.md`](docs/09-local-plugin-inventory.md)）：

| 类别 | 插件 |
|------|------|
| 记忆/运维 | dsh-auto-memory、dsh-undo-savepoint、dsh-config-manager、dsh-plugin-sync、dsh-plugin-manager |
| 市场/商店 | dshmarket、dsh-workshop |
| 开发工具 | dsh-mcp-manager、dsh-browser、dsh-lsp-actions、dsh-inspiration-deck-workshop |
| 工作流 | dsh-automation、dsh-chinese-mode、dsh-web-ui-notify |
| 界面/娱乐 | dsh-better-sidebar、dsh-skin、dsh-dream-skin、dsh-douyin |

查看全部：`node scripts/install-from-registry.mjs --list` 或 `registry/registry.json`。

## 范围与规则（收录/开发/发布）

**收录边界**（什么进 `registry/third-party/`）：

- ✅ 收录：本机在用、维护活跃、功能实用的社区插件（元数据 + 受控 `npm`/`github` 通道）
- ❌ 不收录：官方平台包（`@deepseek-ai/*`）、UI 内置插件（`file:` 路径）、用户自有全家桶（`@linxin666/*`，走关联仓库入口）、皮肤类低活跃重复项
- ⚠️ 收录 ≠ 背书：`verified` 恒为 false；收录前完成 `CONTRIBUTING.md` 的审核 checklist

**开发红线**：

- 新建插件必须用 `node scripts/create-plugin.mjs`，禁止手抄目录
- 改完插件必须重新生成索引与归档（CI 会校验一致性）
- 发布前密钥扫描会拦截（AK/SK、私钥、明文密钥），发布 = 对外运行你的代码
- 不提交密钥；`registry.json` 是生成产物禁止手改

**发布**：单包 `publish.mjs <pkg> patch|minor|major`；全量 `publish-all.mjs`（自动跳过 npm 已发布版本）；发布必须更新 `CHANGELOG.md`（见 `CONTRIBUTING.md`）。

## 配套 skill（AI 开发助手）

`skills/` 下三个技能指导 AI 在此仓库工作。**技能不会自动生效**，需安装到 agent 环境：

```sh
cp -r skills/dsh-plugin-dev skills/dsh-plugin-release skills/dsh-catalog ~/.agents/skills/
```

| Skill | 用途 |
|-------|------|
| `dsh-plugin-dev` | 新建/修改/调试 DSH 插件（双面插件、agent 工具、GUI 面板） |
| `dsh-plugin-release` | 版本管理、npm/GitHub 发布、安装源同步 |
| `dsh-catalog` | 维护安装源目录、收录第三方插件 |

> skills 为指针式（要点 + 检查清单），权威口径以 `docs/` 为准。

## 文档索引

- [01 机制原理](docs/01-architecture.md) —— profile、bundle patch、双面插件模型
- [02 开发指南](docs/02-plugin-dev-guide.md) —— 从脚手架到发布前检查清单
- [03 发布流程](docs/03-release-flow.md) —— 四通道发布与回滚
- [04 安装源](docs/04-install-source.md) —— 如何把本仓库变成安装源
- [05 索引格式](docs/05-catalog-schema.md) —— registry.json 字段与兼容性
- [06 端到端示例](docs/06-quickstart.md) —— dsh-hello 从建插件到安装
- [07 方案设计](docs/07-solution-design.md) —— 历史方案设计（背景参考）
- [08 故障排查](docs/08-troubleshooting.md) —— 常见失败现象与处置
- [09 本机插件盘点](docs/09-local-plugin-inventory.md) —— 已装插件评估与收录依据
- [评审报告](docs/review/2026-08-21-review.md) —— 六维度评审与修复记录

## 关联仓库

- [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) —— 用户全家桶 monorepo（18 包 + `@linxin666/dsh-web-ui-all` 聚合包），双面插件参考实现
- [dsh-workshop](https://github.com/loguhan/dsh-workshop) —— 创意工坊（registry 消费端）
- [dsh-recommend](https://github.com/zp-home/dsh-recommend) —— 社区目录数据源

## License

Apache-2.0

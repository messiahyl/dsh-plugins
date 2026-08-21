# 07 · dsh-plugins 方案设计

> **状态横幅：本文为历史方案设计（基于 commit `5a37057` 撰写），已由后续实现与六维度评审定案，
> 仅作背景参考，不再视为现行规范。** 现行口径以 `docs/01`~`docs/06`、`registry/README.md`、
> `AGENTS.md` 与脚本实际行为为准；文中【待确认】项多数已定案（checksum 默认拒绝 +
> `--no-verify` 逃生口、verified 第三方恒 false、通道 local→npm→github、gitee 无安装消费方等）。

> 本文是 dsh-plugins 仓库的整体方案设计：定位与目标、DSH 插件机制认知、仓库架构、
> 安装源设计、开发与发布流程、工具链约定、配套 skill 体系与演进路线。
> 前置阅读：`docs/01-architecture.md`（机制原理）、`docs/04-install-source.md`（安装源）、`docs/05-catalog-schema.md`（索引格式）。

---

## 1. 背景与目标

### 1.1 为什么建这个仓库

DSH（DeepSeek Harness）以 **profile + bundle patch** 机制加载插件（详见 `docs/01`），
插件本质是 npm 包；官方插件与社区插件散落在 npm、GitHub、各类目录源中，缺少一个
**可自控**的聚合仓库：

- 自有插件需要一个统一存放、统一开发、统一发布的 monorepo；
- 国内网络访问 npm / GitHub 不稳，需要一个"离得近、可校验"的安装通道；
- workshop（创意工坊）类消费端需要一个机器可读的目录源（registry.json）。

> **为什么**：把"开发、管理、分发"三件事放进同一个仓库，让 `packages/*/package.json`
> 成为唯一事实源，索引、归档、安装说明全部由脚本从它生成，避免多套元数据漂移。

### 1.2 三个定位

| 定位 | 说明 | 载体 |
|------|------|------|
| 📦 多插件开发 | `packages/*` 一个插件一个目录，pnpm workspace 统一管理 | `packages/` + `scripts/create-plugin.mjs` |
| 🗂️ 插件管理 | 自有插件 + 第三方收录统一登记，生成安装源目录 | `registry/registry.json` + `registry/third-party/` |
| 🔌 插件安装源 | 四通道：本地归档 / registry.json / npm / GitHub 镜像 | `registry/` + `scripts/install-from-registry.mjs` |

> **为什么**：三个定位共享同一份元数据（包名、版本、描述、归档），目录与安装通道
> 都由 `build-registry.mjs` 派生，新增一个插件 = 目录与安装源自动可用。

### 1.3 明确边界（非目标）

- **不替代**官方 `@deepseek-ai/dsh-*` 平台包与 dsh-recommend 社区目录，定位是自有源 + 目录聚合（`docs/04` 说明两者可共存）；
- **不搬运**第三方代码：收录只登记元数据，`verified: false` 默认，收录 ≠ 安全背书（`docs/05`、`skills/dsh-catalog`）；
- **不提供在线服务端**：安装源 = git 仓库（Gitee 主源）+ raw 静态托管 + GitHub 镜像。

---

## 2. 核心机制认知（DSH 插件模型）

> 本节全部提炼自 `docs/01-architecture.md`（基于 DSH 0.1.0-rc.8、web profile 实测）。

### 2.1 Profile 与插件加载链

DSH 以 **profile** 为单位启动（`~/.dsh/profiles/<name>`），web profile 的关键文件：

```
profiles/web/
├── package.json          # dependencies = 插件包；dsh.profile.bundles = 启用清单
├── cordis.yml            # profile 根（空列表，仅作组合说明）
├── cordis.patch.yml      # 用户层 patch：insert/disabled 覆盖
└── node_modules/         # pnpm 安装的插件包
```

插件树按序组合：**每个 bundle 的 patch 层 → cordis.patch.yml → 用户 --patch 覆盖**，
后层覆盖前层；`cordis.yml` 根文件不要手改，改 `cordis.patch.yml`。

> **为什么**：patch 分层是 DSH 的扩展点——插件以 bundle 身份贡献自己的 patch 层，
> 用户层可禁用/改名/改配置而不触碰插件包本身，这也是"安装 = pnpm 装包 + patch 注册"的由来。

### 2.2 插件包 = npm 包 + dsh 声明

一个 DSH 插件首先是合法的 npm 包，靠 `package.json` 的 `dsh` 字段获得插件身份：

- `main` / `exports["."]` → host 半（node）；
- `exports["./client"]` → browser 半（web GUI）；
- `dsh.bundle.patch` → 指向 `cordis.patch.yml`（`- insert:` 注册插件实例，**入口声明**）；
- `dsh.client` → 声明浏览器半存在及需要平台注入的运行时模块（`@deepseek-ai/dsh-client-*`）。

> **为什么**：插件身份完全由 npm 包元数据承载，因此 monorepo（一个包一个插件目录）、
> npm 发布、`dsh plugin add` 三种分发方式天然复用同一套包结构。

### 2.3 双面插件模型（host + client）

```
宿主进程 (node)                       浏览器 (web GUI)
┌─────────────────────┐              ┌──────────────────────┐
│ cordis 插件实例      │              │ /plugins/<id>/client.js │
│  exports "."         │  ctx.http   │  exports "./client"   │
│  · agent 工具        │ ◄─────────► │  · 侧边栏入口注入      │
│  · /api/dsh-xxx REST │   同源 REST │  · 中央列面板挂载      │
│  · ctx 服务(seam)    │              │  · 设置页项           │
└─────────────────────┘              └──────────────────────┘
```

- **host 半**（`src/host/index.ts`）：cordis 插件 `apply(ctx, config)`，可注册 agent 工具、
  挂 `ctx.http` REST 路由、注册/注入服务；返回 dispose 清理函数；
- **browser 半**（`src/client/index.tsx`）：经 tsdown 输出的
  `window.__ModuleLoader__.load({ id, factory })` 装载（见模板 `tsdown.config.ts`），
  factory 内 `require` 平台注入的 react 家族与 `@deepseek-ai/dsh-client-*` 运行时；
- **通信**：浏览器半同源 `fetch('/api/dsh-xxx/...')` 调 host 半路由。

> **为什么**：host 半负责能力（agent 工具/API），browser 半负责 GUI，二者同源 REST 解耦，
> 使纯 host 工具插件（无 client）与双面插件共用同一套构建与发布链路。

### 2.4 安装通道（spec 形式）

`dsh plugin --profile <name> add <spec>` 本质是 pnpm 安装 + bundle 注册：

| spec 形式 | 含义 | 适用场景 |
|-----------|------|----------|
| `dsh-xxx` | npm 包 | 公共分发 |
| `github:owner/repo`（含 `#path:` 子目录） | GitHub 仓库 | 社区安装、workshop |
| `file:path.tgz` | 本地/下载的安装包归档 | 离线、国内网络 |
| `link:/abs/path` | 本地目录 | 开发调试 |
| `git+https://...` | 任意 git 仓库 | 私有分发 |

**关键约束**：workshop 与 `github:` 安装只认 GitHub；Gitee 只能作为代码主源 + 归档静态源。

> **为什么**：`file:` 与 `link:` 通道是本仓库"本地归档优先"策略的基础——归档随 Gitee
> 仓库分发（国内直连快），安装时用 `file:` 绕开 npm/GitHub 的网络不确定性。

### 2.5 对本仓库的设计推论

1. 插件包必须合法 → **pnpm workspace monorepo**（`pnpm-workspace.yaml: packages/*`）；
2. 入口是 bundle patch → **每个插件必有 `cordis.patch.yml`**；
3. git 源安装免构建 → **`lib/` 构建产物提交入库**（`.gitignore` 注释明确本策略）；
4. Gitee 只被 workshop/github: 排斥 → **双 remote：Gitee 主源 + GitHub 镜像**（`sync-github.sh`）。

---

## 3. 仓库架构

### 3.1 完整目录树

```
dsh-plugins/
├── AGENTS.md                     # AI/人协作约定：必读入口、关键约定、收尾检查
├── README.md                     # 仓库定位、快速开始、安装方式、文档索引
├── LICENSE                       # Apache-2.0
├── package.json                  # 根包：scripts 聚合（create/build/typecheck/registry/pack/...）
├── pnpm-workspace.yaml           # workspace: packages/*
├── pnpm-lock.yaml
├── tsconfig.base.json            # 各包 tsconfig 的公共基座（ES2022/strict/bundler）
├── .npmrc                        # 国内镜像源开关（默认注释）、pre-post-scripts 开关
├── .gitignore                    # *.tgz 忽略但 !registry/packages/*.tgz（归档必须入库）
│
├── packages/                     # 📦 多插件开发（monorepo，一个插件一个目录）
│   ├── _template/                # 脚手架模板（create-plugin.mjs 复制改名，不入索引）
│   │   ├── package.json          #   dsh.bundle.patch + dsh.client + exports 双出口
│   │   ├── cordis.patch.yml      #   - insert: 注册插件实例（入口声明）
│   │   ├── tsdown.config.ts      #   host(esm)+client(cjs banner) 双构建配置
│   │   ├── tsconfig.json
│   │   ├── src/host/index.ts     #   host 半：agent 工具 / ctx.http / dispose
│   │   ├── src/client/index.tsx  #   browser 半：面板挂载 + 卸载
│   │   ├── src/client/sidebar.ts #   侧边栏入口注入 + MutationObserver 自愈
│   │   ├── lib/                  #   模板自带构建产物（复制时排除，不入新包）
│   │   ├── README.md
│   │   └── .gitignore            #   lib/ 忽略（真实插件需覆盖：lib/ 提交）
│   └── dsh-xxx/                  # 实际插件（create-plugin.mjs 生成）
│
├── registry/                     # 🔌 插件安装源（索引 + 归档 + 收录）
│   ├── registry.json             #   安装源注册表（build-registry.mjs 生成，禁止手改）
│   ├── packages/                 #   安装包归档 *.tgz（pack.mjs 的 pnpm pack 产物，必须提交）
│   ├── third-party/              #   第三方收录（人工维护，每插件一个 .json）
│   │   ├── dsh-browser.json
│   │   ├── dsh-workshop.json
│   │   └── README.md
│   └── README.md                 # 安装源使用说明（通道表 + 更新流程）
│
├── scripts/                      # 🛠️ 仓库级工具链（8 个脚本，见 3.4）
│   ├── create-plugin.mjs         #   脚手架：复制 _template 并替换占位符
│   ├── build-registry.mjs        #   生成 registry.json（含 sha256 校验和）
│   ├── pack.mjs                  #   pnpm pack → registry/packages/
│   ├── install-from-registry.mjs #   消费端安装器：auto 选通道 + 下载 + sha256 校验
│   ├── install-to-profile.mjs    #   link 模式安装/卸载到本地 DSH profile
│   ├── publish.mjs               #   单包发布（密钥扫描 + 升版 + npm + 归档 + 索引）
│   ├── publish-all.mjs           #   全量发布（不升版）
│   └── sync-github.sh            #   Gitee → GitHub 镜像（安装源通道）
│
├── docs/                         # 📚 文档体系
│   ├── 01-architecture.md        #   DSH 插件机制原理（profile/bundle/双面插件）
│   ├── 02-plugin-dev-guide.md    #   插件开发指南（脚手架→调试→发布前清单）
│   ├── 03-release-flow.md        #   发布流程（npm/GitHub/registry 三通道 + 回滚）
│   ├── 04-install-source.md      #   安装源说明（四通道设计）
│   ├── 05-catalog-schema.md      #   registry.json 格式定义（字段表 + 兼容性）
│   ├── 06-quickstart.md          #   端到端快速开始（dsh-hello 示例）
│   └── 07-solution-design.md     #   本文：整体方案设计
│
├── skills/                       # 🤖 配套 AI 技能（复制到 ~/.agents/skills/ 生效）
│   ├── dsh-plugin-dev/SKILL.md   #   插件开发
│   ├── dsh-plugin-release/SKILL.md  # 插件发布
│   └── dsh-catalog/SKILL.md      #   安装源目录维护
│
└── .github/workflows/
    └── ci.yml                    # CI：typecheck + build + 索引一致性校验
```

> **为什么**：目录即职责边界——`packages/` 只管产出、`registry/` 只管分发、`scripts/` 只管流程、
> `skills/` 把流程固化给 AI，CI 兜底一致性；任何环节都不需要跨目录手改。

### 3.2 packages/ — 多插件开发

- **一个插件一个目录**，独立版本、独立发布；包名 `dsh-<name>` 或 `@<scope>/dsh-<name>`，
  cordis 实例 id 取 `dsh-` 后的部分（`docs/02`）；
- `_template` 是唯一模板，`create-plugin.mjs` 复制并替换占位符（`dsh-xxx` → 包名、`xxx` → id），
  复制时排除 `lib/`（避免携带旧构建产物）；
- 构建产物 `lib/` **提交入库**，保证 git 源安装免构建（`AGENTS.md` 约定 2）。

> **为什么**：模板 + 脚手架强制命名与结构一致（`AGENTS.md` 约定 1：禁止手抄目录），
> 这是 monorepo 里多插件能被脚本批量扫描/打包的前提。

### 3.3 registry/ — 安装源（索引 + 归档 + 收录三块）

| 组成部分 | 内容 | 维护方式 |
|----------|------|----------|
| 索引 | `registry.json`：meta + plugins 数组 | `build-registry.mjs` 生成，**禁止手改** |
| 归档 | `registry/packages/*.tgz` | `pack.mjs` 生成（pnpm pack），必须提交 git |
| 收录 | `registry/third-party/*.json` | 人工写元数据（name 必填，其余建议齐全） |

`build-registry.mjs` 聚合三类数据（`registry/README.md`）：
1. 本地插件：扫描 `packages/*/package.json`（`source: "local"`，跳过 `_template`）；
2. 安装包归档：扫描 `registry/packages/*.tgz`，登记 `install.local` 与 `archive`（含 `checksum`）；
3. 第三方收录：`third-party/*.json`（`source: "third-party"`，`verified: false` 默认）。

> **为什么**：索引是生成产物而非手写源——归档扫描与 packages 扫描自动同步，
> 杜绝"包已更新、索引没跟上"的漂移；`meta.generatedAt` 给消费端一个新鲜度信号。

### 3.4 scripts/ — 工具链（8 个脚本）

| 脚本 | 职责 | 关键行为 |
|------|------|----------|
| `create-plugin.mjs` | 新建插件脚手架 | 命名规约（裸名补 `dsh-`、`@scope` 必须 `dsh-` 开头）；复制 `_template` 排除 `lib/`；按顺序替换占位符（先长串后短串，防 `dsh-dsh-` 污染） |
| `pack.mjs` | 打包安装包归档 | `pnpm pack --pack-destination registry/packages/`；无参 = 全部，有参 = 指定；解析 pnpm 11 的 "Tarball Details" 输出 |
| `build-registry.mjs` | 生成索引 | 扫描三类数据；`@scope/` 转义为 `scope-` 文件名；sha256 计算 `archive.checksum`；去重 + 按名排序；写 meta |
| `install-from-registry.mjs` | 消费端安装器 | auto 通道 local→npm→github；local 通道下载 tgz + **sha256 校验**后 `dsh plugin add file:`；支持 `--list/--remote/--source/--profile` |
| `install-to-profile.mjs` | 本地调试 | `dsh plugin --profile web add link:<绝对路径>`；无参 = 全部；`--remove` 卸载 |
| `publish.mjs` | 单包发布 | git 干净校验 → 密钥扫描（AK/SK/私钥/明文密钥赋值正则）→ 升版本 → build+typecheck → `pnpm publish --access public` → pack 归档 → 重建索引；`--no-npm/--dry-run` |
| `publish-all.mjs` | 全量发布 | 逐包 typecheck+build → npm publish（可选）→ pack 全部 → 重建索引；**不递增版本**（避免误批量升版） |
| `sync-github.sh` | GitHub 镜像 | 添加/复用 `origin-github` remote，`git push origin-github master --tags`；可选 `gh repo create` 建仓 |

> **为什么**：8 个脚本各管一段生命周期（建→调→发→归档→索引→装→镜像），
> 可单独调用也可串联（publish.mjs 内部自动串 pack+索引），命令即文档、即 skill 的操作手册。

### 3.5 docs/ — 文档体系

01 机制原理 → 02 开发指南 → 03 发布流程 → 04 安装源 → 05 索引格式 → 06 快速开始 → 07 方案设计（本文）。
`AGENTS.md` 的"必读入口"表把 docs/01、02、03、04、05、06 与三个 skill 一一对应。

> **为什么**：按"原理→操作→格式→示例"分层，AI 与人均能按需取用，避免一篇长文塞满所有细节。

### 3.6 skills/ 与 CI

- `skills/` 三个 skill 是 docs/scripts 的"AI 操作层"，复制到 `~/.agents/skills/` 即自动可用（详见第 7 章）；
- `.github/workflows/ci.yml` 在 push master / PR 时跑：pnpm install → `pnpm -r typecheck` →
  `pnpm -r build` → `build-registry.mjs` → `git diff --exit-code registry/registry.json`（详见 6.4）。

### 3.7 根配置要点

| 文件 | 要点 |
|------|------|
| `package.json` | `engines: node >=22.19.0 / pnpm >=9`；`packageManager: pnpm@11.7.0`；scripts 聚合 |
| `pnpm-workspace.yaml` | 仅 `packages/*` |
| `tsconfig.base.json` | ES2022 / ESNext / moduleResolution bundler / strict / noEmit / jsx react-jsx |
| `.npmrc` | npmmirror 镜像源与 pre-post-scripts 默认注释，国内网络按需打开 |
| `.gitignore` | `*.tgz` 排除、`!registry/packages/*.tgz` 强制入库——归档是安装源通道，不能丢 |

---

## 4. 安装源设计

### 4.1 通道总览

> 口径说明：`docs/04`、`docs/03` 与 skills 均以**四通道**表述（本地归档 / registry.json / npm / GitHub 镜像）；
> `README.md` 的表格以"目录 + 安装执行"视角称三通道（registry.json / npm / GitHub 镜像），
> 差异在于是否把"本地归档"单列，本文按四通道展开。

| 通道 | 机制 | 适用场景 | 对应命令 |
|------|------|----------|----------|
| A 本地归档 | `registry/packages/*.tgz`（索引 `install.local`） | 国内网络、离线分发 | `pack.mjs` 产、安装器下载 |
| B registry.json | 索引 + Gitee raw 静态托管 | 目录展示、workshop 风格安装器/自研工具 | `build-registry.mjs` 产 |
| C npm | 各包 `pnpm publish` | 公共安装、workshop 优先 | `publish.mjs` |
| D GitHub 镜像 | `sync-github.sh` 镜像后 `github:owner/repo#path:` | workshop 一键安装、社区曝光 | `sync-github.sh` |

### 4.2 通道 A：本地安装包归档（推荐，解决网络问题）

`pack.mjs` 把插件 `pnpm pack` 成 `.tgz` 放入 `registry/packages/`，随仓库提交到 Gitee
（国内直连快、不依赖 npm/GitHub 可达性）。索引登记 `install.local` 的 Gitee raw URL 与
`archive.checksum`（sha256）。

消费方式：安装器下载 + 校验 + `dsh plugin add file:<tgz>`；或手动
`curl -LO <raw URL>` 后 `file:` 安装。

> **为什么**：npm/GitHub 在国内不稳（`pack.mjs` 文件头动机），归档随主源分发 = 安装链路
> 与代码同源、同速度，是四通道里唯一"免第三方网络"的通道。

> 注意（`docs/04`）：归档内**运行时依赖**首次安装仍需解析（可配 npmmirror），
> 平台供给的 react / `@deepseek-ai` 运行时是 peerDependencies，不额外下载。

### 4.3 通道 B：registry.json（目录源）

`build-registry.mjs` 生成，格式**兼容 dsh-recommend 字段超集**（`name/owner/fullName/url/
description/stars/forks/openIssues/archived/fork/language/license` 一致），并扩展自有字段
（`version/source/install/verified/tags/archive`）。托管于
`https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json`（或 Gitee Pages）。
两类消费者：workshop 风格安装器（卡片展示 → 按 `install` 通道执行）、自研脚本。

> **为什么**：兼容字段让既有 dsh-recommend 消费端无需改造即可渲染本目录；
> 扩展字段把"能不能装、从哪装"直接写进索引，安装器不需要二次猜测。

### 4.4 通道 C：npm

每个 `packages/` 插件独立 `pnpm publish --access public`。npm 优先被 workshop 使用
（npm 快、免构建）；发布到公共 registry 即人人可装。

> **为什么**：npm 是 DSH `dsh plugin add <pkg>` 的默认解析源，保留它是为了生态兼容与公共分发。

### 4.5 通道 D：GitHub 镜像

`sync-github.sh` 把仓库镜像到 `github.com/<owner>/dsh-plugins`（`origin-github` remote）。
镜像后每个插件可 `dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/<name>`；
仓库名/话题若命中 dsh-plugin 扫描规则，会自然出现在社区 workshop 目录（曝光）。
【待确认】GitHub 侧 owner 是否与 Gitee 同为 `messiahyl`（脚本默认 `OWNER=messiahyl`）。

> **为什么**：DSH 的 `github:` 安装与 workshop 只认 GitHub（`docs/04` 关键约束），
> 镜像不是可选优化而是通道 D 的硬前提。

### 4.6 sha256 校验和（防篡改）

- **生成侧**（`build-registry.mjs`）：对 `registry/packages/*.tgz` 计算 sha256，写入 `archive.checksum`；
- **消费侧**（`install-from-registry.mjs` local 通道）：下载后比对，不一致即中止
  （"归档可能损坏或被篡改"）；索引无 checksum 时降级为警告。
- 归档文件名转义规则：`@scope/dsh-x` → `scope-dsh-x-0.1.0.tgz`，安装器与生成器共用同一规则。

> **为什么**：归档通道绕开了 npm 的完整性保障（registry 的 integrity 字段），
> 必须自建校验环，否则"国内直连"会同时成为"被投毒"的入口。

### 4.7 安装器通道优先级：local → npm → github

`install-from-registry.mjs` 的 auto 模式按 `['local', 'npm', 'github']` 取第一个可用通道：

```sh
node scripts/install-from-registry.mjs dsh-xxx          # auto：local → npm → github
node scripts/install-from-registry.mjs dsh-xxx --source local   # 强制通道
node scripts/install-from-registry.mjs dsh-xxx --remote         # 拉远端索引（另一台机器）
node scripts/install-from-registry.mjs --list [--remote]        # 浏览索引
```

> **为什么**：local（免网络 + 校验和）最优、npm 次之、github 兜底——与 `docs/04` 的使用建议
> （国内优先归档，其次 npm 配 npmmirror）一致；强制通道参数给高级用户逃生口。
> 注意索引 `install` 字段含 `gitee` 通道值，但安装器通道数组只含 local/npm/github【待确认：gitee 字段保留是否仅作展示】。

### 4.8 安全边界

- **收录 ≠ 背书**：第三方代码不在仓库内，安装 = 本机运行作者代码（`docs/04`、`skills/dsh-catalog`）；
- **高风险插件明示**：有执行/写文件/高成本操作的插件，安装文档必须注明，agent 工具要求"先确认"；
- **公网暴露防护**：dsh web 若暴露公网，安装类接口应做来源校验（参考 dsh-workshop 同源拒绝策略）；
- **发布前密钥扫描**：`publish.mjs` 内置 4 组正则（AWS AK、`sk-` key、私钥块、明文密钥赋值），
  命中即中止发布（`AGENTS.md` 约定 5）。

---

## 5. 开发与发布流程

### 5.1 流程总览

```
create-plugin.mjs ──► 开发（watch + install-to-profile link 调试）──► 发布前检查清单
                                                                      │
                                        ┌─────────────────────────────┘
                                        ▼
                          publish.mjs <pkg> patch|minor|major
                          ├─ 1. git 干净校验
                          ├─ 2. 密钥扫描（命中即中止）
                          ├─ 3. pnpm version --no-git-tag-version  升版
                          ├─ 4. build + typecheck
                          ├─ 5. pnpm publish --access public（--no-npm 跳过）
                          ├─ 6. pack.mjs → registry/packages/*.tgz
                          └─ 7. build-registry.mjs → registry.json
                                        │
                                        ▼
                    git commit + tag <pkg>@<ver> + push origin master --tags
                                        │
                                        ▼
                              bash scripts/sync-github.sh（GitHub 镜像）
```

### 5.2 脚手架：create-plugin.mjs

```sh
node scripts/create-plugin.mjs dsh-my-tool        # 裸名自动补 dsh-
node scripts/create-plugin.mjs @scope/dsh-xxx     # scope 名必须 dsh- 开头
```

行为：校验命名正则 → 复制 `packages/_template`（排除 `lib/`）→ 替换 `package.json /
cordis.patch.yml / tsdown.config.ts / src/host/index.ts / src/client/index.tsx /
src/client/sidebar.ts` 中的占位符（先 `dsh-xxx` 后 `xxx`，防 `dsh-dsh-` 污染）→ 打印下一步提示。

> **为什么**：模板是唯一基线、脚手架是唯一入口，新插件与既有插件结构逐字节同构，
> 批量脚本（pack/registry/publish-all）才能无差别工作。

### 5.3 开发与本地调试

```sh
cd packages/dsh-my-tool && pnpm install
pnpm run watch              # tsdown 增量构建
node scripts/install-to-profile.mjs dsh-my-tool   # link 装进 web profile
dsh web                     # 重启生效；改 client 半浏览器强刷即可
```

调试tips（`docs/02`）：改 host 半 → 重启 dsh web；改 client 半 → 浏览器强刷（无需重启宿主）；
调试期可在 `cordis.patch.yml` 用 `disabled: true` 快速停用。

> **为什么**：`link:` 模式让源码目录直接进 profile，改动即加载，与最终 `file:`/npm 安装共用
> 同一 bundle 注册路径，调试结果 ≈ 发布结果。

### 5.4 发布：publish.mjs（含密钥扫描）

```sh
node scripts/publish.mjs dsh-my-tool patch        # patch|minor|major，默认 patch
node scripts/publish.mjs dsh-my-tool patch --no-npm   # 只归档 + 索引
node scripts/publish.mjs dsh-my-tool patch --dry-run  # 演练（不落盘不发布）
```

密钥扫描 4 组正则（`publish.mjs` 1.5 节）：`AKIA[0-9A-Z]{16}`（AWS AK）、
`sk-[A-Za-z0-9]{20,}`（sk- API key）、`-----BEGIN ... KEY-----`（私钥块）、
`(password|secret|api[_-]?key|...)\s*[:=]\s*"..."`（明文密钥赋值，8 字符以上）；
扫描范围：包目录内 `.ts/.tsx/.js/.mjs/.json/.yml/.yaml/.md/.env`，排除 `node_modules/lib/.git`。

> **为什么**：发布 = 对外运行你的代码（脚本头注），密钥扫描在**升版之前**拦截，
> 宁可误报也不让 AK/SK 进 npm 包与归档——这是安装源可信度的底线。

### 5.5 归档：pack.mjs

```sh
node scripts/pack.mjs                # 打包全部
node scripts/pack.mjs dsh-ssh        # 只打包指定
```

`pnpm pack --pack-destination registry/packages/` 后**必须**重新生成索引
（登记 `install.local` 与 `archive.checksum`）；publish.mjs 内部自动串联这两步。

> **为什么**：归档是通道 A 的唯一产物来源，且索引的 local URL/校验和都依赖它，
> 脚本末尾的提示与 publish 内的自动串联消除了"打包忘建索引"的常见事故。

### 5.6 同步：sync-github.sh

```sh
bash scripts/sync-github.sh            # 推送 origin-github（未配置则自动添加）
bash scripts/sync-github.sh <owner>    # 指定 owner
```

`set -euo pipefail`；自动 `git remote add origin-github https://github.com/<owner>/dsh-plugins.git`
并 `git push origin-github master --tags`；可选 `gh repo create` 自动建仓（需已登录 gh）。

> **为什么**：Gitee 是主源、GitHub 是安装通道，二者必须同步——脚本把"加 remote + 推送"
> 收敛成一条命令，并在输出里提醒 workshop 曝光规则。

### 5.7 全量发布：publish-all.mjs

```sh
node scripts/publish-all.mjs            # typecheck+build 全部 → npm → pack 全部 → 索引
node scripts/publish-all.mjs --no-npm   # 只归档 + 索引
node scripts/publish-all.mjs --dry-run  # 只构建
```

**刻意不递增版本**（文件头注释：避免误批量升版），需要升版请逐包 `publish.mjs`。

> **为什么**：批量升版是危险操作（一次失误全仓版本漂移），全量脚本只做"构建+分发"，
> 版本变更保留给单包流程的人工决策。

### 5.8 回滚策略（`docs/03`）

| 通道 | 回滚方式 |
|------|----------|
| npm | 不支持删已发布版本 → 发修复版（patch+1） |
| 归档 | 删 `registry/packages/<name>-<旧版本>.tgz` + 重建索引，提交即回滚 |
| git tag | `git tag -d <tag> && git push origin :refs/tags/<tag>`（会破坏已装用户，谨慎） |
| registry | 重建后提交即可（`meta.generatedAt` 记录时间） |

---

## 6. 工具链约定

### 6.1 版本基线

| 工具 | 版本 | 出处 |
|------|------|------|
| node | `>=22.19.0`（engines），CI 用 `22` | 根 `package.json`、`ci.yml` |
| pnpm | `11.7.0`（packageManager），CI `pnpm/action-setup@v4 version: 11.7.0` | 根 `package.json`、`ci.yml` |
| tsdown | `0.22.2`（根 devDeps 与模板 devDeps 一致） | 根 `package.json`、`_template/package.json` |
| typescript | `~5.7.2` | 同上 |
| react / react-dom | peer `^18.2.0`，dev `^18.3.1` | `_template/package.json` |

> **为什么**：tsdown 0.22.2 是 `deps.neverBundle/alwaysBundle` 可用且 `noExternal/external`
> 已弃用的版本线（仓库修复记录），锁版本避免构建配置语义漂移；node 22 内置 fetch
> 让安装器零依赖（`install-from-registry.mjs` 依赖注释：node >= 18）。

### 6.2 tsdown 双构建与 deps 配置要点

模板 `tsdown.config.ts` 定义两个构建目标：

| 目标 | 入口 | 输出 | format/platform | deps 要点 |
|------|------|------|-----------------|-----------|
| host | `src/host/index.ts` | `lib/host/index.js` | esm / node | `neverBundle: [/^@deepseek-ai\//, /^node:/]`；`dts: true` |
| client | `src/client/index.tsx` | `lib/client.js` | cjs / browser | `neverBundle: PLATFORM_MODULES`；`alwaysBundle: 其余全部`；banner/footer 实现 `window.__ModuleLoader__.load` |

- `PLATFORM_MODULES`：react 家族 + `@deepseek-ai/cordis` + `dsh-client-ui-slots / dsh-client-web-react / dsh-client-ui-primitives` —— 运行时由宿主供给，**永不打包**；
- client 其余依赖 `alwaysBundle` 全打进 bundle（self-contained，免外部 node_modules 解析）；
- client 输出用 `outputOptions`：`exports: 'named'`、`entryFileNames: 'client.js'`、
  banner `window.__ModuleLoader__.load({ id, factory: (require) => {`、footer 返回 `module.exports`、
  intro 模拟 `module/exports`；sourcemap 供浏览器调试（`/plugins/<id>/client.js.map`）。

> **为什么**：host 侧外部化平台包（node 侧由宿主 node_modules 提供）、client 侧除平台清单外
> 全部内联——这是双面插件"浏览器半单文件可加载、宿主半零重复打包"的边界划分。

### 6.3 命名与包结构约定

- 包名 `dsh-<name>` / `@<scope>/dsh-<name>`；cordis 实例 id 去 `dsh-` 前缀；
- `files` 只含 `lib` 与 `cordis.patch.yml`（不打包 src 敏感文件，`docs/02` 检查清单）；
- 构建产物 `lib/` 提交；`_template/.gitignore` 忽略 `lib/`，真实插件需覆盖该策略；
- 版本语义化：修复 `patch`、加功能 `minor`、破坏性 `major`。

### 6.4 CI 门禁（`.github/workflows/ci.yml`）

触发：push master / pull_request；job 步骤：
1. `actions/checkout@v4` → `pnpm/action-setup@v4`（11.7.0）→ `actions/setup-node@v4`（node 22, cache pnpm）；
2. `pnpm install --no-frozen-lockfile`；
3. `pnpm -r typecheck`、`pnpm -r build`（全部包）；
4. `node scripts/build-registry.mjs` 重新生成索引；
5. **索引一致性校验**：`git diff --exit-code registry/registry.json`，有差异即报错
   （"registry/registry.json 过期，请运行 node scripts/build-registry.mjs 后提交"）。

> **为什么**：CI 把"改插件必须同步索引"（`AGENTS.md` 约定 3）从口头约定变成硬门禁——
> 生成后再 diff，任何忘记重建索引的提交直接红。

---

## 7. 配套 skill 体系

### 7.1 三个 skill 的职责边界

| Skill | 职责 | 覆盖场景 | 关联文档/脚本 |
|-------|------|----------|---------------|
| `dsh-plugin-dev` | 插件开发 | 新建（create-plugin）、双面插件 host/client、agent 工具、本地调试、提交前检查清单 | `docs/01`、`docs/02`、`create-plugin.mjs`、`install-to-profile.mjs` |
| `dsh-plugin-release` | 插件发布 | 版本管理、npm/GitHub/registry 发布、聚合包联动、回滚 | `docs/03`、`docs/04`、`publish.mjs`、`publish-all.mjs`、`sync-github.sh` |
| `dsh-catalog` | 安装源目录维护 | 收录第三方、更新 registry、消费者对接 | `docs/05`、`build-registry.mjs`、`registry/third-party/` |

边界划分：**dev 管产出、release 管分发、catalog 管目录**；三者都从 `docs/` 取原理、
从 `scripts/` 取操作，skill 本身只做"何时用哪个命令、检查什么"的决策层。

> **为什么**：skill 与 docs/scripts 是同一套事实的三个投影——docs 给人读、脚本给机器执行、
> skill 给 AI 决策；不重复维护第三份流程描述，只固化调用路径与检查点。

### 7.2 安装方式

```sh
cp -r skills/dsh-plugin-dev skills/dsh-plugin-release skills/dsh-catalog ~/.agents/skills/
```

复制后会话中自动可用（`README.md`）；触发词见各 SKILL.md 的 frontmatter `description`
（dev：新建/修改/调试 dsh 插件；release：发布/升级/打 tag/同步安装源；catalog：管理目录/收录第三方）。

### 7.3 与 AGENTS.md 的关系

`AGENTS.md` 的"必读入口"表直接指向三个 SKILL.md 与 docs/01、02、03、04、05、06，
并给出 6 条"违反会破坏仓库"的关键约定——skill 是这些约定的操作化载体。

> **为什么**：AI 进入仓库先读 AGENTS.md 定位、再按需加载 skill，
> 让约定（如"必须用脚手架""registry.json 禁止手改"）在任务执行中被强制遵循。

---

## 8. 演进路线

> 本节为方案规划（非现状），按依赖顺序分五阶段；每阶段含动机与验收标准。

### 8.1 阶段一：真实插件迁移

**现状**：`packages/` 仅有 `_template`，`registry.json` 只有 2 条第三方收录（localCount=0）。

**动作**：把 `dsh-web-ui` 全家桶（packages/ 18 包，`README.md` 关联仓库）中的代表性插件
（如 `dsh-ssh` 双面插件、任务看板类）按 `create-plugin.mjs` 迁入本仓库，跑通
publish → 归档 → 索引 → 安装的完整闭环。

**验收**：本地 `install-from-registry.mjs --source local` 装出至少一个可用插件；
`registry.json` 出现 `source: "local"` 条目且 `archive.checksum` 非空。

> **为什么**：只有真实插件落地，工具链（双构建、归档转义、校验和）的边界情况才会暴露，
> 模板阶段无法验证的"生产可用性"只能靠迁移验证。

### 8.2 阶段二：聚合包联动

**动作**：若插件被聚合包依赖（如 `@linxin666/dsh-web-ui-all`），在发布流程中加入
"升子包版本 → 同步升聚合包版本并重新发布"的联动步骤（`docs/03`、release skill 已预留约定）；
本仓库可自建聚合包（`dsh-plugins-all`）统一依赖自有插件。

**验收**：一次 `publish.mjs` 能提示/自动触发聚合包版本联动。

> **为什么**：聚合包是"全家桶一键装"的分发形态，若子包升版而聚合包不跟，
> 用户拿到的全家桶会引用过期版本——联动是发布纪律的一部分。

### 8.3 阶段三：CI 落地强化

**现状**：CI 已有 typecheck/build/索引一致性门禁（`ci.yml` 已提交）。
**动作**（规划）：① 把归档 `registry/packages/*.tgz` 与索引一起纳入"生成后 diff"校验
（防 tgz 未提交）；② PR 级 dry-run 发布演练（`publish-all.mjs --dry-run`）；
③ 可选：发布时自动打 tag / 生成 CHANGELOG。

**验收**：CI 在"改了包没提交归档/索引"时红；发布类 PR 无需真发 npm 即可验证全链路。

> **为什么**：CI 价值在于把人工收尾清单（`AGENTS.md` 完成检查）前置到合并之前，
> 减少"合并后才发现索引过期"的回修成本。

### 8.4 阶段四：workshop 对接

**动作**：验证 `dsh-workshop`（registry 消费端）能读取本仓库 registry.json 并完成
卡片渲染 + 一键安装（local 优先）；确认字段兼容性（`docs/05` 的兼容超集设计）与
`github:` 通道的 `#path:` 子目录安装。

**验收**：在 workshop 中看到本仓库插件的卡片与 verified 徽标，一键安装成功。

> **为什么**：workshop 是社区曝光主入口，registry.json 的兼容字段（stars/forks/verified）
> 只有真实对接过才知是否够用——这是"兼容 dsh-recommend"设计的最终检验。

### 8.5 阶段五：多机器安装源验证

**动作**：在第二台机器上完整走一遍消费端路径：
① `install-from-registry.mjs --remote`（拉 Gitee raw 远端索引）；
② local 通道下载 + sha256 校验 + 安装；
③ 断网/弱网模拟（验证归档通道不依赖 npm/GitHub）；
④ npm 配 npmmirror 的兜底路径。

**验收**：三台以上机器、两种网络环境（国内直连 / 弱网）均能装上同一版本插件，
且 checksum 校验在篡改场景下正确拒绝。

> **为什么**：安装源的成败在消费端网络现实，不在生成端——多机器验证是"本地归档优先"
> 设计成立的最终证据。

### 8.6 待确认清单汇总

| # | 事项 | 说明 |
|---|------|------|
| 1 | scripts 脚本数量 | 任务口径称 9 个，仓库实况为 **8 个**（create-plugin / build-registry / pack / install-from-registry / install-to-profile / publish / publish-all / sync-github.sh） |
| 2 | 通道数口径 | README 称"三通道"（registry/npm/GitHub），docs/03、04 与 skills 称"四通道"（含本地归档）；本文按四通道展开 |
| 3 | GitHub owner | `sync-github.sh` 默认 `OWNER=messiahyl`，GitHub 侧账号是否同名未验证 |
| 4 | `install.gitee` 字段用途 | 索引登记了 gitee 通道 URL，但安装器通道数组仅 local/npm/github，gitee 通道当前无消费方（或仅作展示） |
| 5 | 聚合包 | 本仓库暂无聚合包，`@linxin666/dsh-web-ui-all` 等属外部仓库（dsh-web-ui），联动需跨仓协作 |
| 6 | CI `--no-frozen-lockfile` | ci.yml 使用 `pnpm install --no-frozen-lockfile`，锁文件未强制一致性（有意为之还是待收紧） |
| 7 | 归档运行时依赖 | 归档内运行时依赖首次安装仍需网络解析（npmmirror），"完全离线安装"尚未实现 |

---

## 附：关键设计决策速查（决策记录）

| 决策 | 为什么 |
|------|--------|
| packages/* 一个插件一个目录 + pnpm workspace | 插件即 npm 包，monorepo 复用包结构，脚本可批量扫描 |
| 模板 + create-plugin.mjs 强制脚手架 | 保证命名/结构与模板一致，批量工具无差别工作 |
| lib/ 构建产物提交入库 | git 源安装免构建（`github:...` 通道可用） |
| registry.json 为生成产物、禁止手改 | 消除"包更新索引滞后"漂移，CI diff 兜底 |
| 归档随 Gitee 提交 + sha256 校验 | 国内直连快；绕开 npm 完整性保障后自建校验环 |
| 安装器通道优先级 local→npm→github | 免网络 + 校验和最优，与国内网络现实一致 |
| publish.mjs 内置密钥扫描（升版前） | 发布即运行代码，宁可误报不放过 AK/SK |
| publish-all.mjs 不升版 | 批量升版是高危操作，版本变更保留人工决策 |
| tsdown host 外置平台包 / client 全内联（除平台清单） | 双面插件：宿主侧零重复打包，浏览器侧单文件可加载 |
| Gitee 主源 + GitHub 镜像双 remote | workshop 与 github: 安装只认 GitHub |
| CI 生成后 diff 索引 | 把"改插件必须同步索引"从约定变成硬门禁 |
| skill = docs 的操作化投影 | 一套事实三种投影，不维护第三份流程描述 |

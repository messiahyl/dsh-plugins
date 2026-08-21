# 评审事实卡（dsh-plugins 仓库现状快照）

> 生成时间：2026-08-21（commit `72f0419` 之后）。供多维度评审与新 agent 快速对齐事实，
> 避免重复通读全部文件。改动仓库后请同步本卡，或标注【已过时】。

## 定位

DSH 插件总仓库（Gitee `messiahyl/dsh-plugins` 主源 + GitHub 镜像通道），三职责：
monorepo 开发 / 插件管理 / 安装源。

## DSH 插件模型

- 插件 = npm 包；`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml` 注册实例；`dsh.client` 声明浏览器半
- 双面插件：host 半（node：agent 工具 + `ctx.http` 路由，exports "."）+ client 半（web：tsdown banner `window.__ModuleLoader__.load`，exports "./client"）
- 安装通道：`dsh plugin add` 支持 npm 包名 / `github:owner/repo` / `file:*.tgz` / `link:路径`

## 目录

| 目录 | 内容 |
|------|------|
| `packages/` | pnpm workspace，`_template` 模板（host+client+sidebar 双面），**无真实插件** |
| `registry/` | `registry.json` 索引（生成产物）+ `packages/` 归档 .tgz + `third-party/` 收录 |
| `docs/` | 01 机制 / 02 开发 / 03 发布 / 04 安装源 / 05 索引格式 / 06 快速开始 / 07 方案设计 |
| `skills/` | dsh-plugin-dev / dsh-plugin-release / dsh-catalog |
| `scripts/` | create-plugin、build-registry、pack、install-from-registry、install-to-profile、publish、publish-all、sync-github + `lib/names.mjs`、`lib/scan-secrets.mjs` |
| 根 | AGENTS.md、.github/workflows/ci.yml、pnpm-workspace.yaml、tsconfig.base.json |

## 安装源四通道

local 归档（`registry/packages/*.tgz` + sha256 checksum，Gitee raw）→ npm → github 镜像 → 索引 registry.json。
安装器 `install-from-registry.mjs`：spawnSync 参数数组、install 字段白名单、checksum 缺失默认拒绝 + `--no-verify`、`--list/--remote/--source/--profile`。

## 发布与安全基线

- `publish.mjs`：git 干净校验 → 版本递增 → build+typecheck → **密钥扫描（files 白名单含 lib/，build 后）** → npm → pack 归档 → build-registry
- `publish-all.mjs`：全量发布（含同样密钥扫描门禁），**不递增版本**（避免误批量升版）
- 密钥扫描公共化：`lib/scan-secrets.mjs`（AKIA/ASIA/sk-proj-/sk-ant-/ghp_/github_pat_/xoxb-/AIza/私钥/明文密钥赋值）
- 命名校验公共化：`lib/names.mjs`（create-plugin/publish/publish-all/install-to-profile 复用）
- 第三方收录：verified 恒 false（不可自证背书），白名单合并，不开放 install/archive 字段

## 工具链与 CI

- node 22 / pnpm 11.7 / tsdown 0.22.2 / typescript 5.7；`pnpm-lock.yaml` 已入库；构建产物 `lib/` 提交入库（`_template/lib` 例外）
- CI：`pnpm install --frozen-lockfile` → typecheck → build → `pack.mjs` → `build-registry.mjs` → `git diff --exit-code registry/`

## 已知限制与待确认

- 无真实插件（仅 _template 可构建）；CI 未在云端实跑
- 归档内运行时依赖首次安装仍需网络解析（建议 npmmirror）
- `registry.json` 的 `install.gitee` 通道无消费方（仅展示）
- 聚合包联动（@linxin666/dsh-web-ui-all 模式）属 dsh-web-ui 仓库，本仓库未落地
- 脚本无单测、无 Lint；scripts 与 docs 双份维护有漂移风险

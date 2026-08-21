# AGENTS.md — AI 协作指南

本仓库是 DSH（DeepSeek Harness）插件总仓库：**多插件 monorepo 开发 + 插件目录管理 + 插件安装源**。
任何 AI/人进入本仓库，先按此文件定位；详细规则见 `CONTRIBUTING.md` 与 `README.md`「范围与规则」。

## 必读入口

| 主题 | 位置 |
|------|------|
| 插件开发技能 | `skills/dsh-plugin-dev/SKILL.md` |
| 插件发布技能 | `skills/dsh-plugin-release/SKILL.md` |
| 安装源目录维护技能 | `skills/dsh-catalog/SKILL.md` |
| DSH 插件机制原理 | `docs/01-architecture.md` |
| 插件开发指南 | `docs/02-plugin-dev-guide.md` |
| 发布流程 | `docs/03-release-flow.md` |
| 安装源四通道 | `docs/04-install-source.md` |
| registry 格式 | `docs/05-catalog-schema.md` |
| 端到端示例 | `docs/06-quickstart.md` |
| 本机插件盘点与评估 | `docs/09-local-plugin-inventory.md` |
| 故障排查 | `docs/08-troubleshooting.md` |

## 仓库范围与边界（先读，避免越界）

**本仓库做什么**：自有插件开发（packages/）+ 插件目录/安装源（registry/）+ 第三方收录（third-party/）。

**收录边界**（决定什么进 third-party/）：
- ✅ 收录：本机在用、维护活跃、功能实用的社区插件（元数据 + 受控 `npm`/`github` 通道，见 `CONTRIBUTING.md` checklist）
- ❌ 不收录：官方平台包（`@deepseek-ai/*`）、UI 内置插件（`file:` 路径）、用户自有全家桶（`@linxin666/*`，走关联仓库入口）、皮肤类低活跃重复项
- ⚠️ 收录 ≠ 背书：第三方 `verified` 恒为 false；不开放归档与 checksum 自填

**不做的**：不替代官方平台包；不搬运第三方代码入库；不提供在线服务端（安装源 = git 仓库 + raw 静态托管）。

## 关键约定（违反会破坏仓库）

1. **新插件**：必须用 `node scripts/create-plugin.mjs <name>`（保证命名/结构与模板一致），禁止手抄目录。
2. **packages/* 一个插件一个目录**，构建产物 `lib/` 提交入库（git 源安装免构建）。
3. **改完插件必须重新生成索引与归档**：`node scripts/pack.mjs` + `node scripts/build-registry.mjs`（CI 会校验 registry/ 一致性，`--stable` 模式）。
4. **registry.json 是生成产物，禁止手改**；归档 `registry/packages/*.tgz` 必须提交。
5. **发布前无密钥**：publish.mjs / publish-all.mjs 内置密钥扫描（files 白名单含 lib/），命中即中止。
6. **安装源通道优先级**：local 归档（国内网络）→ npm → github；消费端 `node scripts/install-from-registry.mjs <name>`。
7. **命名与契约**：包名 `dsh-xxx` 或 `@scope/dsh-xxx`（lib/names.mjs 统一校验）；`install.github` 必须是 `owner/repo[#path:...]` 不带域名。

## 完成工作后的收尾

- [ ] `pnpm run typecheck && pnpm run build` 通过（涉及代码时）
- [ ] 索引/归档已同步（涉及插件变更时）
- [ ] README/文档随行为变更更新（新增收录时更新 README 收录清单）
- [ ] 敏感信息未入库

# AGENTS.md — AI 协作指南

本仓库是 DSH（DeepSeek Harness）插件总仓库：**多插件 monorepo 开发 + 插件安装源**。
任何 AI/人进入本仓库，先按此文件定位。

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

## 关键约定（违反会破坏仓库）

1. **新插件**：必须用 `node scripts/create-plugin.mjs <name>`（保证命名/结构与模板一致），禁止手抄目录。
2. **packages/* 一个插件一个目录**，构建产物 `lib/` 提交入库（git 源安装免构建）。
3. **改完插件必须重新生成索引**：`node scripts/build-registry.mjs`；发布流程用 `node scripts/publish.mjs <pkg> <patch|minor|major>`（自动构建+npm+归档+索引）。
4. **registry.json 是生成产物，禁止手改**；归档由 `node scripts/pack.mjs` 生成，`registry/packages/*.tgz` 必须提交。
5. **发布前无密钥**：publish.mjs 内置扫描会拦截（AK/SK、私钥、明文密钥赋值）。
6. **安装源通道优先级**：local 归档（国内网络）→ npm → github；消费端 `node scripts/install-from-registry.mjs <name>`。

## 完成工作后的收尾

- [ ] `pnpm run typecheck && pnpm run build` 通过（涉及代码时）
- [ ] 索引/归档已同步（涉及插件变更时）
- [ ] README/文档随行为变更更新
- [ ] 敏感信息未入库

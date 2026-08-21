# CONTRIBUTING — 贡献指南

本仓库是 DSH 插件总仓库。所有贡献（代码、文档、第三方收录）遵循以下约定。

## 提交信息（Conventional Commits）

```
<type>(<scope>): <subject>

type: feat | fix | docs | chore | refactor | test | security
scope: 插件包名（如 dsh-ssh）或仓库级域（registry / scripts / docs / ci）
```

示例：`fix(dsh-ssh): 连接池泄漏时正确释放句柄`

## 代码贡献流程

1. **新插件**：必须用 `node scripts/create-plugin.mjs <name>`（保证命名与结构一致），禁止手抄目录。
2. 开发：`packages/<name>/` 内完成，遵守 `docs/02-plugin-dev-guide.md` 检查清单。
3. 验证：`pnpm run typecheck && pnpm run build` 通过。
4. 索引/归档同步：涉及插件变更时执行 `node scripts/pack.mjs && node scripts/build-registry.mjs`，
   并确认 `registry/registry.json` 与归档一起提交（CI 会校验一致性）。
5. PR：说明变更动机 + 验证方式 + 影响面（agent 工具/GUI/安装通道）。

## 版本与发布

- 逐包语义化版本；`node scripts/publish.mjs <pkg> patch|minor|major`（自动构建+密钥扫描+归档+索引）。
- **发布必须同步更新 CHANGELOG**：在仓库根 `CHANGELOG.md` 追加条目（版本、日期、变更摘要）。
- 破坏性变更必须写迁移说明。

## 第三方收录（registry/third-party/）

- 每个插件一个 JSON，字段见 `registry/third-party/README.md`。
- **审核 checklist（收录前完成）**：
  - [ ] 源码可读、作者/仓库可追溯
  - [ ] 依赖树无异常（可疑包名、过多间接依赖）
  - [ ] 无危险 postinstall/build 脚本（或已评估）
  - [ ] 不索取本机敏感权限（密钥/网络/文件）或已注明
  - [ ] 许可证明确
  - [ ] 已声明受控 `npm`/`github` 安装通道（白名单校验）
- 审核记录：在 JSON 中加 `audit: { "date": "YYYY-MM-DD", "reviewer": "<github名>", "notes": "..." }`。
- **下架**：发现恶意依赖/投毒/许可证违规 → 删除 JSON → 重新生成索引 → 提交说明原因；必要时在 `docs/review/` 留记录。
- 收录 ≠ 背书：`verified` 恒为 false，安装即运行作者代码。

## 行为约定

- 不要手改 `registry/registry.json`（生成产物，改脚本或重新生成）。
- 不要在仓库内提交密钥（发布前密钥扫描会拦截）。
- 文档变更与代码变更同 PR；skills 为指针式，权威口径以 `docs/` 为准。

---
name: dsh-plugin-release
description: 发布 DSH 插件。当用户要求发布、升级版本、打 tag、同步安装源（npm / GitHub / registry）时使用。适用于 dsh-plugins 仓库。
---

# DSH 插件发布

流程细节见 `docs/03-release-flow.md` 与 `docs/04-install-source.md`。

## 发布通道

| 通道 | 命令 | 用途 |
|------|------|------|
| 本地归档 | `node scripts/pack.mjs <pkg>`（publish.mjs 自动执行） | 国内/离线，`file:` 安装 |
| npm | `node scripts/publish.mjs <pkg> patch|minor|major` | `dsh plugin add <pkg>` |
| GitHub 镜像 | `bash scripts/sync-github.sh` | `github:owner/repo`、workshop 安装 |
| registry.json | `node scripts/build-registry.mjs`（publish.mjs 自动执行） | 安装源目录 |

## 标准发布流程

1. **前置校验**：git 工作区干净；`pnpm run typecheck && pnpm run build` 通过；本地 profile 实测安装一次（`dsh plugin --profile web add <pkg>` + 重启验证）。
2. **升版本 + 构建 + 发布**：`node scripts/publish.mjs <pkg> patch`（`--no-npm` 跳过 npm，`--dry-run` 演练）。脚本会校验工作区、升版本、构建、npm 发布、打包归档到 registry/packages/、刷新 registry。
3. **git 收尾**：
   ```sh
   git add -A && git commit -m "feat(<pkg>): <说明>"
   git tag <pkg>@<新版本> && git push origin master --tags
   bash scripts/sync-github.sh
   ```
4. **聚合包联动**：若插件被聚合包依赖（如 `@linxin666/dsh-web-ui-all`），同步升聚合包版本并重新发布。

## 回滚

- npm：不可删版本，发修复版（patch+1）。
- 归档：删除 `registry/packages/<name>-<旧版本>.tgz` 并重新生成索引，提交即回滚。
- git tag：`git tag -d <tag> && git push origin :refs/tags/<tag>`（会破坏已装用户，谨慎）。
- registry：重新生成提交即可。

## 纪律

- 发布前实测安装，发布后确认 `registry/registry.json` 已更新（`meta.generatedAt` 变化）。
- 破坏性变更必须写迁移说明。
- 第三方收录仅更新元数据，不代发其代码。

# 03 · 发布流程

一个插件从开发到可被安装的完整链路。

## 通道总览

| 通道 | 命令 | 谁在用 |
|------|------|--------|
| 本地归档 | `node scripts/pack.mjs <pkg>`（publish.mjs 自动执行） | 国内/离线，`file:` 安装 |
| npm | `node scripts/publish.mjs <pkg> patch` | `dsh plugin add <pkg>` |
| GitHub 镜像 | `bash scripts/sync-github.sh` | `github:owner/repo`、workshop 一键安装 |
| registry.json | `node scripts/build-registry.mjs`（publish.mjs 自动执行） | 自建安装源/目录工具 |

建议顺序：**npm 发布 → 打包归档 → git 提交打 tag → 同步 GitHub → 更新 registry**
（归档与 registry 更新在 publish.mjs 内自动完成）。

## 1. 版本管理

- 语义化版本：修复 `patch`，加功能 `minor`，破坏性 `major`。
- 全家桶联动：若插件被聚合包依赖（如 `@linxin666/dsh-web-ui-all`），需同步升聚合包版本 —— 见 dsh-web-ui 仓库的发布约定。

## 2. 发布（npm 通道）

```sh
node scripts/publish.mjs dsh-my-tool patch
```

脚本行为：
1. 校验 git 工作区干净
2. `pnpm version patch --no-git-tag-version` 升版本
3. `pnpm run build && pnpm run typecheck`
4. `pnpm publish --access public`（`--no-npm` 跳过）
5. 打包归档到 `registry/packages/`（`node scripts/pack.mjs`）
6. 重新生成 `registry/registry.json`

## 3. git 通道（tag + 推送）

```sh
git add -A
git commit -m "feat(dsh-my-tool): <说明>"
git tag dsh-my-tool@0.2.1
git push origin master --tags      # Gitee 主源
bash scripts/sync-github.sh        # 镜像到 GitHub
```

## 4. 安装源目录更新

```sh
node scripts/build-registry.mjs    # 扫描 packages/ + third-party/ → registry.json
git add registry/registry.json && git commit -m "chore(registry): update catalog"
git push origin master
bash scripts/sync-github.sh
```

## 5. 回滚

- **npm**：npm 不支持删除已发布版本，发修复版（patch+1）替代。
- **归档**：删除 `registry/packages/<name>-<旧版本>.tgz` 并重新生成索引，提交即回滚（旧版本不再出现在 local 通道）。
- **git**：`git revert <commit>` 或 `git tag -d <tag> && git push origin :refs/tags/<tag>`（谨慎，会破坏已装用户）。
- **registry**：重新生成后提交即可，`meta.generatedAt` 记录时间。

## 6. 发布纪律

- 发布前在本地 profile **实测安装一次**：`dsh plugin --profile web add <pkg>`，重启验证。
- 发布后更新 CHANGELOG（如有）与 README 安装说明。
- 破坏性变更必须写迁移说明。

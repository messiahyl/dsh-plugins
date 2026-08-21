# 08 · 故障排查

按现象找原因与处置。所有命令默认在仓库根目录执行。

## 安装类

| 现象 | 原因 | 处置 |
|------|------|------|
| `install-from-registry.mjs <name>` 报"索引中未找到插件" | 插件不在 registry.json | `node scripts/install-from-registry.mjs --list` 看全量；本地索引过期则先 `node scripts/build-registry.mjs`；远端索引用 `--remote` |
| 报"通道 auto 不可用。可用: " | 该条目无 install 字段（第三方未声明 npm/github，或本地插件无任何通道） | 第三方：访问条目 `url` 手动安装；本地：确认 `packages/*/package.json` 存在且 `build-registry.mjs` 已跑 |
| 报"sha256 校验失败" | 归档下载损坏或被篡改，或索引 checksum 过期 | 重新 `node scripts/pack.mjs <name> && node scripts/build-registry.mjs`；仍失败则对比 Gitee raw 与索引 checksum |
| 报"索引无 checksum，默认拒绝安装" | 归档存在但索引未重新生成（checksum 缺失） | `node scripts/build-registry.mjs` 后重试。**不要**随手加 `--no-verify`——它绕过校验，仅在你确认来源可信且索引确实过期时使用 |
| `--remote` 拉取失败 | 网络到 Gitee raw 不通 | 检查网络；或 clone 仓库后去掉 `--remote` 用本地索引 |
| 安装后重启 `dsh web` 无变化 | bundle 未生效或插件实例被禁用 | 检查 `~/.dsh/profiles/web/cordis.patch.yml` 中该实例是否 `disabled: true`；确认 `dsh.profile.bundles` 含该包 |

## 构建/发布类

| 现象 | 原因 | 处置 |
|------|------|------|
| `pnpm run typecheck` 报 `Cannot find type definition file for 'node'` | 包缺 `@types/node` 依赖 | 在包 `devDependencies` 加 `@types/node`（模板已含）；根目录 `pnpm install` 后重试 |
| `tsdown` 报 `transformPlugin` / 版本行为异常 | tsdown 与 rolldown 版本不匹配 | 对齐模板版本：`tsdown 0.22.2` + `typescript ~5.7.2` |
| `publish.mjs` 报"检测到疑似密钥" | 发布产物含密钥模式（或误报，如测试字符串） | 删除/改写命中行后重试；确认误报可调整 `scripts/lib/scan-secrets.mjs` 正则 |
| `publish.mjs` 报"git 工作区不干净" | 有未提交改动 | `git status` 查看；提交或 stash 后重试 |
| `publish-all.mjs` 提示"已存在于 npm，跳过" | 该版本已发布（脚本不递增版本） | 升版本请用 `node scripts/publish.mjs <pkg> patch` 逐包发布 |
| `pack.mjs` 退出码非 0 | 有包打包失败 | 看输出中 ✗ 项；常见为依赖未装或构建产物缺失 |

## 索引/目录类

| 现象 | 原因 | 处置 |
|------|------|------|
| `registry.json` 与提交内容不一致（CI 报错） | 改了 packages/ 或 third-party/ 但没重新生成 | `node scripts/pack.mjs && node scripts/build-registry.mjs` 后提交 |
| 第三方条目在安装器里不可用 | third-party JSON 未声明 `npm`/`github` 字段（build-registry 白名单校验） | 在 `registry/third-party/<name>.json` 补合法 `npm` 包名或 `github: owner/repo` 字段 |

## 安全边界速记

- `--no-verify` 绕过 checksum 校验——**仅**在确认索引过期且来源可信时使用。
- 第三方插件 `verified` 恒为 false：安装 = 本机运行作者代码，先审查依赖与 postinstall 脚本。
- 插件依赖的 postinstall 脚本风险：消费端用 pnpm `onlyBuiltDependencies` / `ignoredBuiltDependencies` 白名单限制。

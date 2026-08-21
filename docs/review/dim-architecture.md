# 架构与一致性评审 · dsh-plugins

> 评审维度：目录职责 / DSH 机制一致性 / 索引-归档-收录数据流 / 脚本链边界 / 结构性冗余与缺失
> 依据：`docs/01-architecture.md`（机制核对）、`AGENTS.md`、`scripts/*.mjs`、`registry/*`、`.github/workflows/ci.yml`、`packages/_template`、`docs/04/05`
> 关键事实均经 node 实测或源码逐行核对，非推断。

## 总体结论

仓库的五块目录职责（packages 源码 / registry 安装源 / docs 文档 / skills 技能 / scripts 工具）总体清晰，以 `packages/*/package.json` 为单一事实源、索引与校验和全生成的设计方向正确，第三方白名单合并的信任边界尤为严谨。但**安装通道与脚本链存在多处"生成器 / 消费器 / 白名单 / 文档"四方契约不一致的实锤**：github 通道当前实际不可用（字段格式与正则互斥）、scoped 包命名从 create 起即与发布链断裂、CI 一致性门禁逻辑上必然失败、pack 失败被静默吞掉。这些不是风格问题，是"声称可用但实际走不通"的功能性缺陷，建议在引入第一个真实插件前按以下清单修复。

## 问题清单

| 严重度 | 标题 | 详情 | 建议 |
|--------|------|------|------|
| critical | CI 一致性门禁必然失败 | `.github/workflows/ci.yml` 第 34-38 行：①`node scripts/pack.mjs` 在当前 packages/ 仅含 `_template` 时，因 `_template` 被过滤（pack.mjs 第 28-30 行）而 `targets.length === 0` → `process.exit(1)`（已实测退出码 1），CI job 直接红；②即使补上真实插件，`build-registry.mjs` 第 118 行 `generatedAt: new Date().toISOString()` 每次再生必产生新时间戳，第 38 行 `git diff --exit-code registry/` 必然有 diff。门禁自相矛盾：既要求"生成产物提交入库"（AGENTS.md 第 4 条），又不允许再生出差异，而生成物本身含时间戳。 | pack.mjs 空目录改 warn + exit 0（或 CI 前置判断 packages 存在真实包）；`generatedAt` 改为确定性值（按插件集合内容哈希派生，或移除该字段、以 `meta.schemaVersion` + `meta.source` 替代）；CI 的 diff 校验仅对 `registry.json` 生效，归档 `.tgz` 只做存在性 + 版本匹配校验。 |
| major | github 安装通道三方契约不一致，实际不可用 | `build-registry.mjs` 第 59 行生成的 `install.github` = `github.com/messiahyl/dsh-plugins#path:packages/<dir>`（带域名）；`scripts/lib/names.mjs` 第 30 行 `GITHUB_SPEC_RE` 只接受 `owner/repo[#path:...]`（已实测对域名式返回 false）；`install-from-registry.mjs` 第 148 行再拼 `github:${install.github}` 成 `github:github.com/...`，而 pnpm 的 `github:` 协议要求 `github:owner/repo`。三处各写各的：auto 模式选到 github 通道即被 `assertSafeSpec` 拒绝并 exit(1)；且 docs/04 第 64 行示例（`github:<owner>/dsh-plugins#path:...`）与 docs/05 第 49 行字段示例（`github.com/...`）本身也不一致。 | 统一契约并让生成器对齐白名单：`install.github` 存 `messiahyl/dsh-plugins#path:packages/<dir>`（owner/repo 式），消费端拼 `github:${...}` 即为合法 spec；`GITHUB_SPEC_RE` 作为唯一校验方，docs/05 字段示例同步修正。 |
| major | @scope/dsh-x 命名从 create 起与发布/安装链断裂 | `create-plugin.mjs` 第 26-42 行支持 `@scope/dsh-x` 命名，但落盘到 `packages/dsh-x`（去 scope 的目录名），且第 78 行提示 `node scripts/publish.mjs @scope/dsh-x patch`；而 `publish.mjs` 第 42 行 `join(ROOT,'packages',name)`、`pack.mjs` 第 38 行、`install-to-profile.mjs` 第 50 行 `resolve(ROOT,'packages',t)` 全部按"包名=目录名"解析 —— scoped 包在 publish/install/install-to-profile 三环节必然报"未找到插件包"，create 之后无法闭环。 | `lib/names.mjs` 增加 `pkgDirOf(name) = name.split('/')[1]` 作为唯一"包名→目录"映射，publish/pack/install-to-profile 统一调用，create-plugin 的下一步提示改传目录名；或在 create 阶段直接拒绝 @scope（当前无真实 scoped 插件，可先简化）。 |
| major | pack.mjs 打包失败静默吞掉，发布链伪成功 | `pack.mjs` 第 53-55 行 catch 仅 `console.error` 不 `process.exit(1)`，失败包被跳过但整体退出码 0；`publish.mjs` 第 93 行与 `publish-all.mjs` 第 69 行据此继续，`build-registry.mjs` 随后生成"无归档"索引并打印成功 —— 用户以为 local 通道已更新，实际归档缺失。且 pack.mjs 第 50 行仅用日志正则猜测 pnpm 输出的 tgz 文件名，`build-registry.mjs` 第 31 行 `archiveOf()` 独立再猜一次，两处猜测互不校验，pnpm 文件名规则变化即静默失配。 | pack.mjs 统计失败数，>0 时 exit(1) 并汇总失败清单；build-registry 改为以 `registry/packages/` 实际存在的 tgz 文件名为准反查归属包（或 pack.mjs 输出 manifest 文件），消除双猜测。 |
| minor | install.gitee 通道是死字段，无任何消费方 | `build-registry.mjs` 第 58 行生成 `install.gitee`，但 `install-from-registry.mjs` 第 105 行 channels 只枚举 `['local','npm','github']`，pnpm 也无 `gitee:` spec 协议；docs/04 第 17 行已明确"workshop 与 github: 只认 GitHub，Gitee 只能作代码主源 + 归档静态源"。该字段会误导消费端认为存在可安装通道，实际不可安装。 | 删除 `install.gitee` 字段（Gitee 角色已由 `install.local` 的 raw URL 与顶层 `url` 覆盖），docs/05 第 31 行字段表同步删除；若保留则必须在 schema 中标注"仅展示、不可安装"。 |
| minor | 第三方收录条目无法被本仓库安装器安装且无引导 | build-registry 对 third-party 刻意不生成 `install`/`archive` 字段（第 85-101 行，防伪造通道），`install-from-registry.mjs` 第 106 行 `channels.find` 对无 install 的插件返回 undefined，第 108-111 行报"通道 auto 不可用。可用: （空）"并退出 —— 当前索引 2/2 条目全部不可安装，用户只得到一句空列表报错，无任何引导。 | 安装器对第三方条目输出明确提示："第三方收录、无内置安装通道（verified=false），请访问其 url 手动安装"；或 build-registry 为第三方生成 `install.npm`（npm 包名是公开事实，可通过 `NPM_SPEC_RE` 白名单校验）。 |
| suggestion | registry.json 无 schemaVersion，兼容声明无验证闭环 | 顶层仅 `meta.generatedAt/source/count`（build-registry 第 116-124 行），`install/archive/verified` 等自有扩展字段的演进无版本协商机制，消费端无法判断字段是否存在；docs/05 第 60 行宣称"兼容 dsh-recommend"，但仓库内唯一消费方 `install-from-registry.mjs` 只读自家字段，无任何 dsh-recommend / dsh-workshop 格式的消费验证。 | meta 增加 `schemaVersion: 1`；用 dsh-recommend 或 dsh-workshop 的真实解析逻辑做一次兼容性冒烟（如 CI 增加"按消费端 schema 校验 registry.json"一步）。 |
| suggestion | 文档与模板存在重复/冗余 | 四通道表与更新流程在 `docs/04-install-source.md`、`docs/05-catalog-schema.md`、`registry/README.md` 三处重复编写，`docs/07-solution-design.md` 又整篇复述 docs/01-06，存在漂移风险（github 通道示例三处写法不一即已发生漂移）；`packages/_template/lib/` 的占位构建产物（dsh-xxx 名）随仓库提交，而 `create-plugin.mjs` 第 49-52 行复制时显式排除 lib/，说明它对新插件无用途。 | docs/07 定位为设计总纲，`registry/README.md` 只保留目录内速查并指向 docs/04/05；`_template/lib` 加入仓库级 `.gitignore`（模板构建产物不提交，新插件自行构建）。 |

## 亮点

- **单一事实源设计**：索引条目、local 归档 URL、sha256 校验和全部由 `packages/*/package.json` 生成（build-registry.mjs），杜绝多套元数据漂移，方向正确。
- **第三方信任边界严谨**：白名单合并强制 `verified=false`、不开放 `install`/`archive` 字段，从结构上杜绝第三方自证背书与伪造安装通道（已修的 `...item` 覆盖漏洞进一步加固了这一点）。
- **公共模块化**：命名规约（`lib/names.mjs`）与密钥扫描（`lib/scan-secrets.mjs`）被 5 个脚本复用，`spawnSync` 参数数组 + install 字段白名单的安装器安全基线到位。
- **local 归档通道闭环**：tgz + sha256 + 缺失默认拒绝 + `--no-verify` 显式逃生口，针对国内网络痛点的设计完整且安全默认。
- **脚本链职责分层清晰**：create（脚手架）→ install-to-profile（link 开发调试）→ publish（构建/扫描/npm/归档/索引串链）→ install-from-registry（消费端），命名校验前置，边界总体合理；CI 检查 typecheck/build/pack/registry 一致性的方向正确（实现缺陷见 critical 项）。

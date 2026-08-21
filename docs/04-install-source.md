# 04 · 安装源说明

本仓库作为 **DSH 插件安装源** 的通道设计，含解决国内网络问题的本地归档通道。

## 背景：DSH 安装的本质

DSH 的 `dsh plugin --profile <name> add <spec>` 本质是 pnpm 安装 + bundle 注册：

| spec 形式 | 含义 | 适用场景 |
|-----------|------|----------|
| `dsh-xxx` | npm 包 | 公共分发 |
| `github:owner/repo` | GitHub 仓库（含 `#path:` 子目录） | 社区安装、workshop |
| `file:path.tgz` | 本地/下载的安装包归档 | 离线、国内网络 |
| `link:/abs/path` | 本地目录 | 开发调试 |
| `git+https://...` | 任意 git 仓库 | 私有分发 |

**关键约束**：workshop 与 `github:` 安装只认 GitHub；Gitee 只能作为代码主源 + 归档静态源。

## 通道 A：本地安装包归档（推荐，解决网络问题）

`node scripts/pack.mjs` 把插件 `pnpm pack` 成 `.tgz` 放入 `registry/packages/`，
随仓库提交到 Gitee（国内下载快、不依赖 npm/GitHub 可达性）。
归档带 **sha256 校验和**（索引 `archive.checksum`），下载后校验防篡改/损坏。

推荐用本仓库安装器（自动选通道 + 校验）：

```sh
node scripts/install-from-registry.mjs dsh-xxx          # auto: local → npm → github
node scripts/install-from-registry.mjs dsh-xxx --source local   # 强制 local
node scripts/install-from-registry.mjs dsh-xxx --remote         # 远端索引（另一台机器）
```

或手动：

```sh
curl -LO https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/packages/dsh-xxx-0.1.0.tgz
dsh plugin --profile web add file:./dsh-xxx-0.1.0.tgz
```

> 注意：归档内的**运行时依赖**首次安装仍需解析（可配置 npmmirror 镜像），
> 平台供给的 react / @deepseek-ai 运行时为 peerDependencies，不额外下载。

## 通道 B：registry.json（目录源）

`registry/registry.json` 由 `node scripts/build-registry.mjs` 生成，字段兼容 dsh-recommend 的展示子集
（name/owner/url/description/stars 等），并扩展自有字段（install/verified/archive/schemaVersion）。
可被两类消费者使用：

1. **workshop 风格安装器**：读取 registry → 展示卡片 → 按 `install` 通道（local → npm → github）执行安装。
2. **自研/脚本**：解析 `install` 字段选择通道。

托管方式：Gitee raw（`https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json`）
或 Gitee Pages。消费端每次拉取最新目录。

## 通道 C：npm

每个 packages/ 插件独立发布 npm（`node scripts/publish.mjs <pkg> patch`）。
npm 优先被 workshop 使用（npm 快、免构建）；发布到公共 registry 即人人可装。

## 通道 D：GitHub 镜像

`bash scripts/sync-github.sh` 把仓库镜像到 `github.com/<owner>/dsh-plugins`。
镜像后每个插件可直接安装：

```sh
dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/dsh-ssh
```

且仓库若命中 dsh-recommend 的扫描规则（仓库名/话题含 dsh-plugin 等），
会自然出现在社区 workshop 目录中，获得曝光。

## 使用建议

- **国内/多台机器**：优先**本地归档**通道（Gitee raw 直连），其次 npm 配 npmmirror。
- **给他人用**：npm 发布 + 更新 registry + 打包归档 + GitHub 镜像，四通道齐发。
- **内网/私有**：`link:` 或私有 git 源，归档可放内网静态服务。

## 安全边界

- registry 收录 ≠ 安全背书：第三方插件代码不在仓库内，安装 = 本机运行作者代码；`verified` 恒为 false，背书需独立维护者清单。
- **依赖生命周期脚本风险（postinstall）**：插件的 npm 依赖可能带 `postinstall`/`build` 脚本（如原生模块、下载二进制），安装时会在本机执行任意代码。消费端建议用 pnpm 的
  `onlyBuiltDependencies` / `ignoredBuiltDependencies` 白名单机制限制，并审查插件依赖。
- 有执行/写文件/高成本操作的插件，安装文档必须注明，agent 侧工具要求先确认。
- 归档校验：安装器默认要求索引携带 sha256 checksum，缺失/不匹配默认拒绝（`--no-verify` 是显式逃生口，仅信任来源时使用）。
- dsh web 若暴露公网，安装类接口应做来源校验（参考 dsh-workshop 的同源拒绝策略）。

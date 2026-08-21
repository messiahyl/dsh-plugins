# 04 · 安装源说明

本仓库作为 **DSH 插件安装源** 的三通道设计。

## 背景：DSH 安装的本质

DSH 的 `dsh plugin --profile <name> add <spec>` 本质是 pnpm 安装 + bundle 注册：

| spec 形式 | 含义 | 适用场景 |
|-----------|------|----------|
| `dsh-xxx` | npm 包 | 公共分发 |
| `github:owner/repo` | GitHub 仓库（含 `#path:` 子目录） | 社区安装、workshop |
| `link:/abs/path` | 本地目录 | 开发调试 |
| `git+https://...` | 任意 git 仓库 | 私有分发 |

**关键约束**：workshop 与 `github:` 安装只认 GitHub；Gitee 只能作为代码主源 + registry 静态源。

## 通道 A：registry.json（目录源）

`registry/registry.json` 由 `node scripts/build-registry.mjs` 生成，兼容 dsh-recommend 字段超集。可被两类消费者使用：

1. **workshop 风格安装器**：读取 registry → 展示卡片 → `dsh plugin add` 执行安装。
2. **自研/脚本**：解析 `install` 字段选择通道。

托管方式：Gitee raw（`https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json`）
或 Gitee Pages。消费端每次拉取最新目录。

## 通道 B：npm

每个 packages/ 插件独立发布 npm（`node scripts/publish.mjs <pkg> patch`）。
npm 优先被 workshop 使用（npm 快、免构建）；发布到公共 registry 即人人可装。

## 通道 C：GitHub 镜像

`bash scripts/sync-github.sh` 把仓库镜像到 `github.com/<owner>/dsh-plugins`。
镜像后每个插件可直接安装：

```sh
dsh plugin --profile web add github:<owner>/dsh-plugins#path:packages/dsh-ssh
```

且仓库若命中 dsh-recommend 的扫描规则（仓库名/话题含 dsh-plugin 等），
会自然出现在社区 workshop 目录中，获得曝光。

## 使用建议

- **自己多台机器**：优先 npm 或 GitHub 镜像（Gitee 直连国内更快时用 `git+https://gitee.com/...`）。
- **给他人用**：npm 发布 + 更新 registry + GitHub 镜像，三通道齐发。
- **内网/私有**：`link:` 或私有 git 源，registry.json 走内网静态服务。

## 安全边界

- registry 收录 ≠ 安全背书：第三方插件代码不在仓库内，安装 = 本机运行作者代码。
- 有执行/写文件/高成本操作的插件，安装文档必须注明，agent 侧工具要求先确认。
- dsh web 若暴露公网，安装类接口应做来源校验（参考 dsh-workshop 的同源拒绝策略）。

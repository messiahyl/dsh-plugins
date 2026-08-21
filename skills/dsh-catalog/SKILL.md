---
name: dsh-catalog
description: 维护 DSH 插件安装源目录（registry）。当用户要求管理插件目录、收录第三方插件、更新 registry.json、查看/筛选安装源列表时使用。适用于 dsh-plugins 仓库。
---

# DSH 插件目录（安装源）维护

本仓库的安装源核心是 `registry/registry.json`（由 `node scripts/build-registry.mjs` 生成）。
格式定义见 `docs/05-catalog-schema.md`。

## 数据来源

| 来源 | 位置 | source 值 | 维护方式 |
|------|------|-----------|----------|
| 本仓库插件 | `packages/*/package.json` | `local` | 自动扫描 |
| 安装包归档 | `registry/packages/*.tgz`（`node scripts/pack.mjs` 生成） | — | 打包后自动登记 `install.local` / `archive` |
| 第三方收录 | `registry/third-party/*.json` | `third-party` | 人工写元数据 |

## 工作流

1. **本地插件变更**：改 `packages/` 后执行 `node scripts/pack.mjs`（可选，用于归档）与 `node scripts/build-registry.mjs` 重新生成。
2. **收录第三方**：在 `registry/third-party/<name>.json` 写元数据（name 必填；url/description/tags/license 建议齐全；`verified: false` 默认），再生成。
3. **发布目录**：
   ```sh
   git add registry/ && git commit -m "chore(registry): update catalog"
   git push origin master && bash scripts/sync-github.sh
   ```

## 收录规则

- **收录 ≠ 背书**：只登记元数据（名称/来源/描述），不搬运代码；安装即运行作者代码，文档注明风险。
- **审查建议**：源码可读性、依赖风险、构建脚本（postinstall）、敏感权限（密钥/网络/文件）——有高风险的在 description 或 tags 注明。
- **去重**：同名插件以本仓库 local 优先（build-registry.mjs 已处理）。
- **分类 tags**：tool / ui / workflow / notification / dev / fun。

## 消费者对接

- workshop 风格安装器：读 registry.json → 卡片渲染 → `dsh plugin add <install.npm || install.github>`。
- 第三方目录（dsh-recommend）机制不同：其 registry 由 GitHub 话题抓取生成，本仓库 registry 是自有安装源，两者可共存。

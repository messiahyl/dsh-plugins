---
name: dsh-plugin-dev
description: 开发 DSH（DeepSeek Harness）插件。当用户要求新建、修改、调试 dsh 插件（dsh-* 包、cordis patch、agent 工具、web GUI 面板、双面插件）时使用。适用于 dsh-plugins 仓库内的插件开发。
---

# DSH 插件开发

在 `dsh-plugins` 仓库（monorepo，`packages/*` 一个插件一个目录）内开发 DSH 插件。
完整原理见 `docs/01-architecture.md` 与 `docs/02-plugin-dev-guide.md`，动手前先读这两篇。

## 核心概念速查

- **插件 = npm 包 + dsh 声明**：`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`（注册插件实例）；`dsh.client` 声明浏览器半。
- **双面插件**：host 半（`src/host/index.ts`，node 进程：agent 工具 + `/api/...` 路由） + browser 半（`src/client/`，web GUI，经 `window.__ModuleLoader__.load` 装载）。
- **agent 工具**：host 半 `ctx.tool?.register('name', { description }, async (args) => ...)`；description 写清触发场景/参数/返回值。
- **实例 id**：`cordis.patch.yml` 的 `id` 取包名 `dsh-` 后的部分。
- **构建**：tsdown 双构建（host esm → `lib/host/`，client cjs banner → `lib/client.js`），产物提交 `lib/`。
- **安装**：`dsh plugin --profile web add link:<绝对路径>` 本地调试；装完重启 `dsh web`。

## 工作流

1. **新建插件**：`node scripts/create-plugin.mjs <名称>`（自动复制 `packages/_template` 并替换占位符），然后：
   - 编辑 `package.json`（name/description）
   - 写 `src/host/index.ts`（能力）与 `src/client/`（GUI）
   - 更新 `cordis.patch.yml` 与 README
2. **本地调试**：`node scripts/install-to-profile.mjs <名称>` → 重启 `dsh web`；改 client 半浏览器强刷即可。
3. **验证**：`pnpm run typecheck`、`pnpm run build`；agent 工具在会话里实际调用一次；GUI 打开面板检查。
4. **收尾**：`node scripts/build-registry.mjs` 更新安装源目录；按 `docs/03-release-flow.md` 发布。

## 检查清单（提交前）

- [ ] 命名合规：`dsh-<name>` 或 `@<scope>/dsh-<name>`，实例 id 无 `dsh-` 前缀
- [ ] host 半有 dispose（清连接/定时器）
- [ ] agent 工具 description 自包含、敏感操作注明"先确认"
- [ ] 无密钥硬编码；`files` 只含 lib/ 与 cordis.patch.yml
- [ ] `pnpm run typecheck && pnpm run build` 通过
- [ ] README 有安装方式与限制说明

# 09 · 本机已安装插件盘点与评估

> 盘点对象：`~/.dsh/profiles/web` 的 package.json（29 个依赖项）
> 评估标准：**高价值 = 本机在用 + 维护活跃（有明确仓库/较高版本）+ 功能实用**；
> 收录方式见 `registry/third-party/README.md` 与 `CONTRIBUTING.md`。

## 一、分类总览

| 类别 | 数量 | 处置 |
|------|------|------|
| 官方平台包（`@deepseek-ai/dsh-*`：lsp/lsp-stdio/tool-lsp） | 3 | **不收录**（平台基础设施，随 DSH 发行） |
| 用户全家桶（`@linxin666/dsh-web-ui-all` 及 16 个子包） | 17 | **不逐包收录**，以聚合包 `dsh-web-ui-all` 为关联仓库入口（见 README 关联仓库） |
| UI 自带内置（`file:` 路径：dsh-deep-ui / dsh-remote / dsh-workshop-vendor） | 3 | **不收录**（随发行/本地 vendor） |
| 高价值社区插件 | 18 | ✅ 已收录进 `registry/third-party/` |

## 二、已收录的 18 个高价值插件

| 插件 | 价值点 | 安装通道 |
|------|--------|----------|
| `dsh-auto-memory` | 三层记忆自动注入/沉淀/反思，用户每日使用 | github |
| `dsh-undo-savepoint` | 配置快照/撤销/安全模式，用户每日使用 | github |
| `dshmarket` | 可视化插件市场，1.14.x 活跃维护 | github |
| `dsh-workshop` | 创意工坊商店，镜像加速一键安装 | github |
| `dsh-mcp-manager` | MCP 服务器 Web 管理 | github |
| `dsh-config-manager` | 配置备份/导出/导入/迁移 | github |
| `dsh-plugin-sync` | 插件清单 Gist 同步，多机迁移利器 | github |
| `dsh-plugin-manager` | 图形化插件启停（热生效） | github |
| `dsh-browser` | Playwright 浏览器自动化（agent 工具） | github |
| `dsh-chinese-mode` | 全局中文模式注入 | github |
| `dsh-better-sidebar` | VSCode 式右侧边栏 | npm |
| `dsh-web-ui-notify` | 审批/提问桌面通知 | github |
| `dsh-automation` | 定时任务自动化 | github |
| `dsh-inspiration-deck-workshop` | 本地 HTML 演示文稿工作台 | github |
| `dsh-lsp-actions` | LSP 诊断/格式化/补全面板 | github |
| `dsh-douyin` | 侧栏短视频（娱乐） | github |
| `dsh-skin` / `dsh-dream-skin` | 换肤 + 壁纸（皮肤类代表） | github |

## 三、未收录项及理由

| 项 | 理由 |
|----|------|
| `@deepseek-ai/dsh-lsp` 系列 | 官方平台基础设施，随 DSH 版本发行 |
| `@linxin666/*` 全家桶 17 包 | 用户自有仓库（zhu1090093659/dsh-web-ui）维护，避免双源；入口=聚合包 web-ui-all |
| `dsh-deep-ui` / `dsh-remote` | DeepSeek Harness UI 应用内置（file: 路径） |
| `dsh-liquid-glass` / `dsh-client-ui-skin-maid-atelier` / `dsh-deep-whale` | 皮肤类低活跃/重复，暂不收（后续按需） |

## 四、评估规则（沉淀）

1. **高价值判定**：本机在用 > 维护活跃 > 功能实用 > 生态代表性；纯娱乐/皮肤类按需收录代表。
2. **收录动作**：写 `registry/third-party/<name>.json`（含受控 `npm`/`github` 通道）→ `build-registry.mjs` → 提交。
3. **双源规避**：用户自有/官方维护的插件不重复收录源码，只收元数据或留关联仓库入口。
4. **周期性重评**：新装插件后补录；版本停更超 1 年的标记 `stale` tag。

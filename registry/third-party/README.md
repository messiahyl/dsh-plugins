# third-party/ — 第三方插件收录

每个插件一个 JSON 文件，文件名 = 插件名（当前收录 18 个，来源评估见 `docs/09-local-plugin-inventory.md`）。

**收录 ≠ 安全背书**：第三方插件代码不在本仓库内，安装即在本机运行作者代码。
收录前必须完成 `CONTRIBUTING.md` 的审核 checklist（源码可读/依赖树/postinstall/敏感权限/许可证）。

## 字段约定

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 插件包名 |
| `owner` / `fullName` / `url` | ✅ | 来源信息 |
| `description` | ✅ | 一句话描述（中英皆可） |
| `tags` | | 分类（tool / ui / workflow / notification / dev / fun / skin / memory） |
| `license` / `language` | | 元数据 |
| `npm` | 二选一 | 受控安装通道：npm 包名（build-registry 白名单校验） |
| `github` | 二选一 | 受控安装通道：`owner/repo`（不带域名/前缀，白名单校验） |
| `audit` | 建议 | 审核记录：`{ "date": "YYYY-MM-DD", "reviewer": "<github名>", "notes": "..." }` |

**注意**：
- `verified` 由 build-registry 强制恒 false（第三方不得自证背书），JSON 中无需填写。
- 不开放 `local` 归档与 `archive`/`checksum` 自填（防伪造安装通道）。
- 至少声明一个受控通道，否则安装器对该条目报"通道不可用"。

## 收录评估维度（与 docs/09 一致）

1. **高价值判定**：本机在用 > 维护活跃（有明确仓库/较高版本）> 功能实用 > 生态代表性。
2. **双源规避**：官方平台包（`@deepseek-ai/*`）、UI 内置（`file:`）、用户自有全家桶（`@linxin666/*`）不收录。
3. **停更标记**：版本停更超 1 年加 `"tags": ["stale"]`。

## 示例

```json
{
  "name": "dsh-community-example",
  "owner": "example-owner",
  "fullName": "example-owner/dsh-community-example",
  "url": "https://github.com/example-owner/dsh-community-example",
  "description": "社区插件示例",
  "tags": ["tool"],
  "license": "MIT",
  "github": "example-owner/dsh-community-example",
  "audit": { "date": "2026-08-21", "reviewer": "messiahyl", "notes": "源码可读，无 postinstall" }
}
```

收录后执行 `node scripts/build-registry.mjs` 并提交（CI 校验一致性）。

# 05 · registry.json 格式定义

`registry/registry.json` 是安装源注册表，由 `node scripts/build-registry.mjs` 自动生成。

## 顶层结构

```jsonc
{
  "meta": {
    "generatedAt": "2026-08-21T10:00:00.000Z",  // 生成时间
    "source": "https://gitee.com/messiahyl/dsh-plugins",
    "count": 12,          // 插件总数
    "localCount": 8,      // 本仓库插件数
    "thirdPartyCount": 4  // 第三方收录数
  },
  "plugins": [ /* 见下 */ ]
}
```

## 插件条目字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 包名，如 `dsh-ssh` |
| `owner` | string | ✅ | 维护者 |
| `fullName` | string | ✅ | `owner/name` 形式 |
| `url` | string | ✅ | 源码/详情地址 |
| `description` | string | ✅ | 一句话描述（中英皆可） |
| `version` | string | 本地 | 当前版本 |
| `source` | `"local"` \| `"third-party"` | ✅ | 来源 |
| `install` | object | 本地 | 安装通道：`local` / `npm` / `gitee` / `github` |
| `archive` | object \| null | 本地 | 安装包归档：`{ file: "<name>-<ver>.tgz", version }`，无归档为 null |
| `verified` | boolean | ✅ | 是否经本仓库审查（本地插件=true，第三方默认 false） |
| `tags` | string[] | | 分类标签（tool / ui / workflow / notification / dev / fun） |
| `license` | string | | 许可证 |
| `language` | string | | 主要语言 |
| `stars` / `forks` / `openIssues` | number | | 兼容 dsh-recommend 的社区数据（本地插件为 0） |
| `archived` / `fork` | boolean | | 兼容字段 |

```jsonc
{
  "name": "dsh-ssh",
  "version": "0.2.6",
  "source": "local",
  "install": {
    "local":  "https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/packages/dsh-ssh-0.2.6.tgz",
    "npm":    "dsh-ssh",
    "gitee":  "https://gitee.com/messiahyl/dsh-plugins#path:packages/dsh-ssh",
    "github": "github.com/messiahyl/dsh-plugins#path:packages/dsh-ssh"
  },
  "archive": { "file": "dsh-ssh-0.2.6.tgz", "version": "0.2.6" }
}
```

`install.local` 与 `archive` 由 build-registry.mjs 扫描 `registry/packages/` 自动填充。
安装器建议的通道优先级：**local（免网络）→ npm → github**。

## 兼容性说明

- **兼容 dsh-recommend**：`name/owner/fullName/url/description/stars/forks/openIssues/archived/fork/language/license` 字段名一致，消费端可按相同逻辑渲染。
- **自有扩展**：`version/source/install/verified/tags` 为安装执行提供信息，不影响兼容字段消费。

## 消费示例

```js
// workshop 风格：读目录 → 渲染 → 按 install 通道执行
const reg = await fetch('https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json').then(r => r.json())
for (const p of reg.plugins) {
  // 展示卡片: p.name / p.description / p.verified 徽标
  // 一键安装: local 优先（下载 tgz → file: 安装），失败回退 npm / github
  if (p.install?.local) {
    // curl -LO p.install.local && dsh plugin add file:./<archive.file>
  } else {
    // dsh plugin add ${p.install.npm || p.install.github}
  }
}
```

## 维护规则

- **不要手改 registry.json**：它由脚本生成，手改会被下次生成覆盖。
- 新增本地插件：开发完成后自动被扫描进目录（需重新生成）。
- 打包归档：`node scripts/pack.mjs`（publish.mjs 发布时自动执行）。
- 收录第三方：在 `registry/third-party/<name>.json` 写元数据，重新生成。
- 变更后 `git add registry/` 提交，并同步 GitHub 通道。

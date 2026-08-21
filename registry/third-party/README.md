# third-party/ — 第三方插件收录

每个插件一个 JSON 文件，文件名 = 插件名。字段与 registry.json 条目一致
（name 必填，其余可选，缺省由 build-registry.mjs 补默认值）。

**收录 ≠ 安全背书**：第三方插件代码不在本仓库内，安装即在本机运行作者代码。
收录前建议审查：源码可读性、依赖、是否有危险的构建脚本（postinstall）、
是否需要本机敏感权限（密钥/网络/文件）。

## 示例

```json
{
  "name": "dsh-community-example",
  "owner": "example-owner",
  "fullName": "example-owner/dsh-community-example",
  "url": "https://github.com/example-owner/dsh-community-example",
  "description": "社区插件示例",
  "tags": ["tool"],
  "verified": false,
  "license": "MIT"
}
```

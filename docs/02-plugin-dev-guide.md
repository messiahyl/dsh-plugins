# 02 · 插件开发指南

## 0. 快速开始

```sh
# 1. 脚手架（自动复制模板并改名）
node scripts/create-plugin.mjs dsh-my-tool

# 2. 装依赖 + 开发
cd packages/dsh-my-tool
pnpm install
pnpm run watch        # 增量构建

# 3. 本地调试（link 模式，改完重启 dsh web 生效）
node scripts/install-to-profile.mjs dsh-my-tool
dsh web
```

## 1. 命名与包结构

- 包名：`dsh-<name>` 或 `@<scope>/dsh-<name>`；cordis 实例 id 取 `dsh-` 后的部分。
- 目录：`packages/<name>/`，一个插件一个目录，独立版本、独立发布。
- 构建产物提交 `lib/`（保证 git 源安装无需构建）。

```
packages/dsh-my-tool/
├── package.json          # dsh.bundle.patch + dsh.client + exports
├── cordis.patch.yml      # - insert: 注册插件实例
├── tsdown.config.ts      # host(esm) + client(cjs banner) 双构建
├── tsconfig.json
├── src/
│   ├── host/index.ts     # node 半：agent 工具 / ctx.http 路由 / 服务
│   └── client/index.tsx  # browser 半：侧边栏注入 + 面板挂载
└── README.md
```

## 2. 决定插件形态

| 形态 | 结构 | 场景 |
|------|------|------|
| 纯 host 工具 | 只写 `src/host/`，无 `dsh.client` | agent 工具、后台任务、服务 |
| 双面插件 | host + client | GUI 面板 + 能力（任务看板、SSH、皮肤中心） |
| 纯配置 | 只写 `cordis.patch.yml`，无 src | 组合/覆盖其他插件、调整启动树 |

## 3. host 半开发

```ts
import type {} from '@deepseek-ai/dsh-base'

export const name = 'dsh-my-tool'
export const inject = { http: 'http', logger: 'logger' }  // 按需

export function apply(ctx: any) {
  // agent 工具：agent 会话里可直接调用
  ctx.tool?.register('my_action', {
    description: '做什么、何时用、参数说明',
  }, async (args: any) => {
    // 返回结果对象（会被转成 agent 可见文本）
    return { ok: true, data: args }
  })

  // REST 路由：浏览器半同源调用
  ctx.http?.get('/api/dsh-my-tool/ping', () => ({ ok: true, ts: Date.now() }))

  return () => { /* dispose：清连接/定时器/订阅 */ }
}
export default apply
```

**agent 工具契约要点**：
- `description` 写清楚触发场景、参数含义、返回值 —— agent 靠它决定何时调用。
- 工具名小写下划线；参数尽量扁平 JSON。
- 涉及敏感/高成本操作（远程执行、写文件），description 里要求"先确认"。

## 4. browser 半开发

官方装载链：tsdown 输出 `lib/client.js`，banner 实现：

```js
window.__ModuleLoader__.load({ id: "dsh-my-tool", factory: (require) => { ... } })
```

- factory 内 `require('react')`、`require('@deepseek-ai/dsh-client-*')` 拿到平台供给的模块（见 `dsh.client.inject` 声明）。
- 典型实现参考 `dsh-web-ui` 全家桶（packages/dsh-ssh/src/client：sidebar.ts 自愈注入 + mount.tsx 面板挂载 + controller.ts 开关）。
- 与 host 半通信：`fetch('/api/dsh-my-tool/...')`（同源；注意 dsh web 若暴露公网，需自行做来源校验，参考 dsh-workshop 的同源安全边界）。

## 5. 本地调试工作流

1. `node scripts/install-to-profile.mjs <name>` → 以 `link:` 装进 profile
2. `dsh web` 启动，看宿主日志 host 半加载
3. 改 host 半 → 重启 dsh web；改 client 半 → 浏览器强刷（无需重启宿主）
4. 调试期可在 `cordis.patch.yml` 用 `- id: xxx, disabled: true` 快速停用

## 6. 发布前检查清单

- [ ] `pnpm run typecheck` 通过
- [ ] 无密钥/令牌硬编码（.env 不入库）
- [ ] README 写明安装方式与限制
- [ ] `files` 字段只含 lib/ 与 cordis.patch.yml（不打包 src 敏感文件）
- [ ] 版本号语义化；行为变更更新 description
- [ ] `node scripts/build-registry.mjs` 更新安装源目录
- [ ] 对"执行远程命令/写文件/高成本"类操作有确认机制

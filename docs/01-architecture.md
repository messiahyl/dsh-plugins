# 01 · DSH 插件机制原理

> 本文是仓库内所有插件开发的底层知识。基于 DSH 0.1.0-rc.8（web profile）实测总结。

## 1. Profile 与插件加载链

DSH 以 **profile** 为单位启动（`~/.dsh/profiles/<name>`）。web profile 的关键文件：

```
profiles/web/
├── package.json          # dependencies = 插件包；dsh.profile.bundles = 启用清单
├── cordis.yml            # profile 根（空列表，仅作组合说明）
├── cordis.patch.yml      # 用户层 patch：insert/disabled 覆盖
└── node_modules/         # pnpm 安装的插件包
```

插件树按序组合：**每个 bundle 的 patch 层 → cordis.patch.yml → 用户 --patch 覆盖**。
启动即 `dsh web`（等价 `dsh --profile web`）。

## 2. 插件包 = npm 包 + dsh 声明

一个 DSH 插件首先是合法的 npm 包，靠 `package.json` 的 `dsh` 字段获得插件身份：

```jsonc
{
  "name": "dsh-xxx",
  "main": "lib/host/index.js",
  "exports": {
    ".": "./lib/host/index.js",       // host 半（node）
    "./client": "./lib/client.js",    // browser 半（web GUI）
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },  // 本包作为 bundle 层
    "client": { "inject": [...], "platform": "web" }
  }
}
```

### dsh.bundle.patch
指向一个 cordis patch 文件（通常是 `cordis.patch.yml`），其中用 `- insert:` 把插件实例注册进名单。这是插件的**入口声明**。

### dsh.client
声明浏览器半存在，并列出需要平台注入的运行时模块（`@deepseek-ai/dsh-client-*`）。有 client 半的插件称为**双面插件**：host 半提供能力，browser 半提供 GUI。

## 3. 双面插件模型

```
宿主进程 (node)                       浏览器 (web GUI)
┌─────────────────────┐              ┌──────────────────────┐
│ cordis 插件实例      │              │ /plugins/<id>/client.js │
│  exports "."         │  ctx.http   │  exports "./client"   │
│  · agent 工具        │ ◄─────────► │  · 侧边栏入口注入      │
│  · /api/dsh-xxx REST │   同源 REST │  · 中央列面板挂载      │
│  · ctx 服务(seam)    │              │  · 设置页项           │
└─────────────────────┘              └──────────────────────┘
```

- **host 半**：`src/host/index.ts` 默认导出 cordis 插件 `apply(ctx, config)`。可注册 agent 工具、挂 REST 路由、注册/注入服务。
- **browser 半**：`src/client/index.tsx`，经 tsdown 的 `window.__ModuleLoader__.load({ id, factory })` 装载（见模板 `tsdown.config.ts`）。factory 内 `require` 平台注入的 react 家族 + `@deepseek-ai/dsh-client-*` 运行时。
- **通信**：浏览器半通过同源 `fetch` 调 host 半的 `/api/...` 路由（`ctx.http`）。

## 4. cordis.patch.yml 语法速查

```yaml
# 插入新插件实例
- insert:
    - id: my-plugin
      name: 'dsh-xxx'
      config:            # 可选：插件构造参数
        foo: bar

# 禁用某实例（覆盖 bundle 层默认启用）
- id: some-other
  disabled: true

# 改名/改配置
- id: my-plugin
  name: 'dsh-xxx'
  config: { foo: baz }
```

Patch 按 YAML 列表顺序应用，后层覆盖前层。**profile 根 cordis.yml 不要手改**，改 `cordis.patch.yml`。

## 5. 安装 / 卸载

`dsh plugin --profile <name> <args...>` 把参数转发给 profile 目录下的 pnpm：

```sh
dsh plugin --profile web add dsh-xxx              # npm 源
dsh plugin --profile web add github:owner/repo    # GitHub 源
dsh plugin --profile web add link:/abs/path       # 本地 link（开发调试）
dsh plugin --profile web remove dsh-xxx           # 卸载
dsh plugin --profile web add .                    # 在包目录内装当前包
```

装完 **必须重启 `dsh web`** 使 bundle 生效。部分纯配置类插件（无 bundle 层）只需 patch 注册。

## 6. 社区生态参考

| 仓库/包 | 参考价值 |
|---------|---------|
| `zhu1090093659/dsh-web-ui` | 全家桶 monorepo（packages/ 下 18 包 + 聚合包 web-ui-all），双面插件最佳实践 |
| `loguhan/dsh-workshop` | 创意工坊：商店 UI + 安装执行 + registry 消费端 |
| `zp-home/dsh-recommend` | 社区目录数据源（GitHub dsh-plugin 话题抓取 → registry.json） |
| 官方 `@deepseek-ai/dsh-*` | 平台基础设施（lsp、client-runtime 等），读其 patch 学服务注入 |

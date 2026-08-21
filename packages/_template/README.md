# dsh-xxx

> DSH 插件：一句话描述。双面插件 = host 半（agent 工具/API）+ client 半（web GUI 面板）。

## 功能

- 功能一
- 功能二

## 安装

```sh
# 本仓库开发调试（link 模式，改完重启 dsh web 即生效）
node scripts/install-to-profile.mjs dsh-xxx

# 或直接 dsh plugin 安装
dsh plugin --profile web add dsh-xxx
```

## 开发

```sh
pnpm install
pnpm run build      # tsdown 构建到 lib/
pnpm run watch      # 增量构建
pnpm run typecheck
```

## 目录结构

```
src/
├── host/            # node 半：agent 工具、/api/dsh-xxx 路由、ctx 服务
└── client/          # browser 半：侧边栏注入 + 面板挂载
cordis.patch.yml     # bundle patch：注册插件实例
```

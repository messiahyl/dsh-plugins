# 06 · 快速开始（端到端示例）

从一个想法到用户可安装，完整走一遍。以 `dsh-hello` 为例。

## 1. 新建插件

```sh
node scripts/create-plugin.mjs dsh-hello
# 生成 packages/dsh-hello/（package.json / cordis.patch.yml / tsdown.config.ts / src/...）
```

## 2. 写 host 半（agent 工具）

编辑 `packages/dsh-hello/src/host/index.ts`：

```ts
export const name = 'dsh-hello'
export function apply(ctx: any) {
  ctx.tool?.register('hello', {
    description: '打招呼工具：传入 name 返回问候语。测试插件示例。',
  }, async (args: { name?: string }) => ({
    message: `你好，${args.name ?? '世界'}！来自 dsh-hello 插件`,
  }))
  return () => {}
}
export default apply
```

## 3. 本地调试

```sh
cd packages/dsh-hello && pnpm install
pnpm run build && pnpm run typecheck
node scripts/install-to-profile.mjs dsh-hello   # link 装进 web profile
dsh web                                          # 重启，在会话里调用 hello 工具验证
```

## 4. 发布（四通道齐发）

```sh
node scripts/publish.mjs dsh-hello patch
# 自动: 版本 0.1.0→0.1.1 → 构建 → npm publish → 打包归档 → 刷新索引

git add -A && git commit -m "feat(dsh-hello): 首次发布"
git tag dsh-hello@0.1.1 && git push origin master --tags
bash scripts/sync-github.sh                       # 同步 GitHub 镜像
```

发布产物确认：

```sh
registry/registry.json          # 索引含 dsh-hello 条目
registry/packages/dsh-hello-0.1.1.tgz   # 安装包归档（含 sha256）
```

## 5. 安装（消费端三种方式）

```sh
# 方式一：本仓库安装器（auto 选通道，local 优先）
node scripts/install-from-registry.mjs dsh-hello

# 方式二：直接装归档（国内网络首选）
dsh plugin --profile web add file:./registry/packages/dsh-hello-0.1.1.tgz

# 方式三：远端索引安装（另一台机器）
node scripts/install-from-registry.mjs dsh-hello --remote
```

## 6. 维护

```sh
# 改 bug 后重新走发布（patch）
node scripts/publish.mjs dsh-hello patch

# 收录第三方插件到安装源
# 在 registry/third-party/<name>.json 写元数据后：
node scripts/build-registry.mjs
```

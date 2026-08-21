# registry/ — 插件安装源

本目录是本仓库作为 **DSH 插件安装源** 的核心：既是**索引**，也内置**安装包归档**。

## 组成

```
registry/
├── registry.json        # 安装源注册表（生成产物，勿手改）
├── packages/            # 安装包归档（pnpm pack 产物 .tgz，随仓库提交）
├── third-party/         # 第三方插件收录（人工维护，每个插件一个 .json）
└── README.md
```

## 安装包归档（解决网络问题）

`node scripts/pack.mjs` 把各插件 `pnpm pack` 成 `.tgz` 放入 `registry/packages/`，
随仓库提交到 Gitee（国内可达）。索引的 `install.local` 字段指向归档 raw URL，
安装器可优先走本地通道绕开 npm/GitHub 的网络问题：

```sh
# 本地归档通道（下载 tgz 后安装）
dsh plugin --profile web add file:./registry/packages/dsh-xxx-0.1.0.tgz

# 或直接由索引给 raw URL 下载
curl -LO https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/packages/dsh-xxx-0.1.0.tgz
dsh plugin --profile web add file:./dsh-xxx-0.1.0.tgz
```

## registry.json

由 `node scripts/build-registry.mjs` 自动生成，聚合三类数据：

1. **本地插件**：扫描 `packages/*/package.json`（source: "local"）
2. **安装包归档**：扫描 `registry/packages/*.tgz`，登记 `install.local` 与 `archive` 字段
3. **第三方收录**：`third-party/*.json`（source: "third-party"）

格式兼容 dsh-recommend（name/owner/fullName/url/description/stars/...），
扩展自有字段（version/source/install/verified/tags/archive）。

字段说明见 `docs/05-catalog-schema.md`。

## 作为安装源的通道

| 通道 | 机制 | 适用 |
|------|------|------|
| 本地归档 | `registry/packages/*.tgz`（`install.local`） | 国内网络、离线分发 |
| registry.json | 本文件 + raw URL，供 workshop 风格安装器/自研工具读取 | 自建目录、展示 |
| npm | 各包 `pnpm publish` 后 `dsh plugin add <pkg>` | 公共安装 |
| GitHub | `bash scripts/sync-github.sh` 镜像后 `github:owner/repo` | workshop 一键安装 |

## 更新流程

```sh
# 重新打包 + 生成目录（新增/修改插件后）
node scripts/pack.mjs                 # 打包全部（或指定包名）
node scripts/build-registry.mjs       # 重新生成索引
git add registry/ && git commit -m "chore(registry): update catalog"
git push origin master        # Gitee 主源（归档随仓库同步）
bash scripts/sync-github.sh   # 同步 GitHub 通道
```

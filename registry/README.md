# registry/ — 插件安装源

本目录是本仓库作为 **DSH 插件安装源** 的核心。

## 组成

```
registry/
├── registry.json        # 安装源注册表（生成产物，勿手改）
├── third-party/         # 第三方插件收录（人工维护，每个插件一个 .json）
└── README.md
```

## registry.json

由 `node scripts/build-registry.mjs` 自动生成，聚合两类数据：

1. **本地插件**：扫描 `packages/*/package.json`（source: "local"）
2. **第三方收录**：`third-party/*.json`（source: "third-party"）

格式兼容 dsh-recommend（name/owner/fullName/url/description/stars/...），
扩展自有字段（version/source/install/verified/tags）。

字段说明见 `docs/05-catalog-schema.md`。

## 作为安装源的三种通道

| 通道 | 机制 | 适用 |
|------|------|------|
| registry.json | 本文件 + raw URL，供 workshop 风格安装器/自研工具读取 | 自建目录、展示 |
| npm | 各包 `pnpm publish` 后 `dsh plugin add <pkg>` | 公共安装 |
| GitHub | `bash scripts/sync-github.sh` 镜像后 `github:owner/repo` | workshop 一键安装 |

## 更新流程

```sh
# 新增/修改插件后重新生成目录
node scripts/build-registry.mjs
git add registry/ && git commit -m "chore(registry): update catalog"
git push origin master        # Gitee 主源
bash scripts/sync-github.sh   # 同步 GitHub 通道
```

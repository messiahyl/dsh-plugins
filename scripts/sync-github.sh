#!/usr/bin/env bash
# sync-github.sh — Gitee → GitHub 同步（安装源 GitHub 通道）
#
# DSH 插件安装源的 GitHub 通道：workshop 与 dsh plugin 的 github:owner/repo 安装
# 只认 GitHub。本仓库主 remote 是 Gitee，需要把代码镜像到 GitHub 才能作为
# workshop 可扫描 / 可 github: 安装的源。
#
# 用法：
#   bash scripts/sync-github.sh                # 推送（remote origin-github，如未配置默认 messiahyl/dsh-plugins）
#   bash scripts/sync-github.sh --expose       # 推送 + 设置 GitHub 曝光（topics/描述，需 gh CLI 已登录）
#   bash scripts/sync-github.sh <owner>        # 首次：以指定 owner 添加 remote 并推送
#
# 关于曝光（dsh-recommend 扫描规则）：
#   dsh-recommend 抓取 GitHub `dsh-plugin` 话题仓库 → 评分 → 对高分者深扫插件性
#   （dsh 声明 / @deepseek-ai 依赖 / cordis 配置 / skills 特征）。
#   本仓库是聚合仓库（根目录无插件包声明），大概率以"整仓单条目"或不被收录
#   形式出现；--expose 只做能做的落地（topics/描述），子插件逐个曝光需
#   独立建仓或提交进 awesome-dsh-plugin 类 hub 目录。

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="origin-github"
EXPOSE=0
OWNER="messiahyl"
ARGS=()
for a in "$@"; do
  case "$a" in
    --expose) EXPOSE=1 ;;
    -*) echo "未知参数: $a" >&2; exit 1 ;;
    *) ARGS+=("$a") ;;
  esac
done
if [ "${#ARGS[@]}" -gt 0 ]; then OWNER="${ARGS[0]}"; fi
REPO="dsh-plugins"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "→ 添加 remote: $REMOTE -> https://github.com/$OWNER/$REPO.git"
  git remote add "$REMOTE" "https://github.com/$OWNER/$REPO.git"
fi

echo "→ 推送到 GitHub: $OWNER/$REPO"
git push "$REMOTE" master --tags

echo "✓ 同步完成。"
echo "  插件现可通过 github:$OWNER/$REPO#path:packages/<name> 安装。"

if [ "$EXPOSE" -eq 1 ]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "! --expose 需要 gh CLI（brew install gh && gh auth login），跳过曝光设置" >&2
  else
    echo "→ 设置 GitHub 曝光（topics / 描述）"
    gh repo edit "$OWNER/$REPO" \
      --add-topic dsh-plugin \
      --add-topic dsh \
      --add-topic deepseek-harness \
      --description "DSH 插件总仓库：monorepo 开发 + 安装源（本地归档/npm/GitHub 镜像/索引）+ 第三方目录。国内网络友好，归档 sha256 校验。" 2>&1 || echo "! gh repo edit 失败（仓库可能不存在或权限不足）"
    echo "✓ 曝光设置完成（dsh-recommend 每 5 小时抓取 dsh-plugin 话题，稍后可见）"
  fi
fi

echo "注意：聚合仓库根目录无插件包声明，dsh-recommend 深扫可能判'非插件'；"
echo "      子插件逐个曝光请为每个 packages/* 独立建仓，或提交进 awesome-dsh-plugin hub 目录。"

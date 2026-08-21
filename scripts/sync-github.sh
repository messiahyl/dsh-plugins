#!/usr/bin/env bash
# sync-github.sh — Gitee → GitHub 同步
#
# DSH 插件安装源的 GitHub 通道：workshop 与 dsh plugin 的 github:owner/repo 安装方式
# 只认 GitHub。本仓库主 remote 是 Gitee，需要把代码镜像到 GitHub 才能作为
# workshop 可扫描 / 可 github: 安装的源。
#
# 用法：
#   bash scripts/sync-github.sh            # 推送到 origin-github（如已配置）
#   bash scripts/sync-github.sh <owner>    # 首次：添加 remote 并推送
#
# 前提：GitHub 上已有同名仓库（或允许本脚本用 gh 创建，见文末注释）。

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="origin-github"
OWNER="${1:-messiahyl}"
REPO="dsh-plugins"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "→ 添加 remote: $REMOTE -> https://github.com/$OWNER/$REPO.git"
  git remote add "$REMOTE" "https://github.com/$OWNER/$REPO.git"
fi

echo "→ 推送到 GitHub: $OWNER/$REPO"
git push "$REMOTE" master --tags

echo "✓ 同步完成。"
echo "  插件现可通过 github:$OWNER/$REPO#path:packages/<name> 安装，"
echo "  若仓库名/话题命中 dsh-plugin 扫描规则，也会出现在 workshop 目录。"

# 可选：让 gh CLI 自动建仓（需已登录 gh）：
#   gh repo create "$OWNER/$REPO" --private --source . --remote "$REMOTE" --push

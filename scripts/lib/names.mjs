#!/usr/bin/env node
/**
 * lib/names.mjs — 插件命名校验与转换公共模块
 *
 * 供 create-plugin / publish / publish-all / install-to-profile / install-from-registry
 * 复用命名规约，避免各脚本正则漂移。
 */
export const PACKAGE_NAME_RE = /^(@[\w-]+\/)?dsh-[\w-]+$/

/** 合法插件包名：dsh-x 或 @scope/dsh-x */
export function isValidPackageName(name) {
  return PACKAGE_NAME_RE.test(name)
}

/** cordis 实例 id：去 scope 与 dsh- 前缀（@scope/dsh-x → x，dsh-x → x） */
export function cordisIdOf(name) {
  return name.startsWith('@') ? name.split('/')[1].replace(/^dsh-/, '') : name.replace(/^dsh-/, '')
}

/** 包名 → packages/ 目录名（唯一映射）：@scope/dsh-x → dsh-x，dsh-x → dsh-x */
export function pkgDirOf(name) {
  return name.startsWith('@') ? name.split('/')[1] : name
}

/** pnpm pack 的归档文件名转义：@scope/dsh-x → scope-dsh-x-<ver>.tgz */
export function archiveFileName(name, version) {
  const esc = name.startsWith('@') ? name.slice(1).replace('/', '-') : name
  return `${esc}-${version}.tgz`
}

/** install.npm 字段白名单（防注入） */
export const NPM_SPEC_RE = /^(@[a-z0-9-]+\/)?[a-z0-9-]+$/

/** install.github 字段白名单：owner/repo[#path:...]（防注入） */
export const GITHUB_SPEC_RE = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+(?:#path:[a-zA-Z0-9-_/]+)?$/

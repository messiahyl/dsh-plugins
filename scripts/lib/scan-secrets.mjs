#!/usr/bin/env node
/**
 * lib/scan-secrets.mjs — 发布前密钥扫描公共模块
 *
 * 供 publish.mjs / publish-all.mjs 在 npm publish 前对"最终发布产物"执行扫描，
 * 避免把 AK/SK、私钥、明文密钥发到公开 registry。
 *
 * 覆盖主流密钥形态；扫描对象 = package.json files 白名单（含 lib/，不限扩展名）
 * + npm 总会发布的 package.json/README/LICENSE。
 */
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

/** [正则, 标签] — 命中任一即报告 */
export const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS Access Key'],
  [/ASIA[0-9A-Z]{16}/, 'AWS 临时凭证'],
  [/sk-(?:proj|ant)-[A-Za-z0-9_-]{20,}/, 'OpenAI/Anthropic API key'],
  [/sk-[A-Za-z0-9]{20,}/, 'sk- API key'],
  [/ghp_[A-Za-z0-9]{30,}/, 'GitHub PAT'],
  [/github_pat_[A-Za-z0-9_]{30,}/, 'GitHub Fine-grained PAT'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----/, '私钥块'],
  [/(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'][^"']{8,}/i, '明文密钥赋值'],
]

/** 递归列出目录下所有文件（可跳过子目录名）。 */
export function walkFiles(dir, skipDirs = ['node_modules', '.git']) {
  const out = []
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (skipDirs.includes(f)) continue
      if (statSync(p).isDirectory()) walk(p)
      else out.push(p)
    }
  }
  walk(dir)
  return out
}

/** 解析包的实际发布文件：files 白名单（目录递归）+ 恒发布的 package.json/README/LICENSE。 */
export function resolvePublishFiles(pkgDir, pkg) {
  const files = pkg.files?.length ? pkg.files : ['lib', 'cordis.patch.yml']
  const out = []
  for (const f of files) {
    const p = join(pkgDir, f)
    if (!existsSync(p)) continue
    if (statSync(p).isDirectory()) out.push(...walkFiles(p))
    else out.push(p)
  }
  for (const f of ['package.json', 'README.md', 'LICENSE']) {
    const p = join(pkgDir, f)
    if (existsSync(p) && !out.includes(p)) out.push(p)
  }
  return out
}

/** 扫描文件列表，返回命中 [{ file, label }]（每文件最多报一条）。 */
export function scanFiles(fileList, root = '') {
  const hits = []
  for (const file of fileList) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue // 不可读（二进制等）跳过
    }
    if (text.includes('\u0000')) continue // 二进制
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(text)) {
        hits.push({ file: root ? relative(root, file) : file, label })
        break
      }
    }
  }
  return hits
}

/** 对某个 packages/<name> 目录执行完整扫描，返回命中列表（已含相对路径）。 */
export function scanPackage(pkgDir, pkg) {
  return scanFiles(resolvePublishFiles(pkgDir, pkg), pkgDir)
}

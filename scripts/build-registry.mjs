#!/usr/bin/env node
/**
 * build-registry.mjs — 生成插件安装源注册表 registry/registry.json
 *
 * 数据来源：
 *   1. packages 下各包的 package.json（本仓库直接维护的插件）
 *   2. registry/packages/ 下的 .tgz 归档（安装包，登记 install.local 通道）
 *   3. registry/third-party/ 下的 .json（第三方插件收录，人工维护的元数据）
 *
 * 输出格式兼容 dsh-recommend（name/owner/fullName/url/description/stars/...）
 * 并扩展自有字段（version/source/install/verified/tags），供 workshop 风格安装器或自研安装源读取。
 *
 * 用法：node scripts/build-registry.mjs [--stable]
 *   --stable: 确定性输出（generatedAt 固定），供 CI 一致性校验使用
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NPM_SPEC_RE, GITHUB_SPEC_RE, archiveFileName } from './lib/names.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const GITEE_REPO = 'https://gitee.com/messiahyl/dsh-plugins'
const GITHUB_REPO = 'messiahyl/dsh-plugins'
const stable = process.argv.includes('--stable')

const plugins = []

// ── 0. 安装包归档目录（registry/packages/*.tgz，pnpm pack 产物）──
// 文件名形如 dsh-x-0.1.0.tgz / scope-dsh-x-0.1.0.tgz（@scope/ 被 pnpm 转义为 scope-）
const packDir = join(ROOT, 'registry', 'packages')
const archives = existsSync(packDir) ? readdirSync(packDir).filter((f) => f.endsWith('.tgz')) : []
const esc = (n) => n.startsWith('@') ? n.slice(1).replace('/', '-') : n
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// ── 1. 本仓库 packages/ ──
for (const dir of readdirSync(join(ROOT, 'packages'))) {
  if (dir === '_template') continue
  const pkgPath = join(ROOT, 'packages', dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const tgz = archiveFileName(pkg.name, pkg.version)
  const hasArchive = archives.includes(tgz)
  const checksum = hasArchive
    ? sha256(readFileSync(join(packDir, tgz)))
    : null
  plugins.push({
    name: pkg.name,
    owner: 'messiahyl',
    fullName: `messiahyl/${dir}`,
    url: `${GITEE_REPO}/tree/master/packages/${dir}`,
    description: pkg.description ?? '',
    version: pkg.version,
    source: 'local',
    install: {
      local: hasArchive
        ? `${GITEE_REPO}/raw/master/registry/packages/${tgz}`
        : '',
      npm: pkg.name,
      github: `${GITHUB_REPO}#path:packages/${dir}`,
    },
    archive: hasArchive ? { file: tgz, version: pkg.version, checksum } : null,
    verified: true,
    tags: [],
    license: pkg.license ?? 'Apache-2.0',
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    openIssues: 0,
    archived: false,
    fork: false,
  })
}

// ── 2. 第三方收录 ──
// 白名单合并：只取展示字段，强制 verified=false（第三方不得自证背书），
// 不开放 local 归档与 archive/checksum 自填；install 通道由收录者声明
// npm/github 字段派生并强制白名单校验（防伪造安装通道）。
const tpDir = join(ROOT, 'registry', 'third-party')
for (const file of readdirSync(tpDir).filter((f) => f.endsWith('.json'))) {
  try {
    const item = JSON.parse(readFileSync(join(tpDir, file), 'utf8'))
    if (!item.name) {
      console.warn(`跳过 ${file}: 缺少 name`)
      continue
    }
    const install = {}
    if (item.npm && NPM_SPEC_RE.test(item.npm)) install.npm = item.npm
    else if (item.npm) console.warn(`跳过 ${file}: npm 字段非法（${item.npm}），该通道不登记`)
    if (item.github && GITHUB_SPEC_RE.test(item.github)) install.github = item.github
    else if (item.github) console.warn(`跳过 ${file}: github 字段非法（${item.github}），该通道不登记`)
    plugins.push({
      name: item.name,
      owner: item.owner ?? '',
      fullName: item.fullName ?? item.name,
      url: item.url ?? '',
      description: item.description ?? '',
      stars: 0,
      forks: 0,
      openIssues: 0,
      archived: false,
      fork: false,
      source: 'third-party',
      verified: false, // 强制恒 false：背书需走独立维护者清单，见 registry/README
      install: Object.keys(install).length > 0 ? install : undefined,
      archive: null,
      tags: item.tags ?? [],
      license: item.license ?? 'MIT',
      language: item.language ?? 'Unknown',
    })
  } catch (e) {
    console.warn(`跳过 ${file}: ${e.message}`)
  }
}

// 去重 + 排序
const seen = new Set()
const unique = plugins.filter((p) => {
  if (seen.has(p.name)) return false
  seen.add(p.name)
  return true
})
unique.sort((a, b) => a.name.localeCompare(b.name))

const registry = {
  meta: {
    schemaVersion: 1, // 索引格式版本（消费端演进协商锚点）
    generatedAt: stable ? 'stable' : new Date().toISOString(), // --stable 时确定性输出，供 CI diff
    source: GITEE_REPO,
    count: unique.length,
    localCount: unique.filter((p) => p.source === 'local').length,
    thirdPartyCount: unique.filter((p) => p.source === 'third-party').length,
    archivedCount: unique.filter((p) => p.archive).length,
  },
  plugins: unique,
}

const out = join(ROOT, 'registry', 'registry.json')
writeFileSync(out, JSON.stringify(registry, null, 2) + '\n')
console.log(`✓ registry.json 已生成: ${unique.length} 个插件（本地 ${registry.meta.localCount} / 第三方 ${registry.meta.thirdPartyCount} / 含安装包 ${registry.meta.archivedCount}）`)
console.log(`  路径: ${out}`)

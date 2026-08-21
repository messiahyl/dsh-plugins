#!/usr/bin/env node
/**
 * install-from-registry.mjs — 从本仓库安装源安装插件（消费端）
 *
 * 通道优先级（auto）：local（归档，免网络）→ npm → github
 * local 通道会下载 registry/packages/ 的 .tgz 并做 sha256 校验后安装。
 *
 * 用法：
 *   node scripts/install-from-registry.mjs <插件名>          # auto 选通道
 *   node scripts/install-from-registry.mjs <插件名> --source local
 *   node scripts/install-from-registry.mjs <插件名> --profile web
 *   node scripts/install-from-registry.mjs --list            # 列出索引全部插件
 *   node scripts/install-from-registry.mjs --list --remote   # 拉取远端索引（Gitee raw）
 *
 * 依赖：node >= 18（内置 fetch）
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LOCAL_INDEX = join(ROOT, 'registry', 'registry.json')
const REMOTE_INDEX = 'https://gitee.com/messiahyl/dsh-plugins/raw/master/registry/registry.json'

const args = process.argv.slice(2)
const idx = (v) => args.indexOf(v)
const opt = (v, d) => (idx(v) >= 0 ? args[idx(v) + 1] : d)
const has = (v) => args.includes(v)

const name = args.find((a) => !a.startsWith('--'))
const source = opt('--source', 'auto')
const profile = opt('--profile', 'web')
const useRemote = has('--remote')

if (has('--list')) {
  const reg = await loadRegistry(useRemote)
  console.log(`安装源 ${useRemote ? '(远端)' : '(本地)'} — ${reg.meta.generatedAt}`)
  console.log(`共 ${reg.meta.count} 个插件（本地 ${reg.meta.localCount} / 第三方 ${reg.meta.thirdPartyCount} / 含归档 ${reg.meta.archivedCount}）\n`)
  for (const p of reg.plugins) {
    const ch = p.archive ? `[归档]` : p.source === 'local' ? '[源码]' : '[第三方]'
    console.log(`  ${ch} ${p.name}@${p.version ?? '?'}  ${p.description ?? ''}`)
  }
  process.exit(0)
}

if (!name) {
  console.error('用法: node scripts/install-from-registry.mjs <插件名> [--source local|npm|github|auto] [--profile web] [--list]')
  process.exit(1)
}

async function loadRegistry(remote) {
  if (remote) {
    const res = await fetch(REMOTE_INDEX)
    if (!res.ok) throw new Error(`远端索引拉取失败: ${res.status}`)
    return res.json()
  }
  if (!existsSync(LOCAL_INDEX)) throw new Error(`本地索引不存在: ${LOCAL_INDEX}（先执行 node scripts/build-registry.mjs）`)
  return JSON.parse(readFileSync(LOCAL_INDEX, 'utf8'))
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

// ── 主流程 ──
const reg = await loadRegistry(useRemote)
const plugin = reg.plugins.find((p) => p.name === name)
if (!plugin) {
  console.error(`✗ 索引中未找到插件: ${name}（node scripts/install-from-registry.mjs --list 查看全部）`)
  process.exit(1)
}

const channels = ['local', 'npm', 'github']
const pick = source === 'auto' ? channels.find((c) => plugin.install?.[c]) : source

if (!pick || !plugin.install?.[pick]) {
  console.error(`✗ 通道 ${source} 不可用。可用: ${channels.filter((c) => plugin.install?.[c]).join(' / ')}`)
  process.exit(1)
}

console.log(`→ ${plugin.name}@${plugin.version ?? ''} 通过通道 [${pick}] 安装到 profile ${profile}`)

if (pick === 'local') {
  const url = plugin.install.local
  const expect = plugin.archive?.checksum
  const tmp = mkdtempSync(join(tmpdir(), 'dsh-reg-'))
  const tgzPath = join(tmp, plugin.archive.file)
  console.log(`→ 下载归档: ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`✗ 下载失败: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (expect) {
    const got = sha256(buf)
    if (got !== expect) {
      console.error(`✗ sha256 校验失败（期望 ${expect.slice(0, 16)}…，实际 ${got.slice(0, 16)}…）——归档可能损坏或被篡改`)
      process.exit(1)
    }
    console.log('✓ sha256 校验通过')
  } else {
    console.warn('! 索引无 checksum，跳过校验（归档可能未重新生成索引）')
  }
  writeFileSync(tgzPath, buf)
  try {
    execSync(`dsh plugin --profile ${profile} add file:${tgzPath}`, { stdio: 'inherit' })
    console.log(`✓ ${plugin.name} 安装完成（归档 ${plugin.archive.file}）`)
  } catch (e) {
    console.error(`✗ 安装失败: ${e.message}`)
    process.exit(1)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
} else {
  const spec = pick === 'npm' ? plugin.install.npm : `github:${plugin.install.github}`
  console.log(`→ 安装: dsh plugin --profile ${profile} add ${spec}`)
  try {
    execSync(`dsh plugin --profile ${profile} add ${spec}`, { stdio: 'inherit' })
    console.log(`✓ ${plugin.name} 安装完成`)
  } catch (e) {
    console.error(`✗ 安装失败: ${e.message}`)
    process.exit(1)
  }
}

console.log('\n完成。请重启 dsh web 使 bundle 插件生效。')

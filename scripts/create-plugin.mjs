#!/usr/bin/env node
/**
 * create-plugin.mjs — DSH 插件脚手架
 *
 * 用法：node scripts/create-plugin.mjs <插件名>
 *   <插件名> 支持 dsh-xxx 或 @scope/dsh-xxx 或裸 xxx（自动补 dsh- 前缀）
 *
 * 行为：复制 packages/_template 到 packages/<name>，替换包名、cordis id、client banner id。
 */
import { cpSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const raw = process.argv[2]
if (!raw) {
  console.error('用法: node scripts/create-plugin.mjs <插件名>  例如: dsh-my-tool')
  process.exit(1)
}

// 命名规约：裸名补 dsh- 前缀；@scope 名保持；cordis 实例 id 一律去 dsh- 前缀
let name = raw.trim()
if (name.startsWith('@')) {
  const [scope, pkg] = name.split('/')
  if (!pkg?.startsWith('dsh-')) {
    console.error(`@scope 包名必须以 dsh- 开头: @${scope}/dsh-xxx`)
    process.exit(1)
  }
} else if (!name.startsWith('dsh-')) {
  name = `dsh-${name}`
}
const cordisId = name.startsWith('@') ? name.split('/')[1].replace(/^dsh-/, '') : name.replace(/^dsh-/, '')

if (!/^(@[\w-]+\/)?dsh-[\w-]+$/.test(name)) {
  console.error(`非法插件名: ${name}（应形如 dsh-xxx 或 @scope/dsh-xxx）`)
  process.exit(1)
}

const dest = join(ROOT, 'packages', name.startsWith('@') ? name.split('/')[1] : name)
if (existsSync(dest)) {
  console.error(`目标已存在: ${dest}`)
  process.exit(1)
}

// 复制模板
cpSync(join(ROOT, 'packages', '_template'), dest, { recursive: true })
console.log(`✓ 已复制模板 -> ${dest}`)

// 替换占位符：必须先替换长串 'dsh-xxx'，再替换剩下的 'xxx'（避免 dsh-dsh-xxx 污染）
const targets = [
  ['package.json', [['dsh-xxx', name]]],
  ['cordis.patch.yml', [['dsh-xxx', name], ['xxx', cordisId]]],
  ['tsdown.config.ts', [['dsh-xxx', name]]],
  ['src/host/index.ts', [['dsh-xxx', name], ['xxx', cordisId]]],
]
for (const [rel, pairs] of targets) {
  const p = join(dest, rel)
  let text = readFileSync(p, 'utf8')
  for (const [from, to] of pairs) text = text.split(from).join(to)
  writeFileSync(p, text)
}

console.log(`✓ 插件 ${name} 已创建`)
console.log(`
下一步:
  1. cd packages/${name} && pnpm install
  2. 编辑 src/host/index.ts（agent 工具 / API）与 src/client/（GUI 面板）
  3. pnpm run build && pnpm run typecheck
  4. 本地调试: node scripts/install-to-profile.mjs ${name}
  5. 发布:    node scripts/publish.mjs ${name} patch
`)

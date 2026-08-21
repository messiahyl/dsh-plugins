#!/usr/bin/env node
/**
 * publish-all.mjs — 一键全量发布 packages/ 下全部插件
 *
 * 流程：typecheck → build（全部）→ npm publish（可选）→ pack 归档（全部）→ 生成索引
 *
 * 用法：
 *   node scripts/publish-all.mjs                # 全部：构建 + npm + 归档 + 索引
 *   node scripts/publish-all.mjs --no-npm       # 跳过 npm（只归档 + 索引）
 *   node scripts/publish-all.mjs --dry-run      # 演练（不落盘、不发布）
 *
 * 版本号不在本脚本递增（避免误批量升版），需要升版请逐包 node scripts/publish.mjs <pkg> patch。
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidPackageName } from './lib/names.mjs'
import { scanPackage } from './lib/scan-secrets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
const noNpm = args.includes('--no-npm')
const dryRun = args.includes('--dry-run')

const targets = readdirSync(join(ROOT, 'packages')).filter(
  (d) => d !== '_template' && existsSync(join(ROOT, 'packages', d, 'package.json')),
)
if (targets.length === 0) {
  console.error('packages/ 下没有可发布的插件')
  process.exit(1)
}

console.log(`→ 待发布 ${targets.length} 个插件: ${targets.join(', ')}`)
if (dryRun) console.log('（dry-run 模式：只构建，不发布/不落盘）')

// 1. 全部 typecheck + build + 密钥扫描（与 publish.mjs 同门禁）
for (const t of targets) {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', t, 'package.json'), 'utf8'))
  if (!isValidPackageName(pkg.name)) {
    console.error(`✗ ${t}: 非法包名 ${pkg.name}，跳过`)
    continue
  }
  console.log(`\n→ 构建 ${t}`)
  execSync('pnpm run typecheck && pnpm run build', { cwd: join(ROOT, 'packages', t), stdio: 'inherit' })

  // 构建后对最终发布产物（files 白名单含 lib/）扫描
  const hits = scanPackage(join(ROOT, 'packages', t), pkg)
  if (hits.length > 0) {
    console.error(`✗ ${t}: 发布产物检测到疑似密钥，中止全部发布：`)
    for (const h of hits) console.error(`    ${h.file} — 疑似${h.label}`)
    process.exit(1)
  }
  console.log(`✓ ${t} 密钥扫描通过`)
}

// 2. npm 发布（可选）
if (!noNpm && !dryRun) {
  for (const t of targets) {
    console.log(`\n→ npm publish ${t}`)
    execSync('pnpm publish --access public', { cwd: join(ROOT, 'packages', t), stdio: 'inherit' })
  }
}

// 3. 打包归档 + 索引
if (!dryRun) {
  execSync('node scripts/pack.mjs', { cwd: ROOT, stdio: 'inherit' })
  execSync('node scripts/build-registry.mjs', { cwd: ROOT, stdio: 'inherit' })
}

console.log(`
完成。后续 git 收尾：
  git add -A && git commit -m "chore: release all plugins"
  git push origin master --tags
  bash scripts/sync-github.sh
`)

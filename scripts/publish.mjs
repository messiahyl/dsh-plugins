#!/usr/bin/env node
/**
 * publish.mjs — 发布 DSH 插件
 *
 * 用法：node scripts/publish.mjs <包名> <patch|minor|major> [--no-npm] [--dry-run]
 *
 * 流程：
 *   1. 校验 git 工作区干净、包存在
 *   2. 版本号递增（patch 默认）
 *   3. pnpm build + typecheck
 *   4. pnpm publish（npm 通道；--no-npm 跳过）
 *   5. 重新生成 registry.json
 *   6. 提示 git commit/tag/push（GitHub 通道见 sync-github.sh）
 *
 * 注意：发布 = 对外运行你的代码。发布前确认包内无密钥、无调试残留。
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidPackageName } from './lib/names.mjs'
import { scanPackage } from './lib/scan-secrets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
const name = args[0]
const bump = ['patch', 'minor', 'major'].includes(args[1]) ? args[1] : 'patch'
const noNpm = args.includes('--no-npm')
const dryRun = args.includes('--dry-run')

if (!name) {
  console.error('用法: node scripts/publish.mjs <包名> [patch|minor|major] [--no-npm] [--dry-run]')
  process.exit(1)
}
if (!isValidPackageName(name)) {
  console.error(`✗ 非法插件名: ${name}（应形如 dsh-xxx 或 @scope/dsh-xxx）`)
  process.exit(1)
}

const pkgPath = join(ROOT, 'packages', name, 'package.json')
if (!existsSync(pkgPath)) {
  console.error(`未找到插件包: packages/${name}`)
  process.exit(1)
}

// 1. git 干净校验
try {
  const dirty = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim()
  if (dirty) {
    console.error('✗ git 工作区不干净，请先提交或 stash：\n' + dirty)
    process.exit(1)
  }
} catch (e) {
  console.error('✗ 无法读取 git 状态:', e.message)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const next = bump === 'major' ? `${major + 1}.0.0`
  : bump === 'minor' ? `${major}.${minor + 1}.0`
  : `${major}.${minor}.${patch + 1}`

console.log(`→ ${pkg.name}: ${pkg.version} -> ${next}（${bump}${dryRun ? '，dry-run 不落盘' : ''}）`)

if (!dryRun) {
  execSync(`pnpm version ${bump} --no-git-tag-version`, { cwd: join(ROOT, 'packages', name), stdio: 'inherit' })
}

// 2. 构建 + 类型检查（扫描对象 = 构建后的最终发布产物，先构建）
execSync('pnpm run build && pnpm run typecheck', { cwd: join(ROOT, 'packages', name), stdio: 'inherit' })
console.log('✓ 构建完成')

// 2.5 密钥扫描：对 npm 实际发布内容（files 白名单含 lib/，不限扩展名）执行
const pkgAfter = JSON.parse(readFileSync(pkgPath, 'utf8')) // version bump 后重读
const secretHits = scanPackage(join(ROOT, 'packages', name), pkgAfter)
if (secretHits.length > 0) {
  console.error('✗ 发布产物中检测到疑似密钥，中止发布（确认误报请删除相关行后重试）：')
  for (const h of secretHits) console.error(`    ${h.file} — 疑似${h.label}`)
  process.exit(1)
}
console.log(`✓ 密钥扫描通过（${secretHits.length} 处命中）`)

// 3. npm 发布
if (!noNpm && !dryRun) {
  execSync('pnpm publish --access public', { cwd: join(ROOT, 'packages', name), stdio: 'inherit' })
  console.log('✓ npm 发布完成')
}

// 4. 打包归档到 registry/packages/（安装源的本地通道，解决网络问题）
execSync('node scripts/pack.mjs ' + name, { cwd: ROOT, stdio: 'inherit' })
console.log('✓ 安装包归档完成')

// 5. 更新 registry
execSync('node scripts/build-registry.mjs', { cwd: ROOT, stdio: 'inherit' })

console.log(`
下一步（git 通道）:
  git add -A && git commit -m "chore(${name}): release v${next}"
  git tag ${name}@${next} && git push origin master --tags
  bash scripts/sync-github.sh   # 同步 GitHub 作为安装源通道
`)

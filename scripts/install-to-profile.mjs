#!/usr/bin/env node
/**
 * install-to-profile.mjs — 把本仓库插件以 link 模式安装/卸载到本地 DSH profile
 *
 * 用法：
 *   node scripts/install-to-profile.mjs            # 安装 packages/ 下全部插件
 *   node scripts/install-to-profile.mjs dsh-ssh    # 只装指定插件
 *   node scripts/install-to-profile.mjs dsh-ssh --remove   # 卸载
 *   node scripts/install-to-profile.mjs dsh-ssh --profile web
 *
 * link 模式 = 本地开发实时生效（改代码 → 重启 dsh web 即加载），
 * 等同 dsh plugin --profile web add link:<绝对路径>。
 */
import { execSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidPackageName, pkgDirOf } from './lib/names.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
const profileIdx = args.indexOf('--profile')
const profile = profileIdx >= 0 ? args[profileIdx + 1] : 'web'
const remove = args.includes('--remove')

// 解析：--profile <name> / --remove 之外的非选项参数视为插件名
const named = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile') { i++; continue }
  if (!args[i].startsWith('--')) named.push(args[i])
}

let targets = named
if (targets.length === 0) {
  targets = readdirSync(join(ROOT, 'packages')).filter((d) => d !== '_template' && existsSync(join(ROOT, 'packages', d, 'package.json')))
}

if (targets.length === 0) {
  console.error('没有可安装的插件（packages/ 为空或未提供插件名）')
  process.exit(1)
}

for (const t of targets) {
  if (!isValidPackageName(t)) {
    console.warn(`跳过 ${t}: 非法插件名（应形如 dsh-xxx 或 @scope/dsh-xxx）`)
    continue
  }
  const abs = resolve(ROOT, 'packages', pkgDirOf(t))
  if (!existsSync(join(abs, 'package.json'))) {
    console.warn(`跳过 ${t}: 未找到 ${join(abs, 'package.json')}`)
    continue
  }
  if (remove) {
    console.log(`→ 卸载 ${t}（profile ${profile}）`)
    try {
      execSync(`dsh plugin --profile ${profile} remove ${t}`, { stdio: 'inherit' })
      console.log(`✓ ${t} 已卸载`)
    } catch (e) {
      console.error(`✗ ${t} 卸载失败: ${e.message}`)
    }
    continue
  }
  console.log(`→ 安装 ${t} -> profile ${profile}（link:${abs}）`)
  try {
    execSync(`dsh plugin --profile ${profile} add link:${abs}`, { stdio: 'inherit' })
    console.log(`✓ ${t} 已安装`)
  } catch (e) {
    console.error(`✗ ${t} 安装失败: ${e.message}`)
  }
}

console.log('\n完成。请重启 dsh web 使 bundle 插件生效。')

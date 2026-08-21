#!/usr/bin/env node
/**
 * pack.mjs — 把插件打包为安装包归档到 registry/packages/
 *
 * 动机：国内网络拉 npm/GitHub 慢或被墙。归档随仓库提交（Gitee 国内可达），
 * 安装时优先走本地 file: 通道，绕开远端网络。
 *
 * 用法：
 *   node scripts/pack.mjs                # 打包 packages/ 下全部插件
 *   node scripts/pack.mjs dsh-ssh        # 只打包指定插件
 *
 * 产物：registry/packages/<name>-<version>.tgz
 * 打包后必须重新生成索引：node scripts/build-registry.mjs
 */
import { execSync } from 'node:child_process'
import { readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'registry', 'packages')
mkdirSync(OUT, { recursive: true })

const named = process.argv.slice(2)
let targets = named
if (targets.length === 0) {
  targets = readdirSync(join(ROOT, 'packages')).filter(
    (d) => d !== '_template' && existsSync(join(ROOT, 'packages', d, 'package.json')),
  )
}
if (targets.length === 0) {
  console.error('没有可打包的插件（packages/ 为空或未提供插件名）')
  process.exit(1)
}

for (const t of targets) {
  const dir = join(ROOT, 'packages', t)
  if (!existsSync(join(dir, 'package.json'))) {
    console.warn(`跳过 ${t}: 未找到 package.json`)
    continue
  }
  console.log(`→ 打包 ${t}`)
  try {
    // pnpm 11 输出格式：末尾 "Tarball Details" 后跟归档完整路径
    const out = execSync('pnpm pack --pack-destination ' + JSON.stringify(OUT), {
      cwd: dir,
      encoding: 'utf8',
    })
    const m = out.match(/([^\s/]+\.tgz)\s*$/)
    const tgz = m ? m[1].trim() : null
    console.log(tgz ? `✓ ${tgz} -> registry/packages/` : `✓ 已打包到 registry/packages/（${OUT}）`)
  } catch (e) {
    console.error(`✗ ${t} 打包失败: ${e.message}`)
  }
}

console.log('\n完成。请执行 node scripts/build-registry.mjs 更新索引（登记 install.local 通道）。')

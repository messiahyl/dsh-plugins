/**
 * dsh-xxx — host 半（node 进程）
 *
 * 职责：
 *  1. 注册 agent 工具（agent 侧可调用，如 ssh_exec 等）
 *  2. 挂载 /api/dsh-xxx REST 路由（web 半经 ctx.http 同源调用）
 *  3. 需要时注册 ctx 服务（service seam）
 *
 * 插件是 cordis 插件：默认导出 (ctx, config) => void 的 apply 函数。
 * 移除/卸载时 cordis 会调用 dispose 钩子做清理（连接池、定时器、路由卸载）。
 */
import type {} from '@deepseek-ai/dsh-base'

export const name = 'dsh-xxx'
export const inject = {
  // 按需声明依赖的服务，如 http: 'http', logger: 'logger'
}

export function apply(ctx: any) {
  ctx.logger?.info('[dsh-xxx] host 半已加载')

  // 例：agent 工具注册（需要 @deepseek-ai/dsh-base 提供的工具 schema 机制时）
  // ctx.tool?.register('xxx_action', { description: '...' }, async (args) => { ... })

  // 例：REST 路由（web 半通过 ctx.http.get('/api/dsh-xxx/...') 调用）
  // ctx.http?.get('/api/dsh-xxx/ping', () => ({ ok: true }))

  return () => {
    // dispose：清理连接、定时器、订阅
    ctx.logger?.info('[dsh-xxx] host 半已卸载')
  }
}

export default apply

/**
 * dsh-xxx — browser 半（web GUI）
 *
 * 官方装载链：tsdown banner 里的 window.__ModuleLoader__.load({ id, factory })。
 * factory 内可通过 require 拿到平台注入的模块（react、dsh-client-* 运行时）。
 * 典型挂载点：
 *  - 侧边栏入口：往 #sidebar 注入按钮（参考 dsh-web-ui / dsh-workshop 的 sidebar.ts 自愈注入）
 *  - 中央列面板：挂载到主内容区（controller 开关 + mount 视图）
 *
 * 更完整的实现请参考 dsh-web-ui 全家桶仓库（packages/dsh-ssh 的 src/client）。
 */
import React from 'react'

export function mount(container: HTMLElement) {
  container.innerHTML = '<div style="padding:16px">dsh-xxx 面板占位</div>'
  return () => {
    container.innerHTML = ''
  }
}

export default { mount }

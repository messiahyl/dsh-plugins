/**
 * dsh-xxx — browser 半（web GUI）
 *
 * 官方装载链：tsdown banner 里的 window.__ModuleLoader__.load({ id, factory })。
 * factory 内通过 require 拿到平台注入的模块（react、dsh-client-* 运行时）。
 *
 * 本模板实现最小可用闭环：侧边栏入口按钮 → 点击打开固定定位面板。
 * 生产级面板建议挂载到中央列（参考 dsh-web-ui 全家桶 packages/dsh-ssh 的 src/client）。
 */
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createEntry, watchSidebar } from './sidebar.ts'

let root: Root | null = null
let container: HTMLDivElement | null = null
let stopWatch: (() => void) | null = null
let active = false

const PANEL_STYLE = `
#dsh-xxx-panel {
  position: fixed;
  top: 72px;
  right: 16px;
  width: 360px;
  max-height: calc(100vh - 96px);
  overflow: auto;
  background: var(--dsw-alias-bg, #1e1e24);
  border: 1px solid var(--dsw-alias-border, #333);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
  z-index: 9999;
  padding: 16px;
  color: var(--dsw-alias-label-primary, #eee);
  font-size: 13px;
}
#dsh-xxx-panel h3 { margin: 0 0 12px; font-size: 15px; }
`

function togglePanel() {
  active = !active
  const entry = document.querySelector<HTMLButtonElement>('[data-dsh-xxx-entry]')
  if (entry) entry.toggleAttribute('data-active', active)
  if (active) mountPanel()
  else unmountPanel()
}

function mountPanel() {
  if (container) return
  const style = document.createElement('style')
  style.textContent = PANEL_STYLE
  style.dataset.panelStyle = 'dsh-xxx'
  document.head.appendChild(style)

  container = document.createElement('div')
  container.id = 'dsh-xxx-panel'
  document.body.appendChild(container)
  root = createRoot(container)
  root.render(
    React.createElement('div', null,
      React.createElement('h3', null, 'dsh-xxx 面板'),
      React.createElement('p', null, '在这里放你的插件界面。'),
    ),
  )
}

function unmountPanel() {
  root?.unmount()
  root = null
  container?.remove()
  container = null
  document.querySelectorAll('[data-panel-style="dsh-xxx"]').forEach((el) => el.remove())
}

function ensureEntry() {
  createEntry(togglePanel)
}

/** 入口：等待侧边栏出现后注入按钮，并启动自愈观察。 */
export function mount() {
  ensureEntry()
  stopWatch = watchSidebar(ensureEntry)
  return () => {
    stopWatch?.()
    stopWatch = null
    unmountPanel()
    document.querySelectorAll('[data-dsh-xxx-entry]').forEach((el) => el.remove())
    document.querySelectorAll('[data-entry-style="dsh-xxx"]').forEach((el) => el.remove())
  }
}

export default { mount }

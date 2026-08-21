/**
 * 侧边栏入口：在「新会话」按钮下方注入插件入口行（DOM 级注入 + MutationObserver 自愈）。
 * 模式与 dsh-web-ui 全家桶（task-board / ssh）和 dsh-workshop 同构：
 * 选择器以实际 shell DOM 为准，若 shell 升级导致选择器失效，自愈观察器会等待重试。
 */

export const ENTRY_SELECTOR = '[data-dsh-xxx-entry]'

/** 入口图标（16px nav-icon 风格）。 */
export const ICON = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.2l2 1.2"/></svg>`

const ENTRY_STYLE = `
[data-dsh-xxx-entry] {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: background-color 120ms ease, color 120ms ease;
}
[data-dsh-xxx-entry]:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover);
  color: var(--dsw-alias-label-primary);
}
[data-dsh-xxx-entry][data-active] {
  background: var(--dsw-specific-sidebar-nav-item-active);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
[data-dsh-xxx-entry] .entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
[data-dsh-frame][data-sidebar-collapsed] [data-dsh-xxx-entry] {
  justify-content: center;
  padding: 0;
}
[data-dsh-frame][data-sidebar-collapsed] [data-dsh-xxx-entry] .entry-label {
  display: none;
}
`

/** 侧边栏外壳根元素。 */
export function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (column === null) return undefined
  const logoOwner = column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement
  return logoOwner ?? (column.firstElementChild as HTMLElement | undefined)
}

/** 「新会话」按钮（入口行插入其后）。 */
export function newSessionButton(root: HTMLElement): HTMLButtonElement | null {
  const nested = root.querySelector<HTMLButtonElement>('button[class*="newSession"]')
  if (nested !== null) return nested
  return root.querySelector<HTMLButtonElement>('button')
}

/** 创建入口按钮。重复调用会先移除旧实例。 */
export function createEntry(onClick: () => void): HTMLButtonElement | undefined {
  const root = sidebarRoot()
  if (!root) return undefined

  document.querySelectorAll(ENTRY_SELECTOR).forEach((el) => el.remove())
  const btn = document.createElement('button')
  btn.setAttribute('data-dsh-xxx-entry', '')
  btn.type = 'button'
  btn.innerHTML = `<span class="entry-icon">${ICON}</span><span class="entry-label">插件名</span>`
  btn.addEventListener('click', onClick)

  const target = newSessionButton(root)
  if (target) target.after(btn)
  else root.appendChild(btn)

  const style = document.createElement('style')
  style.textContent = ENTRY_STYLE
  style.dataset.entryStyle = 'dsh-xxx'
  document.head.appendChild(style)
  return btn
}

/** 自愈：shell 重渲染导致入口丢失时重新注入。返回停止函数。 */
export function watchSidebar(ensure: () => void): () => void {
  const observer = new MutationObserver(() => {
    if (!document.querySelector(ENTRY_SELECTOR)) ensure()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

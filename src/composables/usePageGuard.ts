import router from '@/router'
import { onBeforeUnmount, onMounted } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { onBeforeRouteLeave } from 'vue-router'

/** 一次性通行證（下一次導航放行） */
const KEY = 'route-allow-once'

export function allowNextNavigationOnce() {
  sessionStorage.setItem(KEY, '1')
}
function consumeAllowOnce(): boolean {
  const ok = sessionStorage.getItem(KEY) === '1'
  if (ok) sessionStorage.removeItem(KEY)
  return ok
}

/** —— 安全複製 history.state，避免覆蓋掉 Vue Router 需要的值 —— */
function cloneState<T>(s: T): T {
  try {
    // 盡量用 structuredClone（新瀏覽器）
    return (
      typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s))
    ) as T
  } catch {
    return s && typeof s === 'object' ? ({ ...(s as object) } as T) : ({} as T)
  }
}

/** —— 攔「上一頁」：用 pushState 吃掉一次返回（保留原 state） —— */
function trapBackOnce() {
  const curr: Record<string, unknown> = history.state ?? {}
  const preserved = cloneState(curr)
  preserved.__trap = true // 可選：加旗標避免混淆
  history.pushState(preserved, '', location.href)
}

function enableBackTrap() {
  window.addEventListener('popstate', trapBackOnce)
  trapBackOnce() // 進頁面時先推一筆
}

function disableBackTrap() {
  window.removeEventListener('popstate', trapBackOnce)
}

/** —— 攔「重整/關閉分頁」：beforeunload 提醒 —— */
function enableUnloadPrompt() {
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = '' // 現代瀏覽器不顯示自訂字串，但會跳系統確認框
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}

/** —— 攔「鍵盤重整」：F5 / Ctrl|Cmd+R —— */
function makeKeydownBlocker(onReloadAttempt?: () => void) {
  const handler = (e: KeyboardEvent) => {
    const isF5 = e.key === 'F5'
    const isReloadCombo = e.key.toLowerCase() === 'r' && (e.ctrlKey || e.metaKey)
    if (isF5 || isReloadCombo) {
      // 盡力攔截鍵盤觸發的重整
      e.preventDefault()
      e.stopPropagation()
      // 交由呼叫端決定要做什麼（例如打開 Modal）
      onReloadAttempt?.()
    }
  }
  return {
    enable() {
      window.addEventListener('keydown', handler, { capture: true })
    },
    disable() {
      window.removeEventListener('keydown', handler, { capture: true })
    },
  }
}

type UsePageGuardOptions = {
  /** 是否攔「上一頁」(popstate)，預設 true */
  backTrap?: boolean
  /** 是否攔「重整/關閉分頁」(beforeunload)，預設 true */
  unloadPrompt?: boolean
  /** 是否攔「鍵盤重整」（F5 / Ctrl|Cmd+R），預設 true */
  blockKeyboardReload?: boolean
  /**
   * 當偵測到使用者試圖鍵盤重整時要做什麼（例如打開你的 Modal）
   * 只有在 blockKeyboardReload = true 時才會用到
   */
  onReloadAttempt?: () => void
  /** 是否在路由離開時需要「一次性通行證」才放行，預設 true */
  guardLeave?: boolean
}

/**
 * 在需要保護的頁面呼叫，一行啟用：
 * - 上一頁攔截（history back trap）
 * - 重整/關閉提醒（beforeunload）
 * - 鍵盤重整攔截（F5 / Ctrl|Cmd+R，可帶回呼顯示自訂 Modal）
 * - 路由離開守衛（無通行證就擋）
 *
 * 程式內導航前請呼叫：allowNextNavigationOnce()
 */
export function usePageGuard(options: UsePageGuardOptions = {}) {
  const {
    backTrap = true,
    unloadPrompt = true,
    blockKeyboardReload = true,
    onReloadAttempt,
    guardLeave = true,
  } = options

  let cleanupUnload: (() => void) | null = null
  const keydownBlocker = makeKeydownBlocker(onReloadAttempt)

  onMounted(() => {
    if (backTrap) enableBackTrap()
    if (unloadPrompt) cleanupUnload = enableUnloadPrompt()
    if (blockKeyboardReload) keydownBlocker.enable()
  })

  onBeforeUnmount(() => {
    if (backTrap) disableBackTrap()
    cleanupUnload?.()
    cleanupUnload = null
    if (blockKeyboardReload) keydownBlocker.disable()
  })

  if (guardLeave) {
    onBeforeRouteLeave((_to, _from, next) => {
      if (consumeAllowOnce()) return next() // 允許 code 致使 router 變化
      return next(false) // 擋下其他手動離開
    })
  }
}

export function safePush(to: RouteLocationRaw) {
  allowNextNavigationOnce()
  return router.push(to)
}

export function safeReplace(to: RouteLocationRaw) {
  allowNextNavigationOnce()
  return router.replace(to)
}

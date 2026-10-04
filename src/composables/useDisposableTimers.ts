import { onBeforeUnmount } from 'vue'

type TimerId = ReturnType<typeof setTimeout>
type AnimationFrameId = ReturnType<typeof requestAnimationFrame>

/** 管理元件流程使用的計時器、動畫影格與可取消 delay，卸載時統一停止。 */
export function useDisposableTimers() {
  const timeoutIds = new Set<TimerId>()
  const intervalIds = new Set<TimerId>()
  const animationFrameIds = new Set<AnimationFrameId>()
  const pendingDelays = new Map<TimerId, (completed: boolean) => void>()
  const pendingAnimationFrames = new Map<AnimationFrameId, (completed: boolean) => void>()
  let isDisposed = false

  function isActive() {
    return !isDisposed
  }

  function scheduleTimeout(callback: () => void, delayMs: number): TimerId | null {
    if (isDisposed) return null

    const timerId = setTimeout(() => {
      timeoutIds.delete(timerId)
      if (isActive()) callback()
    }, delayMs)

    timeoutIds.add(timerId)
    return timerId
  }

  function scheduleInterval(callback: () => void, delayMs: number): TimerId | null {
    if (isDisposed) return null

    const timerId = setInterval(() => {
      if (isActive()) callback()
    }, delayMs)

    intervalIds.add(timerId)
    return timerId
  }

  function cancelTimeout(timerId: TimerId | null) {
    if (timerId === null) return
    clearTimeout(timerId)
    timeoutIds.delete(timerId)
  }

  function cancelInterval(timerId: TimerId | null) {
    if (timerId === null) return
    clearInterval(timerId)
    intervalIds.delete(timerId)
  }

  function delay(delayMs: number): Promise<boolean> {
    if (isDisposed) return Promise.resolve(false)

    return new Promise((resolve) => {
      const timerId = setTimeout(() => {
        pendingDelays.delete(timerId)
        resolve(true)
      }, delayMs)

      pendingDelays.set(timerId, resolve)
    })
  }

  function nextAnimationFrame(): Promise<boolean> {
    if (isDisposed) return Promise.resolve(false)

    return new Promise((resolve) => {
      const animationFrameId = requestAnimationFrame(() => {
        animationFrameIds.delete(animationFrameId)
        pendingAnimationFrames.delete(animationFrameId)
        resolve(true)
      })

      animationFrameIds.add(animationFrameId)
      pendingAnimationFrames.set(animationFrameId, resolve)
    })
  }

  function dispose() {
    if (isDisposed) return
    isDisposed = true

    for (const timerId of timeoutIds) clearTimeout(timerId)
    for (const timerId of intervalIds) clearInterval(timerId)
    for (const [timerId, resolve] of pendingDelays) {
      clearTimeout(timerId)
      resolve(false)
    }
    for (const [animationFrameId, resolve] of pendingAnimationFrames) {
      cancelAnimationFrame(animationFrameId)
      resolve(false)
    }

    timeoutIds.clear()
    intervalIds.clear()
    animationFrameIds.clear()
    pendingDelays.clear()
    pendingAnimationFrames.clear()
  }

  onBeforeUnmount(dispose)

  return {
    cancelInterval,
    cancelTimeout,
    delay,
    dispose,
    isActive,
    nextAnimationFrame,
    scheduleInterval,
    scheduleTimeout,
  }
}

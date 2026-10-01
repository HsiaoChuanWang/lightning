import {
  LOGIN_CLOUDS_DELAY_MS,
  LOGIN_FORM_DELAY_MS,
  LOGIN_INPUT_DELAY_MS,
  LOGIN_STARS_DELAY_MS,
} from '@/config/timing'
import { useGlobalStore } from '@/stores/global'
import { safePush } from '@/composables/usePageGuard'
import { nextTick, onMounted, ref } from 'vue'

export function useEntryAnimation() {
  const globalStore = useGlobalStore()
  const showTitle = ref(false)
  const showStars = ref(false)
  const showClouds = ref(false)
  const showFromBottom = ref(false)
  const showInputArea = ref(false)
  const showEntryBanner = ref(false)
  const pendingPushUrl = ref<string | null>(null)

  /** 關閉配對中 Modal，播放進入遊戲的封鎖線動畫。 */
  function triggerEntryAnimation(url: string) {
    globalStore.setIsLoadingModalOpen(false)
    pendingPushUrl.value = url
    showEntryBanner.value = true
  }

  /**  一一移除封鎖線，準備導向 Start Challenge 頁面。 */
  async function handleBannerFinished() {
    if (!pendingPushUrl.value) return

    const url = pendingPushUrl.value
    showEntryBanner.value = false
    pendingPushUrl.value = null
    await nextTick()
    safePush(url)
  }

  onMounted(() => {
    showTitle.value = true

    setTimeout(() => (showClouds.value = true), LOGIN_CLOUDS_DELAY_MS)
    setTimeout(() => (showStars.value = true), LOGIN_STARS_DELAY_MS)
    setTimeout(() => (showFromBottom.value = true), LOGIN_FORM_DELAY_MS)
    setTimeout(() => (showInputArea.value = true), LOGIN_INPUT_DELAY_MS)
  })

  return {
    handleBannerFinished,
    showClouds,
    showEntryBanner,
    showFromBottom,
    showInputArea,
    showStars,
    showTitle,
    triggerEntryAnimation,
  }
}

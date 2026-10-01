<script setup lang="ts">
import { usePageGuard } from '@/composables/usePageGuard'
import { ENTRY_BANNER_DURATION_MS, ENTRY_BANNER_TRANSITION_MS } from '@/config/timing'
import { useGlobalStore } from '@/stores/global'
import { onMounted, ref } from 'vue'

const emit = defineEmits(['finished'])

const globalStore = useGlobalStore()

usePageGuard({
  onReloadAttempt: () => {
    globalStore.setIsBackToLoginModalOpen(true)
  },
})

const isGrayOverlayActive = ref(true)
const showBanners = ref(false)

onMounted(() => {
  showBanners.value = true
  // 設定 5 秒後將灰色遮罩關閉
  setTimeout(() => {
    isGrayOverlayActive.value = false
  }, ENTRY_BANNER_TRANSITION_MS)

  setTimeout(() => {
    showBanners.value = false
  }, ENTRY_BANNER_TRANSITION_MS)

  setTimeout(() => {
    emit('finished')
  }, ENTRY_BANNER_DURATION_MS)
})
</script>

<template>
  <div class="entry-banner-view">
    <Transition name="fade">
      <div v-if="isGrayOverlayActive" class="gray-mask"></div>
    </Transition>

    <div class="entry-banner-background" v-if="!isGrayOverlayActive" />

    <transition name="banner-move">
      <img
        v-show="showBanners"
        src="@/assets/images/entryBanner/bandage01.png"
        class="banner banner01 from-right"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage02.png"
        v-show="showBanners"
        class="banner banner02 from-left"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage03.png"
        v-show="showBanners"
        class="banner banner03 from-left"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage04.png"
        v-show="showBanners"
        class="banner banner04 from-bottom"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage05.png"
        v-show="showBanners"
        class="banner banner05 from-left"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage06.png"
        v-show="showBanners"
        class="banner banner06 from-right"
        alt=""
      />
    </transition>

    <transition name="banner-move">
      <img
        src="@/assets/images/entryBanner/bandage07.png"
        v-show="showBanners"
        class="banner banner07 from-right"
        alt=""
      />
    </transition>
  </div>
</template>

<style scoped>
.entry-banner-view {
  min-height: 100vh;
  position: relative;
  overflow: hidden;

  z-index: 999;
}

.gray-mask {
  position: absolute;
  inset: 0;
  background-color: var(--color-neutral-1800);
  z-index: 2;
}

.fade-leave-active {
  transition: opacity 1s ease-in-out;
}

.fade-leave-to {
  opacity: 0;
}

.entry-banner-background {
  min-height: 100vh;
  position: relative;
  background-image:
    url('@/assets/images/startChallenge/startChallengeBackground.png'),
    linear-gradient(to bottom, var(--color-blue-300), var(--color-blue-700));
  background-size:
    auto 100%,
    cover;
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;

  overflow: hidden;
}

.banner {
  position: absolute;
  z-index: 3;
}

/* banner 進入動畫 */
.banner-move-enter-active {
  transition: transform 0.1s linear;
}

/* 方向 1: 從左到右 */
.banner-move-enter-from.from-left {
  transform: translateX(-100vw);
}

/* 方向 2: 從右到左 */
.banner-move-enter-from.from-right {
  transform: translateX(100vw);
}

/* 方向 3: 由下到上 */
.banner-move-enter-from.from-bottom {
  transform: translateY(100vh);
}

/* 離場動畫 */
.banner-move-leave-active {
  transition: transform 0.15s linear !important;
}

.banner-move-leave-to.from-left {
  transform: translateX(-100vw);
}

.banner-move-leave-to.from-right {
  transform: translateX(100vw);
}

.banner-move-leave-to.from-bottom {
  transform: translateY(100vh);
}

.banner-move-enter-to,
.banner-move-leave-from {
  transform: translate(0, 0);
}

/* 依序出現 banner */
.banner02.banner-move-enter-active {
  transition-delay: 0.2s;
}

.banner03.banner-move-enter-active {
  transition-delay: 0.4s;
}

.banner04.banner-move-enter-active {
  transition-delay: 0.8s;
}

.banner05.banner-move-enter-active {
  transition-delay: 1.2s;
}

.banner06.banner-move-enter-active {
  transition-delay: 1.4s;
}

.banner07.banner-move-enter-active {
  transition-delay: 1.4s;
}

/* 各 banner 位置 */
.banner01 {
  top: 0px;
  right: 0px;
}

.banner02 {
  bottom: 0px;
  left: 0px;
}

.banner03 {
  bottom: 0px;
  left: 0px;
}

.banner04 {
  top: 0px;
  right: 0px;
}

.banner05 {
  bottom: 268px;
  left: 0px;
}

.banner06 {
  bottom: 500px;
  right: 0px;
}

.banner07 {
  bottom: 0px;
  right: 0px;
}
</style>

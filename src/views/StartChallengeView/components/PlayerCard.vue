<script setup lang="ts">
import { computed } from 'vue'
import InfoCard from './InfoCard.vue'

interface InfoData {
  winCount: number
  lossCount: number
  winRate: number
}

interface Props {
  userId: string
  isMe: boolean
  userName: string
  infoData: InfoData
  delay?: number
}
const props = withDefaults(defineProps<Props>(), {
  delay: 0,
})

interface LabelItem {
  label: 'Win' | 'Lose' | 'Win Rate'
  value: number
  unit?: string
  labelColor: string
}

const labelList = computed<LabelItem[]>(() => [
  { label: 'Win', value: props.infoData.winCount, labelColor: 'var(--color-yellow-800)' },
  { label: 'Lose', value: props.infoData.lossCount, labelColor: 'var(--color-pink-1000)' },
  {
    label: 'Win Rate',
    value: props.infoData.winRate,
    unit: '%',
    labelColor: 'var(--color-blue-1400)',
  },
])

// 計算 CSS 用的字串(number to string)
const maskDelay = computed(() => `${props.delay}s`)
// 內容顯示的時間要比遮罩晚一點
const contentDelay = computed(() => `${props.delay + 0.4}s`)
</script>

<template>
  <div class="animation-container">
    <div class="reveal-mask"></div>

    <div class="content-wrapper">
      <div class="wrapper">
        <div class="player-tag">
          <p class="quantico-bold-24">Player</p>
        </div>

        <div class="ribbon" />

        <div v-if="isMe" class="badge-ring">
          <div class="badge-core exo2-black-22">
            <p>YOU</p>
          </div>
        </div>

        <div class="id-name-box">
          <div class="id-tag">
            <p class="quantico-bold-27">#{{ userId.slice(0, 15) }}</p>
          </div>

          <p class="name bungee-regular-36">{{ userName }}</p>
        </div>

        <div class="info-box">
          <InfoCard
            v-for="item in labelList"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :unit="item.unit"
            :labelColor="item.labelColor"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animation-container {
  position: relative;
  width: 700px;
  height: 240px;
  /* 統一由最外層控制旋轉，內層 wrapper 的 rotate 要刪掉 */
  transform: rotate(-1.5deg);
}

.reveal-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-yellow-900);
  border-radius: 4px 20px;
  z-index: 10;

  transform: scaleX(0);
  transform-origin: left;

  /* 設定 0.4s 長完，長完後直接消失*/
  animation: maskReveal 0.4s v-bind(maskDelay) ease-in-out forwards;

  /* 消除 rotate 造成的鋸齒 */
  outline: 1px solid transparent;
}

.content-wrapper {
  opacity: 0;
  /* 內容在黃色長滿的那一刻 (delay + 0.2s) 直接出現 */
  animation: fadeIn 0.2s v-bind(contentDelay) forwards;
}

@keyframes maskReveal {
  0% {
    transform: scaleX(0);
    opacity: 1;
  }
  99% {
    transform: scaleX(1);
    opacity: 1;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.wrapper {
  width: 700px;
  height: 240px;
  background-color: var(--color-neutral-50);
  border-radius: 4px 20px;
  box-shadow: var(--shadow-3);

  position: relative;
}

.player-tag {
  position: absolute;
  top: 0;
  right: 0;

  width: 197px;
  height: 45px;
  background-color: var(--color-teal-400);
  border-radius: 0 20px;

  text-align: center;
  color: var(--color-blue-500);
  display: flex;
  justify-content: center;
  align-items: center;
}

.ribbon {
  position: absolute;

  width: 135px;
  height: 100%;
  background-color: var(--color-red-500);
  border-radius: 4px 4px 4px 20px;

  clip-path: polygon(0 0, 100% 0, 50% 100%, 0 100%);
}

.badge-ring {
  position: absolute;
  z-index: 2;
  top: -24px;
  left: -30px;

  width: 86px;
  height: 86px;
  background-color: var(--color-neutral-1300);
  border-radius: 0px 86px 86px;

  display: flex;
  justify-content: center;
  align-items: center;
}

.badge-core {
  width: 68px;
  height: 68px;
  border-radius: 68px;
  background-color: var(--color-neutral-800);
  color: var(--color-neutral-50);

  display: flex;
  justify-content: center;
  align-items: center;
}

.id-name-box {
  position: absolute;
  margin: 35px 0 0 35px;
}

.id-tag {
  width: 300px;
  height: 41px;
  padding: 0 10px;
  background-color: var(--color-neutral-50);
  color: var(--color-neutral-900);
  border: 1px solid var(--color-neutral-900);
  transform: rotate(-5deg);
  margin-bottom: 30px;

  display: flex;
  justify-content: center;
  align-items: center;
}

.name {
  width: 222px;
  max-width: 222px;
  color: var(--color-yellow-300);
  -webkit-text-stroke: 1px var(--color-neutral-900);
  text-shadow:
    1px 2px 0 var(--color-neutral-900),
    3px 4px 0 var(--color-neutral-900);
}

.info-box {
  position: absolute;
  bottom: 43px;
  right: 24px;

  display: flex;
  gap: 14px;

  transform: rotate(-0.5deg);
}
</style>

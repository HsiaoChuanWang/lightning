<script setup lang="ts">
import PlayerInfo from '@/components/common/PlayerInfo.vue'

const SCORE_BLOCK_MIN_WIDTH_PX = 156
const SCORE_BLOCK_COUNT = 3
const SCORE_ROW_GAP_PX = 8
const SCORE_ROW_RESERVED_WIDTH_PX =
  SCORE_BLOCK_MIN_WIDTH_PX * SCORE_BLOCK_COUNT + SCORE_ROW_GAP_PX * (SCORE_BLOCK_COUNT - 1)

const {
  iconColor,
  playerName,
  originalScore,
  accuracyScore,
  timeBonusScore,
  originalWidth,
  accuracyWidth,
  timeBonusWidth,
} = defineProps<{
  iconColor: string
  playerName: string
  originalScore: number
  accuracyScore: number
  timeBonusScore: number
  originalWidth: number
  accuracyWidth: number
  timeBonusWidth: number
}>()

/** 以 156px 為基礎寬度，再依分數百分比分配 score row 的剩餘寬度。 */
function calcResponsiveWidth(widthPercent: number) {
  const normalizedPercent = Math.min(100, Math.max(0, widthPercent))
  const ratio = normalizedPercent / 100
  const responsiveOffsetPx = SCORE_BLOCK_MIN_WIDTH_PX - ratio * SCORE_ROW_RESERVED_WIDTH_PX

  return `calc(${normalizedPercent}% + ${responsiveOffsetPx}px)`
}
</script>

<template>
  <div class="player-row">
    <PlayerInfo
      icon-size="36px"
      :icon-color="iconColor"
      :value="playerName"
      width="150px"
      value-color="var(--color-neutral-900)"
      value-typo="quantico-bold-20"
    />

    <div class="score-row">
      <div class="score-block" :style="{ width: calcResponsiveWidth(originalWidth) }">
        <div class="score-bar original-bar">
          <p class="score-number bungee-regular-60">{{ originalScore }}</p>
        </div>

        <p class="quantico-bold-16 score-label">Original</p>
      </div>

      <div class="score-block" :style="{ width: calcResponsiveWidth(accuracyWidth) }">
        <div class="score-bar accuracy-bar">
          <p class="score-number bungee-regular-60">+{{ accuracyScore }}</p>
        </div>

        <p class="quantico-bold-16 score-label">Accuracy</p>
      </div>

      <div class="score-block" :style="{ width: calcResponsiveWidth(timeBonusWidth) }">
        <div class="score-bar time-bonuos-bar">
          <p class="score-number bungee-regular-60">+{{ timeBonusScore }}</p>
        </div>

        <p class="quantico-bold-16 score-label">Time Bonus</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-row {
  width: 100%;

  display: flex;
  align-items: center;
  gap: 16px;
}

.score-row {
  flex: 1 0 0;
  display: flex;
  gap: 8px;
}

.score-block {
  min-width: 168px;
}

.score-bar {
  width: 100%;
  height: 117px;
  border-radius: 8px;
  margin-bottom: 4px;

  display: flex;
  justify-content: center;
  align-items: center;

  transition: width 1s ease-out;
}

.original-bar {
  background-color: var(--color-blue-1100);
}

.accuracy-bar {
  background-color: var(--color-pink-700);
}

.time-bonuos-bar {
  background-color: var(--color-warm-500);
}

.score-number {
  color: var(--color-neutral-100);
  -webkit-text-stroke: 2px var(--color-neutral-900);
}

.score-label {
  width: 100%;
  text-align: center;
}
</style>

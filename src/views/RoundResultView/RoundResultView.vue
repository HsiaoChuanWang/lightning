<script setup lang="ts">
import { usePageGuard } from '@/composables/usePageGuard'
import { MAX_CUMULATIVE_SCORE } from '@/config/game'
import { useGlobalStore } from '@/stores/global'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { calculateCumulativeScore } from '@/utils/helpers'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import PlayerScoreRow from './components/PlayerScoreRow.vue'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const roundStore = useRoundStore()

const { userInfo, opponentInfo } = storeToRefs(userStore)
const { myRoundList } = storeToRefs(roundStore)

usePageGuard({
  onReloadAttempt: () => {
    globalStore.setIsBackToLoginModalOpen(true)
  },
})

const currentRound = computed(() => myRoundList.value.length)

const myScoreWithoutThisRound = computed(() =>
  calculateCumulativeScore(roundStore.myRoundList.slice(0, currentRound.value - 1)),
)
const opponentScoreWithoutThisRound = computed(() =>
  calculateCumulativeScore(roundStore.opponentRoundList.slice(0, currentRound.value - 1)),
)

const myScoreThisRound = computed(() => roundStore.myRoundList[currentRound.value - 1]?.score ?? 0)

const myBonusThisRound = computed(() => roundStore.myRoundList[currentRound.value - 1]?.bonus ?? 0)

const opponentScoreThisRound = computed(
  () => roundStore.opponentRoundList[currentRound.value - 1]?.score ?? 0,
)

const opponentBonusThisRound = computed(
  () => roundStore.opponentRoundList[currentRound.value - 1]?.bonus ?? 0,
)

function calcWidth(score: number) {
  return (score / MAX_CUMULATIVE_SCORE) * 100
}

// 停留時間、下一回合與最終結算皆由 Supabase Match phase 控制。
</script>

<template>
  <div class="round-result-view">
    <div class="round-card">
      <p class="title bungee-regular-60">Scoring Time!</p>

      <div class="main">
        <PlayerScoreRow
          icon-color="var(--color-red-200)"
          :player-name="userInfo.userName"
          :original-score="myScoreWithoutThisRound"
          :accuracy-score="myScoreThisRound"
          :time-bonus-score="myBonusThisRound"
          :original-width="calcWidth(myScoreWithoutThisRound)"
          :accuracy-width="calcWidth(myScoreThisRound)"
          :time-bonus-width="calcWidth(myBonusThisRound)"
        />

        <PlayerScoreRow
          icon-color="var(--color-blue-1000)"
          :player-name="opponentInfo.opponentName"
          :original-score="opponentScoreWithoutThisRound"
          :accuracy-score="opponentScoreThisRound"
          :time-bonus-score="opponentBonusThisRound"
          :original-width="calcWidth(opponentScoreWithoutThisRound)"
          :accuracy-width="calcWidth(opponentScoreThisRound)"
          :time-bonus-width="calcWidth(opponentBonusThisRound)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.round-result-view {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  padding: 40px;
  background: linear-gradient(
    to bottom,
    var(--color-teal-800),
    var(--color-yellow-600),
    var(--color-pink-100)
  );
}

.round-card {
  width: 100%;
  height: 100%;
  padding: 48px 32px 40px;
  background-color: var(--color-neutral-1200);
  border: 2px solid var(--color-neutral-900);
  border-radius: 30px;
  box-shadow: var(--shadow-9);

  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 63px;
}

.title {
  text-align: center;
}

.main {
  flex: 1 0 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
</style>

<script setup lang="ts">
import { safePush, usePageGuard } from '@/composables/usePageGuard'
import { MAX_CUMULATIVE_SCORE, TOTAL_ROUNDS } from '@/config/game'
import { ROUND_RESULT_DURATION_MS } from '@/config/timing'
import { completeMatch, isMatchAbandoned } from '@/services/matchService'
import { updateUserStats } from '@/services/userService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { calculateCumulativeScore } from '@/utils/helpers'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PlayerScoreRow from './components/PlayerScoreRow.vue'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const matchStore = useMatchStore()
const roundStore = useRoundStore()
const route = useRoute()
const matchId = route.params.matchId

const { userInfo, opponentInfo } = storeToRefs(userStore)
const { myRoundList, opponentRoundList } = storeToRefs(roundStore)
const { matchData } = storeToRefs(matchStore)

usePageGuard({
  onReloadAttempt: () => {
    globalStore.setIsBackToLoginModalOpen(true)
  },
})

const isPlayerOne = userInfo.value.userId === matchData.value.playerOneId
const currentRound = computed(() => myRoundList.value.length)
const myCumulativeScore = computed(() => calculateCumulativeScore(myRoundList.value))
const opponentCumulativeScore = computed(() => calculateCumulativeScore(opponentRoundList.value))
const winnerId = computed(() => {
  if (myCumulativeScore.value > opponentCumulativeScore.value) {
    return userInfo.value.userId
  } else if (myCumulativeScore.value < opponentCumulativeScore.value) {
    return opponentInfo.value.opponentId
  } else {
    return null
  }
})

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

// 確認對手是否已經放棄比賽，若放棄，此局不列入計分
async function checkIsAbandonedMatch() {
  return isMatchAbandoned(matchId, userStore.userInfo.userId)
}

async function updateMatch() {
  try {
    const status = (await checkIsAbandonedMatch()) ? 'abandoned' : 'completed'

    matchStore.updateMatchData({ status, isComplete: true })

    await completeMatch({
      matchId: matchStore.matchData.matchId,
      winnerId: winnerId.value,
      isPlayerOne,
      status,
    })

    return true
  } catch (error) {
    // console.error('[updateMatch] failed:', error)
    return false
  }
}

async function updateUserWinRate() {
  const { userId, winCount, lossCount, totalMatches } = userInfo.value
  const isWin = winnerId.value === userId

  try {
    const isAbandoned = await checkIsAbandonedMatch()
    if (isAbandoned) return

    matchStore.setIsWin(isWin)

    await updateUserStats({
      userId,
      winCount: isWin ? winCount + 1 : winCount,
      lossCount: isWin ? lossCount : lossCount + 1,
      totalMatches: totalMatches + 1,
    })
  } catch (error) {
    // console.error('[updateUserWinRate] failed:', error)
  }
}

onMounted(async () => {
  if (currentRound.value < TOTAL_ROUNDS) {
    setTimeout(() => {
      safePush(`/round-start/${matchId}`)
    }, ROUND_RESULT_DURATION_MS)
  } else {
    const [matchUpdated] = await Promise.all([updateMatch(), updateUserWinRate()])

    safePush(`/game-result/${matchId}`)
  }
})
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

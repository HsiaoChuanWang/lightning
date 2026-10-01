<script setup lang="ts">
import PlayerInfo from '@/components/common/PlayerInfo.vue'
import ButtonComponent from '@/components/ui-components/ButtonComponent.vue'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useRevengeStore } from '@/stores/revenge'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { calculateCumulativeScore } from '@/utils/helpers'
import { safeReplace, usePageGuard } from '@/composables/usePageGuard'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PlayAgainModal from './components/PlayAgainModal.vue'
import { useRematch } from './composables/useRematch'
import { useRevengeRealtime } from './composables/useRevengeRealtime'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const roundStore = useRoundStore()
const matchStore = useMatchStore()
const route = useRoute()
const matchId = route.params.matchId

const { isPlayAgainModalOpen } = storeToRefs(globalStore)
const { userInfo, opponentInfo } = storeToRefs(userStore)
const { myRoundList, opponentRoundList } = storeToRefs(roundStore)
const { isWin, matchData } = storeToRefs(matchStore)
const { revengeInfo } = storeToRefs(useRevengeStore())

usePageGuard()

const myCumulativeScore = computed(() => calculateCumulativeScore(myRoundList.value))
const opponentCumulativeScore = computed(() => calculateCumulativeScore(opponentRoundList.value))
const gameResult = computed(() => {
  if (myCumulativeScore.value > opponentCumulativeScore.value) return 'win'
  if (myCumulativeScore.value < opponentCumulativeScore.value) return 'lose'
  return 'tie'
})

const { handlePlayAgain, replyPlayAgainRequest } = useRematch(matchId)
useRevengeRealtime(matchId)

/** 關閉結果流程並返回登入首頁。 */
function handleBackToHome() {
  safeReplace('/')
}
</script>

<template>
  <div
    class="game-result-view"
    :class="{
      'win-background': gameResult === 'win',
      'lose-background': gameResult === 'lose',
      'tie-background': gameResult === 'tie',
    }"
  >
    <p v-if="gameResult === 'win'" class="title bungee-regular-96">Win!</p>
    <p v-if="gameResult === 'lose'" class="title bungee-regular-96">Lose...</p>
    <p v-if="gameResult === 'tie'" class="title bungee-regular-96">Tie!</p>

    <div class="score-section">
      <div class="player-card">
        <PlayerInfo
          icon-size="36px"
          icon-color="var(--color-blue-1000)"
          :value="userInfo.userName"
          value-color="var(--color-neutral-900)"
          value-typo="quantico-bold-20"
        />

        <div class="score-block my-score-block">
          <p class="score-text exo2-blod-80">{{ myCumulativeScore }}</p>
        </div>
      </div>

      <div class="player-card">
        <PlayerInfo
          icon-size="36px"
          icon-color="var(--color-red-200)"
          :value="opponentInfo.opponentName"
          value-color="var(--color-neutral-900)"
          value-typo="quantico-bold-20"
        />

        <div class="score-block opponent-score-block">
          <p class="score-text exo2-blod-80">{{ opponentCumulativeScore }}</p>
        </div>
      </div>
    </div>

    <div class="buttons-container">
      <ButtonComponent
        class="quantico-regular-22"
        color-theme="mustard"
        width="200px"
        @click="handlePlayAgain"
        v-if="matchData.opponentType === 'human'"
      >
        Play again
      </ButtonComponent>

      <ButtonComponent
        class="quantico-regular-22"
        color-theme="neutral"
        width="200px"
        @click="handleBackToHome"
      >
        Back to Home
      </ButtonComponent>
    </div>

    <PlayAgainModal
      v-if="isPlayAgainModalOpen"
      :show="isPlayAgainModalOpen"
      :is-inviter="revengeInfo.fromUserId === userInfo.userId"
      :is-win="isWin"
      :status="revengeInfo.status"
      @reply="replyPlayAgainRequest"
    />
  </div>
</template>

<style scoped>
.game-result-view {
  min-height: 100vh;
  background-size:
    auto 100%,
    cover;
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;

  display: flex;
  flex-direction: column;
  gap: 48px;
  justify-content: center;
  align-items: center;
}

.win-background {
  background-image:
    url('@/assets/images/common/lightningBackground.png'),
    linear-gradient(to bottom, var(--color-teal-500), var(--color-teal-400));
}

.lose-background {
  background-image:
    url('@/assets/images/common/lightningBackground.png'),
    linear-gradient(to bottom, var(--color-pink-800), var(--color-pink-900));
}

.tie-background {
  background-image:
    url('@/assets/images/common/lightningBackground.png'),
    linear-gradient(to bottom, var(--color-yellow-300), var(--color-mustard-600));
}

.title {
  color: var(--color-neutral-50);
  -webkit-text-stroke: 1px var(--color-neutral-900);
  text-shadow:
    2px 2px 0 var(--color-neutral-900),
    3px 3px 0 var(--color-neutral-900);
}

.score-section {
  display: flex;
  gap: 20px;
}

.player-card {
  width: 400px;
  height: 260px;
  background-color: var(--color-neutral-50);
  border: 2px solid var(--color-neutral-900);
  border-radius: 16px;
  padding: 16px 16px 32px;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-block {
  flex: 1 0 0;
  width: 100%;
  border: 1px solid var(--color-neutral-900);
  border-radius: 12px;
  box-shadow: var(--shadow-10);

  display: flex;
  justify-content: center;
  align-items: center;
}

.my-score-block {
  background: linear-gradient(to right, var(--color-warm-600), var(--color-blue-1200));
}

.opponent-score-block {
  background: linear-gradient(
    to right,
    var(--color-yellow-700),
    var(--color-mustard-700),
    var(--color-blue-1300)
  );
}

.score-text {
  color: var(--color-neutral-50);
  text-shadow: 2px 2px 0px 0px var(--color-neutral-1700);
}

.buttons-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>

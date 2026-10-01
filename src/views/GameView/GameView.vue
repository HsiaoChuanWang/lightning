<script setup lang="ts">
import clockImg from '@/assets/images/common/clock.png'
import PlayerInfo from '@/components/common/PlayerInfo.vue'
import { ANSWER_CHAR_LIMIT, TOTAL_ROUNDS } from '@/config/game'
import { ROUND_SYNC_MAX_DELAY_MS, ROUND_SYNC_MIN_DELAY_MS } from '@/config/timing'
import { useGlobalStore } from '@/stores/global'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils/helpers'
import { usePageGuard } from '@/composables/usePageGuard'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import DescribeSection from './components/DescribeSection.vue'
import QuestionSection from './components/QuestionSection.vue'
import { useOpponentRoundRealtime } from './composables/useOpponentRoundRealtime'
import { useRoundGameplay } from './composables/useRoundGameplay'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const quizStore = useQuizStore()
const roundStore = useRoundStore()
const route = useRoute()
const matchId = route.params.matchId

const { userInfo, opponentInfo } = storeToRefs(userStore)
const { quizList } = storeToRefs(quizStore)
const { myRoundList, opponentRoundList } = storeToRefs(roundStore)

usePageGuard({
  onReloadAttempt: () => {
    globalStore.setIsBackToLoginModalOpen(true)
  },
})

const currentRound = myRoundList.value.length
const currentQuiz = quizList.value[currentRound - 1]
const currentQuizImage = import.meta.env.VITE_SUPABASE_URL + currentQuiz?.imageUrl
const myCreatedAt = new Date(myRoundList.value[currentRound - 1]?.createdAt ?? 0).getTime()
const opponentCreatedAt = new Date(
  opponentRoundList.value[currentRound - 1]?.createdAt ?? 0,
).getTime()
const createdDiff = Math.abs(opponentCreatedAt - myCreatedAt)
const delayTimeMs = Math.min(
  ROUND_SYNC_MAX_DELAY_MS,
  Math.max(ROUND_SYNC_MIN_DELAY_MS, createdDiff),
)

const {
  handleSubmit,
  inputValue,
  isStartAnswer,
  isStartHidden,
  isSubmitHidden,
  myScoreWithoutThisRound,
  opponentScoreWithoutThisRound,
  opponentSubmitted,
  remainingTime,
  roundFinished,
  showAnswer,
  timeProgress,
} = useRoundGameplay({ currentRound, delayTimeMs, matchId })

useOpponentRoundRealtime(opponentInfo.value.opponentId)
</script>

<template>
  <div class="game-view">
    <div class="header">
      <div class="clock">
        <img :src="clockImg" class="clock-img" />
      </div>

      <div class="time-bar">
        <p v-if="remainingTime !== 0" class="time-indicator quantico-bold-40">
          {{ formatTime(remainingTime, true) }}
        </p>
        <p v-if="remainingTime === 0" class="time-indicator quantico-bold-40">Time's up!</p>

        <div
          class="time-left-bar"
          v-show="remainingTime !== 0"
          :style="{
            width: timeProgress + '%',
          }"
        >
          <div class="time-left-inner" />
        </div>
      </div>

      <div class="score-section">
        <div class="score my-score">
          <PlayerInfo
            icon-size="36px"
            icon-color="var(--color-red-200)"
            :value="myScoreWithoutThisRound"
            value-color="var(--color-neutral-100)"
            value-typo="bungee-regular-32"
            width="100%"
            value-align="space-between"
            :wrap-text="false"
          />
        </div>

        <div class="score opponent-score">
          <PlayerInfo
            icon-size="36px"
            icon-color="var(--color-blue-1000)"
            :value="opponentScoreWithoutThisRound"
            value-color="var(--color-neutral-100)"
            value-typo="bungee-regular-32"
            width="100%"
            value-align="space-between"
            :wrap-text="false"
          />
        </div>
      </div>
    </div>

    <div class="main">
      <QuestionSection
        :current-quiz-image="currentQuizImage"
        :current-round="currentRound"
        :total-rounds="TOTAL_ROUNDS"
        :correct-answer="currentQuiz?.answer ?? ''"
        :show-answer="showAnswer"
      />

      <n-divider vertical class="divider" />

      <DescribeSection
        :my-name="userInfo.userName"
        :my-answer="myRoundList[myRoundList.length - 1]?.input ?? ''"
        :opponent-name="opponentInfo.opponentName"
        :opponent-answer="opponentRoundList[opponentRoundList.length - 1]?.input ?? ''"
        :opponent-submitted="opponentSubmitted"
        :count-chars="inputValue.length"
        :chars-limit="ANSWER_CHAR_LIMIT"
        :input-value="inputValue"
        :is-start-answer="isStartAnswer"
        :is-start-hidden="isStartHidden"
        :is-submit-hidden="isSubmitHidden"
        @update:inputValue="(value) => (inputValue = value)"
        @startAnswer="isStartAnswer = true"
        @submitAnswer="handleSubmit"
        :show-answer="showAnswer"
      />

      <div v-if="roundFinished && !showAnswer" class="time-up-container">
        <div class="time-up-wrap">
          <div class="time-up"><p class="bungee-regular-92">TIME'S UP!</p></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  padding: 0 48px 36px;
  background-image:
    url('@/assets/images/common/lightningBackground.png'),
    linear-gradient(to bottom, var(--color-neutral-1100), var(--color-blue-800));
  background-size:
    auto 100%,
    cover;
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;

  display: flex;
  flex-direction: column;
  gap: 17px;
  align-items: center;
}

.header {
  width: 100%;
  height: 80px;
  padding: 0 14px;
  background-color: var(--color-blue-900);
  box-shadow: var(--shadow-7);
  border-radius: 0 0 28px 28px;

  display: flex;
  gap: 18px;
  justify-content: space-between;
  align-items: center;
}

.clock {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--color-red-900);

  display: flex;
  justify-content: center;
  align-items: center;
}

.clock-img {
  width: 35px;
}

.time-bar {
  flex: 1 0 0;
  height: 56px;
  background-color: var(--color-neutral-50);
  border-radius: 12px;
  box-shadow: var(--shadow-8);

  position: relative;
}

.time-left-bar {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  transition: width 0.3s linear;
  padding: 27px 7px 5px;

  height: 100%;
  border-radius: 12px;
  background-color: var(--color-yellow-300);
}

.time-left-inner {
  width: 100%;
  height: 100%;
  border-radius: 4px 4px 8px 8px;
  background-color: var(--color-yellow-500);
}

.time-indicator {
  position: absolute;
  z-index: 2;
  height: 100%;

  color: var(--color-neutral-1600);
  margin-left: 16px;

  display: flex;
  justify-content: center;
  align-items: center;
}

.score-section {
  width: fit-content;
  height: 54px;

  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.score {
  width: 142px;
  height: 100%;
  padding: 8px 16px;
  border-radius: 16px;
}

.my-score {
  background-color: var(--color-neutral-900);
}

.opponent-score {
  background-color: var(--color-blue-600);
}

.main {
  width: 100%;
  max-width: 1440px;
  flex: 1 0 0;
  background-color: var(--color-neutral-1200);
  padding: 30px 24px;
  border: 2px solid var(--color-neutral-700);
  border-radius: 40px 20px;

  display: flex;

  position: relative;
}

.divider {
  align-self: flex-end;
  width: 2px;
  height: calc(100% - 72px);
  background-color: var(--color-neutral-1400);
  margin: 0 34px 0 43px;
}

.time-up-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-5deg) translateZ(0);
}

.time-up-wrap {
  display: inline-block;
  overflow: hidden;
  padding: 4px;
}

.time-up {
  color: var(--color-neutral-900);
  background-color: var(--color-neutral-50);
  border: 4px solid var(--color-blue-500);
  box-shadow: var(--shadow-5);
  padding: 18px 35px;
  white-space: nowrap;

  /* 消除 rotate 造成的鋸齒 */
  margin: -1px;
}
</style>

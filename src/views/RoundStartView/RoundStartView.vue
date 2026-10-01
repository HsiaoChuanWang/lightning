<script setup lang="ts">
import StarIcon from '@/assets/icons/StarIcon.vue'
import QuestionDisplay from '@/components/common/QuestionDisplay.vue'
import { TOTAL_ROUNDS } from '@/config/game'
import { useGlobalStore } from '@/stores/global'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { usePageGuard } from '@/composables/usePageGuard'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useRoundPreparation } from './composables/useRoundPreparation'

const globalStore = useGlobalStore()
const quizStore = useQuizStore()
const roundStore = useRoundStore()
const route = useRoute()
const matchId = route.params.matchId

const { quizList } = storeToRefs(quizStore)
const { myRoundList } = storeToRefs(roundStore)

usePageGuard({
  onReloadAttempt: () => {
    globalStore.setIsBackToLoginModalOpen(true)
  },
})
const currentRound = myRoundList.value.length
const nextRound = currentRound + 1
const nextRoundQuiz = quizList.value[currentRound]
const currentQuizImage = import.meta.env.VITE_SUPABASE_URL + nextRoundQuiz?.imageUrl
const { currentStage } = useRoundPreparation({ currentRound, matchId, nextRound })

const repeatCount = 4
const space = ' '.repeat(5)
const text = `QUESTION ${myRoundList.value.length + 1}${space}`.repeat(repeatCount)
const chars = text.split('')
const step = 360 / chars.length
const radius = 'min(50vh, 50vw)'
</script>

<template>
  <div class="round-start-view">
    <div class="circle-text bungee-regular-36">
      <span
        v-for="(char, index) in chars"
        :key="index"
        class="char"
        :style="{
          transform: `rotate(${index * step}deg) translate(${radius}) rotate(90deg)`,
        }"
      >
        {{ char }}
      </span>
    </div>

    <div class="round-card" v-if="currentStage === 'round'">
      <p class="bungee-regular-92">Round {{ nextRound }}</p>
    </div>

    <div class="question-card" v-if="currentStage === 'question'">
      <div class="question-head">
        <StarIcon color="var(--color-mustard-600)" size="48" />
        <p class="bungee-regular-36">QUESTION</p>
      </div>

      <QuestionDisplay
        :current-quiz-image="currentQuizImage"
        :current-round="nextRound"
        :total-rounds="TOTAL_ROUNDS"
      />
    </div>
  </div>
</template>

<style scoped>
.round-start-view {
  min-height: 100vh;
  background-image:
    url('@/assets/images/common/lightningBackground.png'),
    linear-gradient(to bottom, var(--color-teal-500), var(--color-teal-400));
  background-size:
    auto 100%,
    cover;
  background-position: left, center;
  background-repeat: repeat, no-repeat;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  position: relative;
}

.circle-text {
  position: absolute;

  color: var(--color-neutral-50);
}

.char {
  position: absolute;

  transform-origin: 0 0;
}

.round-card {
  width: 466px;
  height: 138px;
  background-color: var(--color-neutral-50);
  border: 4px solid var(--color-blue-500);
  transform: rotate(-5deg);
  box-shadow: var(--shadow-5);

  display: flex;
  justify-content: center;
  align-items: center;
}

.question-card {
  width: 420px;
  padding: 35px 40px;
  background-color: var(--color-neutral-50);
  border-radius: 32px 20px;
  box-shadow: var(--shadow-6);

  display: flex;
  flex-direction: column;
  gap: 30px;
}

.question-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.question-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 15px;
}

.img-container {
  width: 340px;
  height: 340px;
  padding: 10px;
  border: 2px solid var(--color-blue-500);
  border-radius: 8px;
}

.img-container img {
  width: 100%;
  border-radius: 8px;
}

.dot-container {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot-container {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 16px;
  background-color: var(--color-neutral-1000);
}

.dot.active {
  background-color: var(--color-red-400);
  border: 1px solid var(--color-neutral-900);
}
</style>

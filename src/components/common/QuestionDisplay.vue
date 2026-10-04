<script setup lang="ts">
import flipIcon from '@/assets/images/game/flipIcon.png'
import { ref, watch } from 'vue'

const props = defineProps<{
  currentQuizImage: string
  currentRound: number
  totalRounds: number
  correctAnswer?: string
  showAnswer?: boolean
}>()

const emit = defineEmits<{
  (event: 'flip'): void
}>()

const isFlipped = ref(false)

function handleFlip() {
  if (!props.showAnswer) return
  isFlipped.value = !isFlipped.value
  emit('flip')
}

watch(
  () => props.showAnswer,
  (value) => {
    isFlipped.value = !!value
  },
  { immediate: true },
)
</script>

<template>
  <div class="question-content">
    <div
      class="flip-card"
      :class="{ flipped: isFlipped }"
      :style="{ cursor: showAnswer ? 'pointer' : 'default' }"
      @click="handleFlip"
    >
      <div class="flip-card-inner">
        <div class="flip-card-img">
          <img :src="currentQuizImage" alt="quiz" />
        </div>

        <div class="flip-card-text">
          <p class="bungee-regular-24 title">CORRECT ANSWER</p>
          <p class="quantico-regular-20 answer">{{ correctAnswer }}</p>
          <img :src="flipIcon" class="flip-icon" />
        </div>
      </div>
    </div>

    <div class="dot-container" :style="{ '--current-index': currentRound }">
      <div
        v-for="index in totalRounds"
        :key="index"
        class="dot"
        :class="{ active: index === currentRound }"
      />
    </div>
  </div>
</template>

<style scoped>
.question-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 15px;
}

.flip-card {
  width: 340px;
  height: 340px;
  perspective: 1000px;
  transition: cursor 0.2s ease;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-img,
.flip-card-text {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 8px;
}

.flip-card-img {
  background-color: var(--color-neutral-50);
  border: 2px solid var(--color-blue-500);
  padding: 10px;
}

.flip-card-text {
  background-color: var(--color-blue-700);
  color: var(--color-neutral-50);
  transform: rotateY(180deg);
  padding: 20px 16px;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer {
  flex: 1 0 0;
  line-height: 1.5;
  /* white-space: pre-line; */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.flip-icon {
  width: 72px;
  height: 72px;
  align-self: flex-end;
}

.flip-card-img img {
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

<script setup lang="ts">
import StarIcon from '@/assets/icons/StarIcon.vue'
import clickIcon from '@/assets/images/game/clickIcon.png'
import PlayerInfo from '@/components/common/PlayerInfo.vue'
import ButtonComponent from '@/components/ui-components/ButtonComponent.vue'
import InputCard from './InputCard.vue'

defineProps<{
  myName: string
  myAnswer: string
  opponentName: string
  opponentAnswer: string
  opponentSubmitted: boolean
  countChars: number
  charsLimit: number
  inputValue: string
  isStartAnswer: boolean
  isStartHidden: boolean
  isSubmitHidden: boolean
  showAnswer: boolean
}>()

const emits = defineEmits<{
  (e: 'update:inputValue', value: string): void
  (e: 'startAnswer'): void
  (e: 'submitAnswer'): void
}>()

const handleInputChange = (e: string) => emits('update:inputValue', e)
const startAnswer = () => emits('startAnswer')
const handleSubmit = () => emits('submitAnswer')
</script>

<template>
  <div class="describe-section">
    <div class="title">
      <StarIcon color="var(--color-mustard-600)" size="48" />

      <p class="bungee-regular-36">DESCRIBE THE IMAGE</p>
    </div>

    <div class="describe-box opponent-describe">
      <PlayerInfo
        icon-size="36px"
        icon-color="var(--color-red-200)"
        :value="opponentName"
        value-color="var(--color-neutral-900)"
        value-typo="quantico-bold-20"
        :wrap-text="false"
      />

      <p v-if="!opponentSubmitted && !showAnswer" class="typing quantico-regular-20">Typing...</p>
      <p v-else-if="!showAnswer" class="quantico-regular-20">Submitted</p>
      <p v-else class="quantico-regular-20 describe-line-hight">
        {{ opponentAnswer }}
      </p>
    </div>

    <div class="describe-box my-describe">
      <div class="my-name">
        <PlayerInfo
          icon-size="36px"
          icon-color="var(--color-blue-1000)"
          :value="myName"
          value-color="var(--color-neutral-900)"
          value-typo="quantico-bold-20"
          :wrap-text="false"
        />

        <span class="chars-limit">
          <p class="quantico-regular-20">{{ countChars }} / {{ charsLimit }} chars</p>
        </span>
      </div>

      <ButtonComponent
        v-if="!isStartAnswer && !showAnswer"
        class="quantico-regular-22"
        color-theme="mustard"
        width="100%"
        height="calc(100% - 56px)"
        :isHidden="isStartHidden"
        @click="startAnswer"
      >
        <div class="click-to-start">
          <img :src="clickIcon" class="click-icon" />
          <p class="quantico-regular-22">Click here to describe your answer.</p>
        </div>
      </ButtonComponent>

      <div v-if="isStartAnswer && !showAnswer" class="input-submit-section">
        <div class="input-area">
          <InputCard
            :modelValue="inputValue"
            type="textarea"
            placeholder=""
            @input="handleInputChange"
            :disabled="isSubmitHidden"
          />
        </div>

        <ButtonComponent
          class="quantico-regular-22 input-submit-button"
          color-theme="mustard"
          width="112px"
          height="38px"
          :isHidden="isSubmitHidden"
          @click="handleSubmit"
        >
          <p class="quantico-regular-18">Submit</p>
        </ButtonComponent>
      </div>

      <p v-if="showAnswer" class="quantico-regular-20 describe-line-hight">{{ myAnswer }}</p>
    </div>
  </div>
</template>

<style scoped>
.describe-section {
  flex: 1 0 0;
  height: 100%;

  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.describe-box {
  flex: 1 0 0;
  width: 100%;
  min-height: 180px;
  padding: 15px;
  border-width: 2px;
  border-style: solid;
  border-radius: 18px;

  display: flex;
  flex-direction: column;
  gap: 10px;
}

.describe-line-hight {
  line-height: 1.5;
}

.opponent-describe {
  background-color: var(--color-teal-600);
  border-color: var(--color-teal-700);
}

.typing {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  border-right: 2px solid var(--color-neutral-0);
  animation:
    typing 3s steps(9, end) infinite,
    cursor 0.8s step-end infinite;
}

@keyframes typing {
  0% {
    width: 0;
  }

  20% {
    width: 3ch;
  }

  35% {
    width: 3ch;
  }

  55% {
    width: 6ch;
  }

  70% {
    width: 6ch;
  }

  85% {
    width: 9ch;
  }

  95% {
    width: 9ch;
  }

  100% {
    width: 0;
  }
}

@keyframes cursor {
  50% {
    border-color: transparent;
  }
}

.my-describe {
  background-color: var(--color-yellow-400);
  border-color: var(--color-blue-500);
}

.my-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chars-limit {
  color: var(--color-neutral-1500);
}

.click-to-start {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.click-icon {
  width: 40px;
  height: 40px;
}

.input-submit-section {
  flex: 1 0 0;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-area {
  flex: 1 0 0;
  min-height: 0;
}

.input-submit-button {
  align-self: flex-end;
}
</style>

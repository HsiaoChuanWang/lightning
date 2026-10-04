<script setup lang="ts">
import EntryBanner from '@/components/common/EntryBanner.vue'
import LoadingModal from '@/components/common/LoadingModal.vue'
import ButtonComponent from '@/components/ui-components/ButtonComponent.vue'
import InputComponent from '@/components/ui-components/InputComponent.vue'
import { usePageGuard } from '@/composables/usePageGuard'
import { currentVersion } from '@/config/app'
import { ref } from 'vue'
import { useEntryAnimation } from './composables/useEntryAnimation'
import { useOpponentMatching } from './composables/useOpponentMatching'

usePageGuard({
  unloadPrompt: false,
  blockKeyboardReload: false,
})

const userName = ref('')
const {
  handleBannerFinished,
  showClouds,
  showEntryBanner,
  showFromBottom,
  showInputArea,
  showStars,
  showTitle,
  triggerEntryAnimation,
} = useEntryAnimation()
const { startMatching } = useOpponentMatching({ triggerEntryAnimation })

function handleStart() {
  return startMatching(userName.value)
}
</script>

<template>
  <div class="login-view">
    <transition name="about-drop">
      <img
        v-if="showClouds"
        src="@/assets/images/login/aboutButton.png"
        class="about"
        alt="About"
      />
    </transition>

    <transition name="cloud-left">
      <img
        v-if="showClouds"
        src="@/assets/images/login/cloudLeftFront.png"
        class="cloud-front cloud-left-front"
        alt=""
      />
    </transition>

    <transition name="cloud-left">
      <img
        v-if="showClouds"
        src="@/assets/images/login/cloudLeftBack.png"
        class="cloud-back cloud-left-back"
        alt=""
      />
    </transition>

    <transition name="cloud-right">
      <img
        v-if="showClouds"
        src="@/assets/images/login/cloudRightBack.png"
        class="cloud-back cloud-right-back"
        alt=""
      />
    </transition>

    <transition name="cloud-right">
      <img
        v-if="showClouds"
        src="@/assets/images/login/cloudRightFront.png"
        class="cloud-front cloud-right-front"
        alt=""
      />
    </transition>

    <transition name="star-grow">
      <img
        v-if="showStars"
        src="@/assets/images/login/starLeft.png"
        class="star star-left"
        alt=""
      />
    </transition>

    <transition name="star-grow">
      <img
        v-if="showStars"
        src="@/assets/images/login/starRight.png"
        class="star star-right"
        alt=""
      />
    </transition>

    <p class="version quantico-regular-18">{{ currentVersion }}</p>

    <div class="title-input">
      <transition name="title-grow">
        <img
          v-if="showTitle"
          src="@/assets/images/login/title.png"
          class="title"
          alt="Lightning Championship"
        />
      </transition>

      <div class="input-button" :class="{ 'input-visible': showInputArea }">
        <InputComponent v-model="userName" :isDisabled="false" width="400px" padding="10px 20px" />

        <ButtonComponent
          color-theme="mustard"
          class="quantico-regular-22"
          :disabled="false"
          @click="handleStart"
        >
          START
        </ButtonComponent>
      </div>
    </div>

    <transition name="animation-rise">
      <img
        v-if="showFromBottom"
        src="@/assets/images/login/startFrom.png"
        class="start-from"
        alt=""
      />
    </transition>

    <transition name="animation-rise">
      <img
        v-if="showFromBottom"
        src="@/assets/images/login/labelOne.png"
        class="label label-one"
        alt=""
      />
    </transition>

    <transition name="animation-rise">
      <img
        v-if="showFromBottom"
        src="@/assets/images/login/labelTwo.png"
        class="label label-two"
        alt=""
      />
    </transition>

    <transition name="animation-rise">
      <img
        v-if="showFromBottom"
        src="@/assets/images/login/labelThree.png"
        class="label label-three"
        alt=""
      />
    </transition>

    <LoadingModal />
    <EntryBanner v-if="showEntryBanner" @finished="handleBannerFinished" />
  </div>
</template>

<style scoped lang="scss">
.login-view {
  position: relative;
  width: 100%;
  height: 100%;

  background-image: url('@/assets/images/login/loginBackground.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.about {
  position: absolute;
  width: 156px;
  top: 0;
  right: 108px;
  cursor: pointer;
  z-index: 2;
}

.about-drop-enter-from {
  transform: translateY(-40px) scale(0.85);
}

.about-drop-enter-to {
  transform: translateY(0) scale(1);
}

.about-drop-enter-active {
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.star {
  position: absolute;
  z-index: 3;
}

.star-left {
  width: 96px;
  top: 385px;
  left: 40px;
}

.star-right {
  width: 74px;
  top: 160px;
  right: 88px;
}

.star-grow-enter-from {
  transform: scale(0);
}

.star-grow-enter-to {
  transform: scale(1);
}

.star-grow-enter-active {
  transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.start-from {
  position: absolute;
  z-index: 4;
  width: 200px;
  bottom: 88px;
  left: 64px;
}

.animation-rise-enter-from {
  transform: translateY(80px) scale(0.9);
}

.animation-rise-enter-to {
  transform: translateY(0) scale(1);
}

.animation-rise-enter-active {
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.cloud-front {
  position: absolute;
  z-index: 2;
}

.cloud-back {
  position: absolute;
  z-index: 1;
}

.cloud-left-front {
  width: 400px;
  bottom: -100px;
  left: -230px;
}

.cloud-left-back {
  width: 400px;
  bottom: -100px;
  left: 0px;
}

.cloud-left-enter-from {
  transform: translate(-40px, 30px) scale(0.85);
}

.cloud-left-enter-to {
  transform: translate(0, 0) scale(1);
}

.cloud-left-enter-active {
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.cloud-right-back {
  width: 400px;
  bottom: -100px;
  right: 0px;
}

.cloud-right-front {
  width: 400px;
  bottom: -100px;
  right: -230px;
}

.cloud-right-enter-from {
  transform: translate(40px, 30px) scale(0.85);
}

.cloud-right-enter-to {
  transform: translate(0, 0) scale(1);
}

.cloud-right-enter-active {
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.label {
  position: absolute;
  z-index: 3;
}

.label-one {
  width: 136px;
  bottom: 176px;
  right: 44px;
}

.label-two {
  width: 92px;
  bottom: 129px;
  right: 76px;
}

.label-three {
  width: 65px;
  bottom: 84px;
  right: 45px;
}

.version {
  position: absolute;
  z-index: 3;

  color: var(--color-neutral-50);
  text-align: center;
  width: 100%;
  bottom: 22px;
}

.title-input {
  position: absolute;
  z-index: 5;

  width: 100%;
  height: 100%;

  margin-top: -50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 56px;
}

.title {
  height: 220px;
}

.title-grow-enter-from {
  transform: scale(0);
}

.title-grow-enter-to {
  transform: scale(1);
}

.title-grow-enter-active {
  transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.input-button {
  display: flex;
  gap: 6px;

  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 1.2s ease-out,
    transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1.2);
}

.input-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>

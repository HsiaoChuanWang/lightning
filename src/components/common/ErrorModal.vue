<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'
import ModalComponent from '@/components/ui-components/ModalComponent.vue'

const globalStore = useGlobalStore()
</script>

<template>
  <ModalComponent
    :show="Boolean(globalStore.errorMessage)"
    :button-list="[
      { text: 'OK', colorTheme: 'neutral', width: '120px', onClick: globalStore.clearError },
    ]"
  >
    <div class="content-wrapper">
      <p class="bungee-regular-40">Something went wrong</p>
      <p class="exo2-regular-24 description">{{ globalStore.errorMessage }}</p>
    </div>
  </ModalComponent>
</template>

<style scoped>
.content-wrapper {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.description {
  min-height: 80px;
  white-space: normal;
  overflow-wrap: break-word;
}
</style>

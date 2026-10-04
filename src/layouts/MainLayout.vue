<script setup lang="ts">
import { useMatchFlowSync } from '@/composables/useMatchFlowSync'

useMatchFlowSync()
</script>

<template>
  <div class="main-layout">
    <router-view />
  </div>
</template>

<style scoped>
.main-layout {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
}
</style>

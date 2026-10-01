<script setup lang="ts">
import BackToLoginModal from '@/components/common/BackToLoginModal.vue'
import { abandonInProgressMatch } from '@/services/matchService'
import { useGlobalStore } from '@/stores/global'
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'
import { safeReplace } from '@/composables/usePageGuard'

const globalStore = useGlobalStore()
const userStore = useUserStore()

function keepPlaying() {
  globalStore.setIsBackToLoginModalOpen(false)
}

async function abandonAndExit() {
  await abandonInProgressMatch(userStore.userInfo.userId)

  globalStore.setIsBackToLoginModalOpen(false)
  userStore.clearUser()
  safeReplace('/')
}

onMounted(() => {
  if (!userStore.userInfo.userId) {
    safeReplace(`/`)
  }
})
</script>

<template>
  <RouterView />
  <BackToLoginModal @keepPlaying="keepPlaying" @quit="abandonAndExit" />
</template>

import { defineStore } from 'pinia'
import { ref } from 'vue'

// type LoadingStatus = 'loading' | 'loaded'

// export interface Global {
//   isLoadingModalOpen: LoadingStatus
//   isPlayAgainModalOpen: LoadingStatus
// }

export const useGlobalStore = defineStore('global', () => {
  const isLoadingModalOpen = ref<boolean>(false)
  const isPlayAgainModalOpen = ref<boolean>(false)
  const isBackToLoginModalOpen = ref<boolean>(false)
  const errorMessage = ref('')

  function setIsLoadingModalOpen(status: boolean) {
    isLoadingModalOpen.value = status
  }

  function setIsPlayAgainModalOpen(status: boolean) {
    isPlayAgainModalOpen.value = status
  }

  function setIsBackToLoginModalOpen(status: boolean) {
    isBackToLoginModalOpen.value = status
  }

  function showError(message: string) {
    errorMessage.value = message
  }

  function clearError() {
    errorMessage.value = ''
  }

  return {
    isLoadingModalOpen,
    isPlayAgainModalOpen,
    isBackToLoginModalOpen,
    errorMessage,
    setIsLoadingModalOpen,
    setIsPlayAgainModalOpen,
    setIsBackToLoginModalOpen,
    showError,
    clearError,
  }
})

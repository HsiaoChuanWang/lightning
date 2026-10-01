import { defineStore } from 'pinia'
import { ref } from 'vue'

export type RevengeStatus = 'pending' | 'matched' | 'rejected' | 'canceled'

export interface RevengeInfo {
  revengeId: string
  fromUserId: string
  toUserId: string
  matchId: string
  status: RevengeStatus
  createdAt: string
}

export const useRevengeStore = defineStore('revenge', () => {
  const revengeInfo = ref<RevengeInfo>({
    revengeId: '',
    fromUserId: '',
    toUserId: '',
    matchId: '',
    status: 'pending',
    createdAt: '',
  })

  function setRevengeInfo(data: RevengeInfo) {
    revengeInfo.value = data
  }

  function updateRevengeStatus(status: RevengeStatus) {
    revengeInfo.value.status = status
  }

  function clearRevengeInfo() {
    revengeInfo.value = {
      revengeId: '',
      fromUserId: '',
      toUserId: '',
      matchId: '',
      status: 'pending',
      createdAt: '',
    }
  }

  return {
    revengeInfo,
    setRevengeInfo,
    updateRevengeStatus,
    clearRevengeInfo,
  }
})

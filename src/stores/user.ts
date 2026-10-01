import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  userId: string
  userName: string
  avatarUrl: string
  winCount: number
  lossCount: number
  totalMatches: number
}

export interface OpponentInfo {
  opponentId: string
  opponentName: string
  opponentAvatarUrl: string
  winCount: number
  lossCount: number
  totalMatches: number
}

export const useUserStore = defineStore('user', () => {
  const myCurrentId = ref<string>('')

  const userInfo = ref<UserInfo>({
    userId: '',
    userName: '',
    avatarUrl: '',
    winCount: 0,
    lossCount: 0,
    totalMatches: 0,
  })

  const opponentInfo = ref<OpponentInfo>({
    opponentId: '',
    opponentName: '',
    opponentAvatarUrl: '',
    winCount: 0,
    lossCount: 0,
    totalMatches: 0,
  })

  function setMyCurrentId(id: string) {
    myCurrentId.value = id
  }

  function setUserInfo(data: UserInfo) {
    userInfo.value = { ...data }
  }

  function clearUser() {
    userInfo.value = {
      userId: '',
      userName: '',
      avatarUrl: '',
      winCount: 0,
      lossCount: 0,
      totalMatches: 0,
    }
  }

  function setOpponentInfo(data: OpponentInfo) {
    opponentInfo.value = { ...data }
  }

  function clearOpponent() {
    opponentInfo.value = {
      opponentId: '',
      opponentName: '',
      opponentAvatarUrl: '',
      winCount: 0,
      lossCount: 0,
      totalMatches: 0,
    }
  }

  return {
    myCurrentId,
    userInfo,
    opponentInfo,
    setMyCurrentId,
    setUserInfo,
    clearUser,
    setOpponentInfo,
    clearOpponent,
  }
})

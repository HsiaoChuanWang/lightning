import { defineStore } from 'pinia'
import { ref } from 'vue'

export type OpponentType = 'human' | 'phantom' | 'ai'
export type MatchStatus = 'none' | 'matched' | 'in_progress' | 'completed' | 'abandoned'

export interface Match {
  matchId: string
  playerOneId: string
  playerTwoId: string
  opponentType: OpponentType | ''
  quizSetId: number
  status: MatchStatus
  isComplete: boolean
}

export const useMatchStore = defineStore('match', () => {
  const isMatchCanceled = ref(false)

  const isWin = ref(false)

  const matchData = ref<Match>({
    matchId: '',
    playerOneId: '',
    playerTwoId: '',
    opponentType: '',
    quizSetId: 0,
    status: 'none',
    isComplete: false,
  })

  function setIsMatchCanceled(isCanceled: boolean) {
    isMatchCanceled.value = isCanceled
  }

  function setIsWin(payload: boolean) {
    isWin.value = payload
  }

  function setMatchData(data: Match) {
    matchData.value = data
  }

  function updateMatchData(payload: Partial<Match>) {
    matchData.value = {
      ...matchData.value,
      ...payload,
    }
  }

  function clearMatchData() {
    matchData.value = {
      matchId: '',
      playerOneId: '',
      playerTwoId: '',
      opponentType: '',
      quizSetId: 0,
      status: 'none',
      isComplete: false,
    }
  }

  function updateMatchStatus(newStatus: MatchStatus) {
    matchData.value.status = newStatus
  }

  return {
    isMatchCanceled,
    isWin,
    matchData,
    setIsMatchCanceled,
    setIsWin,
    setMatchData,
    updateMatchData,
    clearMatchData,
    updateMatchStatus,
  }
})

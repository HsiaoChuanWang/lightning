import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Round {
  roundId: string
  round: number
  input: string
  score: number
  bonus: number
  timeTakenMs: number
  submittedAt: string | null
  createdAt: string
}

export const useRoundStore = defineStore('round', () => {
  const myRoundList = ref<Round[]>([])
  const opponentRoundList = ref<Round[]>([])
  const phantomRoundList = ref<Round[]>([])
  const aiResponseList = ref<string[]>([])

  function updateRoundList(data: Round) {
    myRoundList.value.push(data)
  }

  function updateMyCurrentRoundData(payload: Partial<Round>) {
    const index = myRoundList.value.findIndex((data) => data.round === myRoundList.value.length)
    if (index !== -1) {
      myRoundList.value[index] = {
        ...myRoundList.value[index],
        ...payload,
      }
    }
  }

  function resetMyRoundList() {
    myRoundList.value = []
  }

  function updateOpponentRoundList(data: Round) {
    opponentRoundList.value.push(data)
  }

  function updateOpponentCurrentRoundData(payload: Partial<Round>) {
    const index = opponentRoundList.value.findIndex((data) => data.round === payload.round)

    if (index !== -1) {
      opponentRoundList.value[index] = {
        ...opponentRoundList.value[index],
        ...payload,
      }
    }
  }

  function resetOpponentRoundList() {
    opponentRoundList.value = []
  }

  function setPhantomRoundList(dataList: Round[]) {
    phantomRoundList.value = dataList
  }

  function setAiResponseList(dataList: string[]) {
    aiResponseList.value = dataList
  }

  return {
    myRoundList,
    opponentRoundList,
    phantomRoundList,
    aiResponseList,
    updateRoundList,
    updateMyCurrentRoundData,
    resetRoundList: resetMyRoundList,
    updateOpponentRoundList,
    updateOpponentCurrentRoundData,
    resetOpponentRoundList,
    setPhantomRoundList,
    setAiResponseList,
  }
})

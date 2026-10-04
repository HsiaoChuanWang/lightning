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

type RoundPatch = Partial<Omit<Round, 'round'>>

export const useRoundStore = defineStore('round', () => {
  const myRoundList = ref<Round[]>([])
  const opponentRoundList = ref<Round[]>([])
  const phantomRoundList = ref<Round[]>([])
  const aiResponseList = ref<string[]>([])

  /** 依 round number 新增或取代完整回合資料。 */
  function setRoundData(roundList: Round[], data: Round) {
    const index = roundList.findIndex((roundData) => roundData.round === data.round)

    if (index === -1) {
      roundList.push(data)
      roundList.sort((a, b) => a.round - b.round)
      return
    }

    roundList[index] = data
  }

  function setMyRoundData(data: Round) {
    setRoundData(myRoundList.value, data)
  }

  /** 依明確的 round number 更新自己的部分回合資料。 */
  function updateMyRoundData(round: number, payload: RoundPatch) {
    const index = myRoundList.value.findIndex((data) => data.round === round)
    if (index === -1) throw new Error(`[updateMyRoundData] 找不到第 ${round} 回合`)

    myRoundList.value[index] = {
      ...myRoundList.value[index],
      ...payload,
    }
  }

  function resetMyRoundList() {
    myRoundList.value = []
  }

  function setOpponentRoundData(data: Round) {
    setRoundData(opponentRoundList.value, data)
  }

  /** 依明確的 round number 更新對手的部分回合資料。 */
  function updateOpponentRoundData(round: number, payload: RoundPatch) {
    const index = opponentRoundList.value.findIndex((data) => data.round === round)

    if (index === -1) throw new Error(`[updateOpponentRoundData] 找不到第 ${round} 回合`)

    opponentRoundList.value[index] = {
      ...opponentRoundList.value[index],
      ...payload,
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
    setMyRoundData,
    updateMyRoundData,
    resetRoundList: resetMyRoundList,
    setOpponentRoundData,
    updateOpponentRoundData,
    resetOpponentRoundList,
    setPhantomRoundList,
    setAiResponseList,
  }
})

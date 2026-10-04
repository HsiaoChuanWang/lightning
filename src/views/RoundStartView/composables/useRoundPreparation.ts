import { ROUND_READY_POLL_INTERVAL_MS, ROUND_READY_TIMEOUT_MS } from '@/config/timing'
import { useDisposableTimers } from '@/composables/useDisposableTimers'
import { findRound } from '@/services/roundService'
import { useMatchStore } from '@/stores/match'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { endGameWithError } from '@/utils/gameFailure'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref, watch } from 'vue'

interface UseRoundPreparationOptions {
  currentRound: number
  matchId: string | string[]
  nextRound: number
}

/** 管理回合建立、預覽階段，以及依對手類型等待回合資料準備完成的流程。 */
export function useRoundPreparation({
  currentRound,
  matchId,
  nextRound,
}: UseRoundPreparationOptions) {
  const matchStore = useMatchStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()
  const { delay, isActive } = useDisposableTimers()
  const { myRoundList, opponentRoundList, phantomRoundList } = storeToRefs(roundStore)
  const { userInfo, opponentInfo } = storeToRefs(userStore)
  const currentStage = ref<'round' | 'question'>('round')

  /** 真人 Round 由後端狀態機建立；這裡只補齊目前畫面需要的對手資料。 */
  async function waitForHumanRounds() {
    const hasMyRound = myRoundList.value.some((roundData) => roundData.round === nextRound)
    const hasOpponentRound = opponentRoundList.value.some(
      (roundData) => roundData.round === nextRound,
    )
    if (hasMyRound && hasOpponentRound) return true

    const start = Date.now()

    while (isActive() && Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)
      if (!isActive()) return false
      const opponentRound = await findRound(matchId, opponentInfo.value.opponentId, nextRound)
      if (!isActive()) return false

      if (myRound && opponentRound) {
        if (!hasOpponentRound) roundStore.setOpponentRoundData(opponentRound)
        return true
      }

      if (!(await delay(ROUND_READY_POLL_INTERVAL_MS))) return false
    }

    return false
  }

  /** Phantom 對戰時，等待自己的回合建立，再以歷史回合建立對手的初始回合資料。 */
  async function waitForPhantomRound() {
    const start = Date.now()

    while (isActive() && Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)
      if (!isActive()) return false

      if (myRound) {
        const phantomData = phantomRoundList.value[currentRound]
        roundStore.setOpponentRoundData({
          roundId: phantomData.roundId,
          round: phantomData.round,
          input: phantomData.input,
          score: 0,
          bonus: 0,
          timeTakenMs: phantomData.timeTakenMs,
          submittedAt: null,
          createdAt: phantomData.createdAt,
        })
        return true
      }

      if (!(await delay(ROUND_READY_POLL_INTERVAL_MS))) return false
    }

    return false
  }

  /** AI 對戰時，等待自己的回合建立，再建立一筆尚未作答的 AI 初始回合。 */
  async function waitForAiRound() {
    const start = Date.now()

    while (isActive() && Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)
      if (!isActive()) return false

      if (myRound) {
        roundStore.setOpponentRoundData({
          roundId: uuidv4(),
          round: nextRound,
          input: '',
          score: 0,
          bonus: 0,
          timeTakenMs: 0,
          submittedAt: null,
          createdAt: new Date().toISOString(),
        })
        return true
      }

      if (!(await delay(ROUND_READY_POLL_INTERVAL_MS))) return false
    }

    return false
  }

  async function waitForRounds() {
    switch (matchStore.matchData.opponentType) {
      case 'human':
        return waitForHumanRounds()
      case 'phantom':
        return waitForPhantomRound()
      case 'ai':
        return waitForAiRound()
    }
  }

  /** 準備目前頁面的對手資料；顯示階段與下一頁完全由後端 phase 決定。 */
  async function prepareRound() {
    if (!userInfo.value.userId) {
      await endGameWithError({
        context: 'prepareRound',
        error: new Error('找不到目前使用者資料'),
        message: 'Unable to prepare the next round. Returning to the login screen.',
      })
      return
    }

    try {
      const isReady = await waitForRounds()
      if (!isReady && isActive()) throw new Error('等待回合資料逾時')
    } catch (error) {
      if (!isActive()) return
      await endGameWithError({
        context: 'prepareRound',
        error,
        message: 'Unable to prepare the next round. Returning to the login screen.',
      })
    }
  }

  watch(
    () => matchStore.matchData.phase,
    (phase) => {
      currentStage.value = phase === 'question_preview' ? 'question' : 'round'
    },
    { immediate: true },
  )

  onMounted(prepareRound)

  return { currentStage }
}

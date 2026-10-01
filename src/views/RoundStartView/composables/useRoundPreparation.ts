import {
  QUESTION_PREVIEW_DURATION_MS,
  ROUND_READY_POLL_INTERVAL_MS,
  ROUND_READY_TIMEOUT_MS,
  ROUND_TITLE_DURATION_MS,
} from '@/config/timing'
import { abandonMatch } from '@/services/matchService'
import { createRound, findRound } from '@/services/roundService'
import { useMatchStore } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { sleep } from '@/utils/helpers'
import { safePush, safeReplace } from '@/composables/usePageGuard'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { onMounted, ref } from 'vue'

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
  const quizStore = useQuizStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()
  const { phantomRoundList } = storeToRefs(roundStore)
  const { userInfo, opponentInfo } = storeToRefs(userStore)
  const currentStage = ref<'round' | 'question'>('round')

  async function createNewRound() {
    try {
      const newRound = await createRound({
        matchId,
        userId: userStore.userInfo.userId,
        quizSetId: matchStore.matchData.quizSetId,
        quizId: quizStore.quizList[currentRound]?.quizId,
        round: nextRound,
      })
      roundStore.updateRoundList(newRound)
    } catch (error) {
      safeReplace(`/`)
      // console.error('[createNewRound] failed:', error)
      throw error
    }
  }

  /** 真人對戰時，待兩邊都建立後，把對手回合加入 Round Store。 */
  async function waitForHumanRounds() {
    const start = Date.now()

    while (Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)
      const opponentRound = await findRound(matchId, opponentInfo.value.opponentId, nextRound)

      if (myRound && opponentRound) {
        roundStore.updateOpponentRoundList(opponentRound)
        return true
      }

      await sleep(ROUND_READY_POLL_INTERVAL_MS)
    }

    return false
  }

  /** Phantom 對戰時，等待自己的回合建立，再以歷史回合建立對手的初始回合資料。 */
  async function waitForPhantomRound() {
    const start = Date.now()

    while (Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)

      if (myRound) {
        const phantomData = phantomRoundList.value[currentRound]
        roundStore.updateOpponentRoundList({
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

      await sleep(ROUND_READY_POLL_INTERVAL_MS)
    }

    return false
  }

  /** AI 對戰時，等待自己的回合建立，再建立一筆尚未作答的 AI 初始回合。 */
  async function waitForAiRound() {
    const start = Date.now()

    while (Date.now() - start < ROUND_READY_TIMEOUT_MS) {
      const myRound = await findRound(matchId, userInfo.value.userId, nextRound)

      if (myRound) {
        roundStore.updateOpponentRoundList({
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

      await sleep(ROUND_READY_POLL_INTERVAL_MS)
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

  /** 建立回合並依序顯示 Round 與 Question 預覽；雙方就緒後進入作答頁。 */
  async function prepareRound() {
    if (!userInfo.value.userId) {
      safeReplace(`/`)
      return
    }

    try {
      await createNewRound()
      await sleep(ROUND_TITLE_DURATION_MS)
      currentStage.value = 'question'
      await sleep(QUESTION_PREVIEW_DURATION_MS)

      const bothReady = await waitForRounds()

      if (bothReady) {
        safePush({ path: `/game/${matchId}`, state: { allowLeave: true } })
        return
      }

      const isPlayerOne = matchStore.matchData.playerOneId === userStore.userInfo.userId
      await abandonMatch(String(matchId), isPlayerOne)
      safeReplace(`/`)
    } catch (error) {
      // console.error('[prepareRound] failed:', error)
      safeReplace(`/`)
    }
  }

  onMounted(prepareRound)

  return { currentStage }
}

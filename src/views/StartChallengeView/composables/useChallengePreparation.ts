import { usePageGuard } from '@/composables/usePageGuard'
import { toOpponentInfo, toUserInfo } from '@/mappers/userMapper'
import { updateMatchStatus } from '@/services/matchService'
import { findQuizzesBySetId } from '@/services/quizService'
import { fetchImageDescriptions } from '@/services/scoringService'
import { findUsersByIds } from '@/services/userService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRevengeStore } from '@/stores/revenge'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { preloadImages } from '@/utils/preloadImages'
import { reportError } from '@/utils/errors'
import { endGameWithError } from '@/utils/gameFailure'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { onBeforeMount, ref } from 'vue'

interface UseChallengePreparationOptions {
  matchId: string | string[]
  prompt: string
}

export function useChallengePreparation({ matchId, prompt }: UseChallengePreparationOptions) {
  const globalStore = useGlobalStore()
  const userStore = useUserStore()
  const matchStore = useMatchStore()
  const quizStore = useQuizStore()
  const roundStore = useRoundStore()
  const revengeStore = useRevengeStore()
  const { userInfo, opponentInfo, myCurrentId } = storeToRefs(userStore)
  const imageUrlList = ref<string[]>([])

  usePageGuard({
    onReloadAttempt: () => {
      globalStore.setIsBackToLoginModalOpen(true)
    },
  })

  async function markMatchInProgress() {
    const previousStatus = matchStore.matchData.status
    matchStore.updateMatchStatus('in_progress')

    try {
      await updateMatchStatus(matchId, 'in_progress')
    } catch (error) {
      matchStore.updateMatchStatus(previousStatus)
      throw reportError('markMatchInProgress', error)
    }
  }

  async function loadUsersData() {
    try {
      const { playerOneId, playerTwoId, opponentType } = matchStore.matchData
      const users = await findUsersByIds([playerOneId, playerTwoId])
      const me = users.find((info) => info.user_id === myCurrentId.value)
      const opponent = users.find((info) => info.user_id !== myCurrentId.value)

      if (!me) throw new Error('找不到目前使用者資料')
      if (opponentType !== 'ai' && !opponent) throw new Error('找不到對手資料')

      if (me) userStore.setUserInfo(toUserInfo(me))
      if (opponent && opponentType !== 'ai') userStore.setOpponentInfo(toOpponentInfo(opponent))

      if (opponentType === 'ai') {
        userStore.setOpponentInfo({
          opponentId: uuidv4(),
          opponentName: 'AI opponent',
          opponentAvatarUrl: '',
          winCount: 0,
          lossCount: 0,
          totalMatches: 0,
        })
      }
    } catch (error) {
      throw reportError('loadUsersData', error)
    }
  }

  async function loadAiResponses() {
    try {
      const answers = await fetchImageDescriptions(prompt, imageUrlList.value)
      if (answers) roundStore.setAiResponseList(answers)
    } catch (error) {
      reportError('loadAiResponses', error)
      roundStore.setAiResponseList(quizStore.quizList.map((quiz) => quiz.preparedAiAnswer || ''))
    }
  }

  async function loadQuizData() {
    const quizzes = await findQuizzesBySetId(matchStore.matchData.quizSetId)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const quizImageUrls = quizzes.map((quiz) => supabaseUrl + quiz.imageUrl)

    if (matchStore.matchData.opponentType === 'ai') {
      imageUrlList.value = quizImageUrls
    }

    quizStore.setQuizList(quizzes)

      // 題庫資料只包含圖片網址；在進入 RoundStart 前先完成實際圖片下載。
      const preloadPromise = preloadImages(quizImageUrls)

    if (matchStore.matchData.opponentType === 'ai') {
        // 瀏覽器預載圖片與後端產生 AI 描述可同時進行，避免增加等待時間。
        await Promise.all([preloadPromise, loadAiResponses()])
    } else {
      await preloadPromise
    }
  }

  onBeforeMount(async () => {
    try {
      await markMatchInProgress()
      await loadUsersData()
      await loadQuizData()
      roundStore.resetRoundList()
      roundStore.resetOpponentRoundList()
      revengeStore.clearRevengeInfo()
    } catch (error) {
      await endGameWithError({
        context: 'useChallengePreparation',
        error,
        message: 'Unable to prepare this match. Returning to the login screen.',
      })
    }
  })

  return { userInfo, opponentInfo }
}

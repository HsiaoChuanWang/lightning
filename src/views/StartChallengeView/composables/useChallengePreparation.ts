import { safePush, usePageGuard } from '@/composables/usePageGuard'
import { START_CHALLENGE_DURATION_MS } from '@/config/timing'
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
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue'

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
  const { matchData } = storeToRefs(matchStore)
  const imageUrlList = ref<string[]>([])
  let navigationTimer: ReturnType<typeof setTimeout> | null = null
  let hasScheduledNavigation = false

  usePageGuard({
    onReloadAttempt: () => {
      globalStore.setIsBackToLoginModalOpen(true)
    },
  })

  const navigationReady = computed(() => {
    const isAiOpponent = matchStore.matchData.opponentType === 'ai'
    return Boolean(
      userInfo.value.userId &&
        matchData.value.matchId &&
        matchData.value.quizSetId &&
        roundStore.myRoundList.length === 0 &&
        (!isAiOpponent || roundStore.aiResponseList.length > 0),
    )
  })

  async function markMatchInProgress() {
    matchStore.updateMatchStatus('in_progress')

    try {
      await updateMatchStatus(matchId, 'in_progress')
    } catch (error) {
      // console.error('[markMatchInProgress] failed:', error)
    }
  }

  async function loadUsersData() {
    try {
      const { playerOneId, playerTwoId, opponentType } = matchStore.matchData
      const users = await findUsersByIds([playerOneId, playerTwoId])
      const me = users.find((info) => info.user_id === myCurrentId.value)
      const opponent = users.find((info) => info.user_id !== myCurrentId.value)

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
      // console.error('[loadUsersData] failed:', error)
    }
  }

  async function loadAiResponses() {
    try {
      const answers = await fetchImageDescriptions(prompt, imageUrlList.value)
      if (answers) roundStore.setAiResponseList(answers)
    } catch (error) {
      // console.error('[loadAiResponses] failed:', error)
      roundStore.setAiResponseList(quizStore.quizList.map((quiz) => quiz.preparedAiAnswer || ''))
    }
  }

  async function loadQuizData() {
    try {
      const quizzes = await findQuizzesBySetId(matchStore.matchData.quizSetId)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      if (matchStore.matchData.opponentType === 'ai') {
        imageUrlList.value = quizzes.map((quiz) => supabaseUrl + quiz.imageUrl)
      }

      quizStore.setQuizList(quizzes)

      if (matchStore.matchData.opponentType === 'ai') {
        await loadAiResponses()
      }
    } catch (error) {
      // console.error('[loadQuizData] failed:', error)
      throw error
    }
  }

  watch(
    navigationReady,
    (ready) => {
      if (!ready || hasScheduledNavigation) return

      hasScheduledNavigation = true
      navigationTimer = setTimeout(() => {
        navigationTimer = null
        safePush({ path: `/round-start/${matchId}`, state: { allowLeave: true } })
      }, START_CHALLENGE_DURATION_MS)
    },
    { immediate: true },
  )

  onBeforeMount(async () => {
    try {
      await markMatchInProgress()
      await loadUsersData()
      await loadQuizData()
      roundStore.resetRoundList()
      roundStore.resetOpponentRoundList()
      revengeStore.clearRevengeInfo()
    } catch (error) {
      // console.error('[useChallengePreparation] failed:', error)
    }
  })

  onBeforeUnmount(() => {
    if (navigationTimer) clearTimeout(navigationTimer)
  })

  return { userInfo, opponentInfo }
}

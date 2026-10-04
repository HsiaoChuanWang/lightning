import { safeReplace } from '@/composables/usePageGuard'
import { abandonMatch } from '@/services/matchService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useUserStore } from '@/stores/user'
import { reportError } from '@/utils/errors'
import { clearGameSession } from '@/utils/gameSession'

interface EndGameWithErrorOptions {
  context: string
  error?: unknown
  message: string
  abandonCurrentMatch?: boolean
}

let isEndingGame = false

/** 終止無法繼續的遊戲，必要時放棄比賽，並在回到登入頁後顯示錯誤。 */
export async function endGameWithError({
  context,
  error,
  message,
  abandonCurrentMatch = true,
}: EndGameWithErrorOptions): Promise<void> {
  if (isEndingGame) return
  isEndingGame = true

  const globalStore = useGlobalStore()
  const matchStore = useMatchStore()
  const userStore = useUserStore()
  const { matchId, playerOneId, status } = matchStore.matchData
  const myUserId = userStore.myCurrentId || userStore.userInfo.userId

  if (error !== undefined) reportError(context, error)

  try {
    if (
      abandonCurrentMatch &&
      matchId &&
      myUserId &&
      (status === 'matched' || status === 'in_progress')
    ) {
      await abandonMatch(matchId, playerOneId === myUserId)
    }
  } catch (abandonError) {
    reportError(`${context}:abandonMatch`, abandonError)
  } finally {
    clearGameSession()
    globalStore.showError(message)
    try {
      await safeReplace('/')
    } catch (navigationError) {
      reportError(`${context}:safeReplace`, navigationError)
    } finally {
      isEndingGame = false
    }
  }
}

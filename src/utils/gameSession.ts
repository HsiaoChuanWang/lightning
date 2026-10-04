import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRevengeStore } from '@/stores/revenge'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'

/**
 * 清除已結束遊戲的前端 session，但保留目前玩家身分，讓 LoginView 可以開始下一次配對。
 * 必須在返回首頁前呼叫，否則全域 Match 同步器會依照舊 matchId 再次導回 GameResult。
 */
export function clearGameSession() {
  const globalStore = useGlobalStore()
  const matchStore = useMatchStore()
  const quizStore = useQuizStore()
  const revengeStore = useRevengeStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()

  globalStore.setIsLoadingModalOpen(false)
  globalStore.setIsPlayAgainModalOpen(false)
  globalStore.setIsBackToLoginModalOpen(false)
  matchStore.clearMatchData()
  matchStore.setIsMatchCanceled(false)
  matchStore.setIsWin(false)
  quizStore.clearQuizList()
  roundStore.resetRoundList()
  roundStore.resetOpponentRoundList()
  revengeStore.clearRevengeInfo()
  userStore.clearOpponent()
}

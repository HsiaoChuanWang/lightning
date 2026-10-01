import { REMATCH_RESULT_DELAY_MS } from '@/config/timing'
import { toMatch } from '@/mappers/matchMapper'
import { findMatchedMatch, insertMatch } from '@/services/matchService'
import {
  sendRevengeRequest as persistRevengeRequest,
  updateRevengeStatus as persistRevengeStatus,
} from '@/services/revengeService'
import { safePush, safeReplace } from '@/composables/usePageGuard'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore, type OpponentType } from '@/stores/match'
import { useRevengeStore, type RevengeStatus } from '@/stores/revenge'
import { useUserStore } from '@/stores/user'
import { getRandomQuizSetId } from '@/utils/helpers'
import { storeToRefs } from 'pinia'

export function useRematch(matchId: string | string[]) {
  const globalStore = useGlobalStore()
  const matchStore = useMatchStore()
  const revengeStore = useRevengeStore()
  const userStore = useUserStore()
  const { userInfo, opponentInfo } = storeToRefs(userStore)

  async function enterExistingMatch(userId: string): Promise<boolean> {
    const existingMatch = await findMatchedMatch(userId)

    if (!existingMatch) return false

    matchStore.setMatchData(toMatch(existingMatch))
    safePush(`/start-challenge/${existingMatch.match_id}`)
    globalStore.setIsPlayAgainModalOpen(false)
    return true
  }

  async function createRematch(
    playerOneId: string,
    playerTwoId: string,
    opponentType: OpponentType,
    quizSetId: number,
    revengeId: string,
  ) {
    const hasExistingMatch = await enterExistingMatch(playerOneId)

    if (hasExistingMatch) {
      await persistRevengeStatus(matchId, 'rejected')
      revengeStore.updateRevengeStatus('rejected')
      return
    }

    matchStore.setMatchData({
      matchId: revengeId,
      playerOneId,
      playerTwoId,
      opponentType,
      quizSetId,
      isComplete: false,
      status: 'matched',
    })
    await insertMatch({
      matchId: revengeId,
      playerOneId,
      playerTwoId,
      opponentType,
      quizSetId,
    })
    safePush(`/start-challenge/${revengeId}`)
    globalStore.setIsPlayAgainModalOpen(false)
  }

  async function sendRematchRequest() {
    try {
      const existing = await persistRevengeRequest({
        matchId,
        fromUserId: userInfo.value.userId,
        toUserId: opponentInfo.value.opponentId,
      })

      if (!existing) return

      revengeStore.updateRevengeStatus('matched')
      await createRematch(
        existing.from_user_id,
        existing.to_user_id,
        'human',
        getRandomQuizSetId(),
        existing.revenge_id,
      )
    } catch (error) {
      // console.error('[sendRematchRequest] failed:', error)
    }
  }

  async function handlePlayAgain() {
    globalStore.setIsPlayAgainModalOpen(true)
    await sendRematchRequest()
  }

  async function replyPlayAgainRequest(status: RevengeStatus) {
    try {
      await persistRevengeStatus(matchId, status)
      revengeStore.updateRevengeStatus(status)

      if (status === 'matched') {
        await createRematch(
          revengeStore.revengeInfo.fromUserId,
          revengeStore.revengeInfo.toUserId,
          'human',
          getRandomQuizSetId(),
          revengeStore.revengeInfo.revengeId,
        )
        return
      }

      setTimeout(() => {
        globalStore.setIsPlayAgainModalOpen(false)
        safeReplace('/')
      }, REMATCH_RESULT_DELAY_MS)
    } catch (error) {
      // console.error('[replyPlayAgainRequest] failed:', error)
    }
  }

  return { handlePlayAgain, replyPlayAgainRequest }
}

import { REMATCH_RESPONSE_TIMEOUT_MS, REMATCH_RESULT_DELAY_MS } from '@/config/timing'
import { useDisposableTimers } from '@/composables/useDisposableTimers'
import { toMatch } from '@/mappers/matchMapper'
import { findMatchedMatch, insertMatch } from '@/services/matchService'
import {
  findRevengeRequest,
  sendRevengeRequest as persistRevengeRequest,
  updateRevengeStatus as persistRevengeStatus,
} from '@/services/revengeService'
import { safePush, safeReplace } from '@/composables/usePageGuard'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore, type OpponentType } from '@/stores/match'
import { useRevengeStore, type RevengeStatus } from '@/stores/revenge'
import { useUserStore } from '@/stores/user'
import { getRandomQuizSetId } from '@/utils/helpers'
import { clearGameSession } from '@/utils/gameSession'
import { storeToRefs } from 'pinia'

export function useRematch(matchId: string | string[]) {
  const globalStore = useGlobalStore()
  const matchStore = useMatchStore()
  const revengeStore = useRevengeStore()
  const userStore = useUserStore()
  const { scheduleTimeout } = useDisposableTimers()
  const { userInfo, opponentInfo } = storeToRefs(userStore)

  /** 五秒內沒有收到任何回覆時，通知邀請者對方目前無法接受再戰。 */
  function scheduleRematchResponseTimeout() {
    scheduleTimeout(async () => {
      try {
        const request = await findRevengeRequest(matchId)
        if (!request || request.status !== 'pending') return

        // 先切換本地文案，再取消資料庫邀請；避免自己的 canceled Realtime
        // 把「對方無法接受」覆蓋成一般的「邀請已取消」。
        revengeStore.updateRevengeStatus('unavailable')
        await persistRevengeStatus(matchId, 'canceled')

        scheduleTimeout(() => {
          clearGameSession()
          safeReplace('/')
        }, REMATCH_RESULT_DELAY_MS)
      } catch {
        // 查詢失敗時保留 Pending，避免把暫時性的網路錯誤誤判為對方正在遊戲中。
      }
    }, REMATCH_RESPONSE_TIMEOUT_MS)
  }

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
      revengeStore.updateRevengeStatus('matched')
      globalStore.setIsPlayAgainModalOpen(false)
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
      currentRound: 1,
      phase: 'entry_banner',
      phaseStartedAt: '',
      phaseDeadlineAt: '',
      flowCompletedAt: null,
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

      if (!existing) {
        scheduleRematchResponseTimeout()
        return
      }

      // 雙方同時發出邀請時，只由碰到既有 pending 邀請的一方建立新 Match。
      // Match 寫入成功後才發布 matched，確保另一方收到 Realtime 時已能讀取新 Match。
      await createRematch(
        existing.from_user_id,
        existing.to_user_id,
        'human',
        getRandomQuizSetId(),
        existing.revenge_id,
      )
      await persistRevengeStatus(matchId, 'matched')
      revengeStore.updateRevengeStatus('matched')
    } catch {
      // console.error('[sendRematchRequest] failed:', error)
    }
  }

  async function handlePlayAgain() {
    // 先寫入本地邀請者資料再開啟 Modal，避免 Realtime 回來前被誤判成受邀者，
    // 造成 PLAY AGAIN? 與 Pending 兩套文案在畫面上短暫切換。
    revengeStore.setRevengeInfo({
      revengeId: '',
      fromUserId: userInfo.value.userId,
      toUserId: opponentInfo.value.opponentId,
      matchId: String(matchId),
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    globalStore.setIsPlayAgainModalOpen(true)
    await sendRematchRequest()
  }

  async function replyPlayAgainRequest(status: RevengeStatus) {
    try {
      if (status === 'matched') {
        // 必須先建立新 Match，最後才更新邀請狀態；另一方收到 matched Realtime 時，
        // 才能立即載入同一筆 Match 並安全進入 StartChallenge。
        await createRematch(
          revengeStore.revengeInfo.fromUserId,
          revengeStore.revengeInfo.toUserId,
          'human',
          getRandomQuizSetId(),
          revengeStore.revengeInfo.revengeId,
        )
        await persistRevengeStatus(matchId, status)
        revengeStore.updateRevengeStatus(status)
        return
      }

      await persistRevengeStatus(matchId, status)
      revengeStore.updateRevengeStatus(status)

      scheduleTimeout(() => {
        clearGameSession()
        safeReplace('/')
      }, REMATCH_RESULT_DELAY_MS)
    } catch {
      // console.error('[replyPlayAgainRequest] failed:', error)
    }
  }

  return { handlePlayAgain, replyPlayAgainRequest }
}

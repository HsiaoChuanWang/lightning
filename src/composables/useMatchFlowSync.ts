import { safeReplace } from '@/composables/usePageGuard'
import { supabase } from '@/lib/supabaseClient'
import { toMatch } from '@/mappers/matchMapper'
import { toOpponentInfo, toUserInfo } from '@/mappers/userMapper'
import { findMatchById } from '@/services/matchService'
import { findQuizzesBySetId } from '@/services/quizService'
import { findRounds } from '@/services/roundService'
import { findUsersByIds } from '@/services/userService'
import { useMatchStore, type MatchPhase } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import type { MatchRecord } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'

const PHASE_ROUTE: Record<MatchPhase, string> = {
  entry_banner: 'login',
  start_challenge: 'start-challenge',
  round_intro: 'round-start',
  question_preview: 'round-start',
  answer_preparing: 'game',
  answering: 'game',
  answer_reveal: 'game',
  round_result: 'round-result',
  game_result: 'game-result',
}

const EXPIRED_PHASE_RETRY_MS = 2_000
const MAX_EXPIRED_PHASE_RETRIES = 3

/**
 * 將 Supabase Match phase 同步到 Pinia 與 Router。
 * Realtime 負責即時通知；deadline 檢查和 visibilitychange 只負責補回遺漏事件，不會呼叫推進 RPC。
 */
export function useMatchFlowSync() {
  const matchStore = useMatchStore()
  const quizStore = useQuizStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()
  const route = useRoute()
  let channel: RealtimeChannel | null = null
  let phaseCheckTimer: ReturnType<typeof setTimeout> | null = null
  let isSynchronizing = false
  let lastPhaseKey = ''
  let expiredPhaseRetryCount = 0

  function cancelPhaseCheck() {
    if (phaseCheckTimer === null) return
    clearTimeout(phaseCheckTimer)
    phaseCheckTimer = null
  }

  /** 停止追蹤上一場 Match，回到 Login 後不再接收它的 Realtime 或 deadline 檢查。 */
  function unsubscribeCurrentMatch() {
    cancelPhaseCheck()
    lastPhaseKey = ''
    expiredPhaseRetryCount = 0

    if (!channel) return
    void supabase.removeChannel(channel)
    channel = null
  }

  function schedulePhaseCheck(record: MatchRecord) {
    cancelPhaseCheck()
    if (record.phase === 'game_result' || record.status === 'abandoned') return

    const deadlineMs = Date.parse(record.phase_deadline_at)
    const remainingMs = Number.isFinite(deadlineMs) ? deadlineMs - Date.now() : 0
    const phaseKey = `${record.phase}:${record.phase_deadline_at}`

    if (phaseKey !== lastPhaseKey) {
      lastPhaseKey = phaseKey
      expiredPhaseRetryCount = 0
    }

    if (remainingMs <= 0) {
      if (expiredPhaseRetryCount >= MAX_EXPIRED_PHASE_RETRIES) return
      expiredPhaseRetryCount += 1
    }

    // 到期後最多低頻重讀三次；若 Cron 異常，不允許形成無限 API 請求。
    const delayMs = remainingMs > 0 ? remainingMs + 250 : EXPIRED_PHASE_RETRY_MS
    phaseCheckTimer = setTimeout(() => {
      phaseCheckTimer = null
      void synchronizeMatch()
    }, delayMs)
  }

  async function hydrateMatch(record: MatchRecord) {
    const myUserId = userStore.myCurrentId || userStore.userInfo.userId
    if (!myUserId) return

    const opponentId =
      record.player_one_id === myUserId ? record.player_two_id : record.player_one_id
    const [quizzes, users, myRounds] = await Promise.all([
      findQuizzesBySetId(record.quiz_set_id),
      findUsersByIds([myUserId, opponentId]),
      findRounds(record.match_id, myUserId),
    ])

    quizStore.setQuizList(quizzes)
    roundStore.resetRoundList()
    for (const round of myRounds) roundStore.updateRoundList(round)

    const me = users.find((user) => user.user_id === myUserId)
    const opponent = users.find((user) => user.user_id === opponentId)
    if (me) userStore.setUserInfo(toUserInfo(me))
    if (opponent) userStore.setOpponentInfo(toOpponentInfo(opponent))

    if (record.opponent_type === 'human') {
      const opponentRounds = await findRounds(record.match_id, opponentId)
      roundStore.resetOpponentRoundList()
      for (const round of opponentRounds) roundStore.updateOpponentRoundList(round)
    }

    if (record.opponent_type === 'ai') {
      userStore.setOpponentInfo({
        opponentId,
        opponentName: 'AI opponent',
        opponentAvatarUrl: '',
        winCount: 0,
        lossCount: 0,
        totalMatches: 0,
      })
      roundStore.setAiResponseList(quizzes.map((quiz) => quiz.preparedAiAnswer || ''))
    }
  }

  function needsHydration(record: MatchRecord) {
    const myUserId = userStore.myCurrentId || userStore.userInfo.userId
    const opponentId =
      record.player_one_id === myUserId ? record.player_two_id : record.player_one_id
    const hasQuizData = quizStore.quizList.length > 0
    const hasMyRound = roundStore.myRoundList.some(
      (roundData) => roundData.round === record.current_round,
    )
    const hasOpponentRound = roundStore.opponentRoundList.some(
      (roundData) => roundData.round === record.current_round,
    )

    if (!myUserId || !userStore.userInfo.userId || !hasQuizData || !hasMyRound) return true
    if (record.opponent_type === 'human' && (!opponentId || !hasOpponentRound)) return true
    return record.phase === 'answer_reveal' || record.phase === 'game_result'
  }

  async function applyMatchRecord(record: MatchRecord) {
    // 離開遊戲或開始另一場 Match 後，忽略舊訂閱及舊請求稍晚才回傳的資料。
    if (matchStore.matchData.matchId !== record.match_id) return

    matchStore.setMatchData(toMatch(record))
    if (record.phase === 'game_result') {
      const myUserId = userStore.myCurrentId || userStore.userInfo.userId
      matchStore.setIsWin(Boolean(myUserId && record.winner_id === myUserId))
    }
    schedulePhaseCheck(record)

    // Entry Banner 仍由 LoginView 顯示與完成導頁，後端只負責記錄它的時間階段。
    if (record.phase === 'entry_banner') return

    if (record.phase !== 'start_challenge' && needsHydration(record)) await hydrateMatch(record)

    const expectedRouteName = PHASE_ROUTE[record.phase]
    if (route.name === expectedRouteName && String(route.params.matchId) === record.match_id) return
    safeReplace(`/${expectedRouteName}/${record.match_id}`)
  }

  async function synchronizeMatch() {
    const matchId = matchStore.matchData.matchId
    if (!matchId || isSynchronizing) return

    isSynchronizing = true
    try {
      const record = await findMatchById(matchId)
      if (record && matchStore.matchData.matchId === matchId) await applyMatchRecord(record)
    } catch (error) {
      console.warn('[useMatchFlowSync] synchronize failed:', error)
    } finally {
      isSynchronizing = false
    }
  }

  function subscribe(matchId: string) {
    unsubscribeCurrentMatch()

    channel = supabase
      .channel(`match-flow-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (matchStore.matchData.matchId !== matchId) return
          void applyMatchRecord(payload.new as MatchRecord)
        },
      )
      .subscribe()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') void synchronizeMatch()
  }

  watch(
    () => matchStore.matchData.matchId,
    (matchId) => {
      if (!matchId) {
        unsubscribeCurrentMatch()
        return
      }
      subscribe(matchId)
      void synchronizeMatch()
    },
    { immediate: true },
  )

  document.addEventListener('visibilitychange', handleVisibilityChange)

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    unsubscribeCurrentMatch()
  })
}

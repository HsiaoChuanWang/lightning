import { MATCH_SEARCH_POLL_INTERVAL_MS, MATCH_SEARCH_TIMEOUT_MS } from '@/config/timing'
import { supabase } from '@/lib/supabaseClient'
import { toMatch } from '@/mappers/matchMapper'
import { abandonInProgressMatch, insertMatch } from '@/services/matchService'
import {
  createAiOpponent,
  enterMatchingPool,
  findPhantomCandidate,
  hasMatchedHuman,
  matchHuman,
  removeFromMatchingPool,
} from '@/services/opponentMatchingService'
import { findRounds } from '@/services/roundService'
import { createUser } from '@/services/userService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore, type OpponentType } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRevengeStore } from '@/stores/revenge'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import type { MatchRecord } from '@/types/database'
import { getRandomQuizSetId, sleep } from '@/utils/helpers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { onBeforeUnmount, ref } from 'vue'

interface UseOpponentMatchingOptions {
  triggerEntryAnimation: (url: string) => void
}

export function useOpponentMatching({ triggerEntryAnimation }: UseOpponentMatchingOptions) {
  const globalStore = useGlobalStore()
  const roundStore = useRoundStore()
  const matchStore = useMatchStore()
  const { isMatchCanceled } = storeToRefs(matchStore)
  const isMatched = ref(false)
  const isProcessing = ref(false)
  let matchSubscription: RealtimeChannel | null = null

  /** 移除目前 matches Realtime 監聽，避免重複接收配對建立事件。 */
  function removeMatchSubscription() {
    if (!matchSubscription) return
    supabase.removeChannel(matchSubscription)
    matchSubscription = null
  }

  // 監聽 matches table
  function subscribeToMatch(userId: string) {
    removeMatchSubscription()

    matchSubscription = supabase
      .channel(`match-channel-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          isMatched.value = true
          const { player_one_id, player_two_id } = payload.new

          if (player_one_id === userId || player_two_id === userId) {
            matchStore.setMatchData(toMatch(payload.new as MatchRecord))
            triggerEntryAnimation(`/start-challenge/${payload.new.match_id}`)
          }
        },
      )
      .subscribe()
  }

  async function initUser(userName: string) {
    const cachedUserStr = localStorage.getItem(`user_info_${userName}`)

    if (cachedUserStr) {
      const cachedUserInfo = JSON.parse(cachedUserStr)
      if (cachedUserInfo.userName === userName) return cachedUserInfo
    }

    const userId = uuidv4()
    await createUser(userId, userName)
    const userInfo = { userId, avatarUrl: '', userName }
    localStorage.setItem(`user_info_${userName}`, JSON.stringify(userInfo))
    return userInfo
  }

  async function abandonExistingMatch(userId: string) {
    await abandonInProgressMatch(userId)
  }

  async function tryFindHumanOpponent(myId: string, timeout = MATCH_SEARCH_TIMEOUT_MS) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      if (isMatchCanceled.value) return
      const match = await matchHuman(myId, getRandomQuizSetId())

      if (match) {
        matchStore.setMatchData(match)
        triggerEntryAnimation(`/start-challenge/${match.matchId}`)
        return true
      }

      await sleep(MATCH_SEARCH_POLL_INTERVAL_MS)
    }

    return false
  }

  async function tryFindPhantomOpponent(myId: string, timeout = MATCH_SEARCH_TIMEOUT_MS) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      if (isMatchCanceled.value) return
      const candidate = await findPhantomCandidate(myId)

      if (candidate) {
        const rounds = await findRounds(candidate.match_id, candidate.player_one_id)
        roundStore.setPhantomRoundList(rounds)
        return candidate
      }

      await sleep(MATCH_SEARCH_POLL_INTERVAL_MS)
    }

    return null
  }

  async function createMatch(
    myId: string,
    playerTwoId: string,
    opponentType: OpponentType,
    quizSetId: number,
  ) {
    const matchId = uuidv4()
    matchStore.setMatchData({
      matchId,
      playerOneId: myId,
      playerTwoId,
      opponentType,
      quizSetId,
      isComplete: false,
      status: 'matched',
    })

    if (await hasMatchedHuman(myId)) {
      await removeFromMatchingPool([myId])
      return
    }

    await insertMatch({ matchId, playerOneId: myId, playerTwoId, opponentType, quizSetId })
    await removeFromMatchingPool([myId, playerTwoId])
  }

  function resetGameState() {
    const userStore = useUserStore()
    userStore.clearUser()
    userStore.clearOpponent()
    matchStore.clearMatchData()
    matchStore.setIsMatchCanceled(false)
    useQuizStore().clearQuizList()
    roundStore.resetRoundList()
    roundStore.resetOpponentRoundList()
    useRevengeStore().clearRevengeInfo()
  }

  async function startMatching(userName: string) {
    if (isProcessing.value) return

    if (!userName) {
      alert('請輸入 User Name')
      return
    }

    isProcessing.value = true
    resetGameState()
    removeMatchSubscription()

    try {
      const userInfo = await initUser(userName)
      useUserStore().setMyCurrentId(userInfo.userId)
      globalStore.setIsLoadingModalOpen(true)
      await abandonExistingMatch(userInfo.userId)
      subscribeToMatch(userInfo.userId)

      try {
        await enterMatchingPool(userInfo.userId)
      } catch {
        return
      }

      const humanOpponent = await tryFindHumanOpponent(userInfo.userId)
      if (humanOpponent || isMatched.value) return

      const phantomOpponent = await tryFindPhantomOpponent(userInfo.userId)
      if (phantomOpponent) {
        await createMatch(
          userInfo.userId,
          phantomOpponent.player_one_id,
          'phantom',
          phantomOpponent.quiz_set_id,
        )
        return
      }

      if (isMatchCanceled.value) return
      const aiOpponent = await createAiOpponent()

      if (aiOpponent) {
        await createMatch(userInfo.userId, aiOpponent, 'ai', getRandomQuizSetId())
      }
    } catch (error) {
      // console.error('[startMatching] failed:', error)
    } finally {
      isProcessing.value = false
    }
  }

  onBeforeUnmount(() => {
    removeMatchSubscription()
    globalStore.setIsLoadingModalOpen(false)
  })

  return { startMatching }
}

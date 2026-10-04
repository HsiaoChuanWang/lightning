import { MATCH_SEARCH_POLL_INTERVAL_MS, MATCH_SEARCH_TIMEOUT_MS } from '@/config/timing'
import { useDisposableTimers } from '@/composables/useDisposableTimers'
import { supabase } from '@/lib/supabaseClient'
import { toMatch } from '@/mappers/matchMapper'
import { toUserInfo } from '@/mappers/userMapper'
import { abandonInProgressMatch, abandonMatch, insertMatch } from '@/services/matchService'
import {
  createAiOpponent,
  enterMatchingPool,
  findPhantomCandidate,
  hasMatchedHuman,
  matchHuman,
  removeFromMatchingPool,
} from '@/services/opponentMatchingService'
import { findRounds } from '@/services/roundService'
import { createUser, findUserById } from '@/services/userService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore, type Match, type OpponentType } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRevengeStore } from '@/stores/revenge'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import type { MatchRecord } from '@/types/database'
import { getRandomQuizSetId } from '@/utils/helpers'
import { reportError } from '@/utils/errors'
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
  const { delay } = useDisposableTimers()
  const { isMatchCanceled } = storeToRefs(matchStore)
  const isProcessing = ref(false)
  const matchingState = ref<'idle' | 'searching' | 'matched' | 'canceled'>('idle')
  let matchSubscriptions: RealtimeChannel[] = []

  function isSearchActive() {
    if (isMatchCanceled.value) {
      matchingState.value = 'canceled'
      return false
    }

    return matchingState.value === 'searching'
  }

  /** 只有第一個配對結果可以更新狀態及啟動進場動畫。 */
  function acceptMatch(match: Match) {
    if (!isSearchActive()) return false

    matchingState.value = 'matched'
    matchStore.setMatchData(match)
    removeMatchSubscriptions()
    triggerEntryAnimation(`/start-challenge/${match.matchId}`)
    return true
  }

  /** 移除目前 matches Realtime 監聽，避免重複接收配對建立事件。 */
  function removeMatchSubscriptions() {
    for (const subscription of matchSubscriptions) {
      void supabase.removeChannel(subscription)
    }
    matchSubscriptions = []
  }

  /** 分別監聽玩家位於 player one / player two 的對戰，避免接收整張表的 INSERT。 */
  function subscribeToMatch(userId: string) {
    removeMatchSubscriptions()

    /** 依指定的玩家欄位訂閱只包含目前使用者的 Match INSERT 事件。 */
    const subscribeForPlayerColumn = (column: 'player_one_id' | 'player_two_id') =>
      supabase
        .channel(`match-channel-${column}-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
            filter: `${column}=eq.${userId}`,
          },
          (payload) => {
            const record = payload.new as MatchRecord

            // 保留 client-side 驗證，避免錯誤或過期事件完成目前的搜尋。
            if (record.player_one_id !== userId && record.player_two_id !== userId) return
            acceptMatch(toMatch(record))
          },
        )
        .subscribe()

    matchSubscriptions = [
      subscribeForPlayerColumn('player_one_id'),
      subscribeForPlayerColumn('player_two_id'),
    ]
  }

  async function initUser(userName: string) {
    const normalizedUserName = userName.trim()
    const storageKey = `user_info_${normalizedUserName}`
    const cachedUserStr = localStorage.getItem(storageKey)

    if (cachedUserStr) {
      let cachedUserInfo: { userId?: unknown; userName?: unknown } | null = null

      try {
        cachedUserInfo = JSON.parse(cachedUserStr) as {
          userId?: unknown
          userName?: unknown
        }
      } catch (error) {
        localStorage.removeItem(storageKey)
        reportError('restoreLocalUser', error)
      }

      if (
        cachedUserInfo &&
        typeof cachedUserInfo.userId === 'string' &&
        cachedUserInfo.userId &&
        cachedUserInfo.userName === normalizedUserName
      ) {
        const existingUser = await findUserById(cachedUserInfo.userId)
        if (existingUser) return existingUser

        // 資料庫被重設時沿用本機 UUID 重建匿名使用者，避免快取指向不存在的資料列。
        await createUser(cachedUserInfo.userId, normalizedUserName)
        const recreatedUser = await findUserById(cachedUserInfo.userId)
        if (!recreatedUser) throw new Error('使用者建立後仍無法讀取')
        return recreatedUser
      }

      localStorage.removeItem(storageKey)
    }

    const userId = uuidv4()
    await createUser(userId, normalizedUserName)
    const createdUser = await findUserById(userId)
    if (!createdUser) throw new Error('使用者建立後仍無法讀取')

    localStorage.setItem(
      storageKey,
      JSON.stringify({ userId: createdUser.user_id, userName: createdUser.user_name }),
    )
    return createdUser
  }

  async function abandonExistingMatch(userId: string) {
    await abandonInProgressMatch(userId)
  }

  async function tryFindHumanOpponent(myId: string, timeout = MATCH_SEARCH_TIMEOUT_MS) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      if (!isSearchActive()) return false
      const match = await matchHuman(myId, getRandomQuizSetId())

      if (match) {
        return acceptMatch(match)
      }

      if (!(await delay(MATCH_SEARCH_POLL_INTERVAL_MS))) return false
    }

    return false
  }

  async function tryFindPhantomOpponent(myId: string, timeout = MATCH_SEARCH_TIMEOUT_MS) {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      if (!isSearchActive()) return null
      const candidate = await findPhantomCandidate(myId)

      if (candidate) {
        const rounds = await findRounds(candidate.match_id, candidate.player_one_id)
        if (!isSearchActive()) return null
        roundStore.setPhantomRoundList(rounds)
        return candidate
      }

      if (!(await delay(MATCH_SEARCH_POLL_INTERVAL_MS))) return null
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
    const match: Match = {
      matchId,
      playerOneId: myId,
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
    }

    if (!isSearchActive()) return false

    if (await hasMatchedHuman(myId)) {
      await removeFromMatchingPool([myId])
      return false
    }

    if (!isSearchActive()) return false

    await insertMatch({ matchId, playerOneId: myId, playerTwoId, opponentType, quizSetId })

    try {
      await removeFromMatchingPool([myId, playerTwoId])
    } catch (error) {
      await abandonMatch(matchId, true)
      throw error
    }

    return acceptMatch(match)
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
    matchingState.value = 'searching'
    removeMatchSubscriptions()

    try {
      const userRecord = await initUser(userName)
      const userInfo = toUserInfo(userRecord)
      useUserStore().setMyCurrentId(userInfo.userId)
      useUserStore().setUserInfo(userInfo)
      globalStore.setIsLoadingModalOpen(true)
      await abandonExistingMatch(userInfo.userId)
      subscribeToMatch(userInfo.userId)

      await enterMatchingPool(userInfo.userId)

      const humanOpponent = await tryFindHumanOpponent(userInfo.userId)
      if (humanOpponent || !isSearchActive()) return

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

      if (!isSearchActive()) return
      const aiOpponent = await createAiOpponent()

      if (aiOpponent && isSearchActive()) {
        await createMatch(userInfo.userId, aiOpponent, 'ai', getRandomQuizSetId())
      }
    } catch (error) {
      reportError('startMatching', error)
      matchingState.value = 'idle'
      globalStore.setIsLoadingModalOpen(false)

      const currentUserId = useUserStore().myCurrentId
      if (currentUserId) {
        try {
          await removeFromMatchingPool([currentUserId])
        } catch (cleanupError) {
          reportError('startMatching:removeFromMatchingPool', cleanupError)
        }
      }

      globalStore.showError('Unable to start matchmaking. Please try again.')
    } finally {
      isProcessing.value = false
      if (matchingState.value === 'searching') matchingState.value = 'idle'
      removeMatchSubscriptions()
    }
  }

  onBeforeUnmount(() => {
    matchingState.value = 'canceled'
    removeMatchSubscriptions()
    globalStore.setIsLoadingModalOpen(false)
  })

  return { startMatching }
}

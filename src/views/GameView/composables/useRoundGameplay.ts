import { useDisposableTimers } from '@/composables/useDisposableTimers'
import { AI_MAX_RESPONSE_TIME_MS, ANSWER_TIME_SECONDS } from '@/config/game'
import { TIMER_TICK_MS, TIME_UP_BANNER_DURATION_MS } from '@/config/timing'
import { findRound, updateRoundSubmission } from '@/services/roundService'
import { startAnsweringAfterRender } from '@/services/matchService'
import { fetchVectors } from '@/services/aiApiService'
import { toMatch } from '@/mappers/matchMapper'
import { useMatchStore } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { calculateCumulativeScore, calculateFallbackScore, cosineSimilarity } from '@/utils/helpers'
import { reportError } from '@/utils/errors'
import { endGameWithError } from '@/utils/gameFailure'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, onBeforeUnmount, onMounted, ref, watchEffect, type Ref } from 'vue'

interface UseRoundGameplayOptions {
  currentRound: number
  matchId: string | string[]
}

/** 管理單一作答回合的計時、送出、計分、對手模擬、答案揭曉與導頁流程。 */
export function useRoundGameplay({ currentRound, matchId }: UseRoundGameplayOptions) {
  const matchStore = useMatchStore()
  const quizStore = useQuizStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()
  const { cancelInterval, delay, isActive, nextAnimationFrame, scheduleInterval, scheduleTimeout } =
    useDisposableTimers()
  const { opponentInfo } = storeToRefs(userStore)
  const { myRoundList, opponentRoundList, phantomRoundList } = storeToRefs(roundStore)
  let timer: ReturnType<typeof setInterval> | null = null
  let roundDeadlineMs: number | null = null
  let renderedAnswerDeadlineMs: number | null = null
  let hasStartedAnswering = false
  let hasReportedRenderReady = false
  let isReportingRenderReady = false
  let isRevealingAnswer = false
  let timeUpShownAtMs: number | null = null

  const gameStartTime = ref<number | null>(null)
  const myScoreWithoutThisRound = ref(0)
  const opponentScoreWithoutThisRound = ref(0)
  const remainingTime = ref(ANSWER_TIME_SECONDS)
  const inputValue = ref('')
  const isButtonDisabled = ref(false)
  const showTimeUp = ref(false)
  const isWaitingForScore = ref(false)
  const showAnswer = ref(false)
  const isStartAnswer = ref(false)
  const opponentSubmitted = computed(() =>
    Boolean(
      opponentRoundList.value.find((roundData) => roundData.round === currentRound)?.submittedAt,
    ),
  )
  const myCumulativeScore = computed(() => calculateCumulativeScore(myRoundList.value))
  const opponentCumulativeScore = computed(() => calculateCumulativeScore(opponentRoundList.value))
  const isSubmitHidden = computed(
    () =>
      matchStore.matchData.phase !== 'answering' ||
      remainingTime.value === 0 ||
      isButtonDisabled.value,
  )
  const isStartHidden = computed(
    () =>
      matchStore.matchData.phase !== 'answering' ||
      remainingTime.value === 0 ||
      isStartAnswer.value,
  )
  const timeProgress = computed(() => {
    const percent = (remainingTime.value / ANSWER_TIME_SECONDS) * 100
    return Math.max(0, Math.floor(percent))
  })

  /** 停止本回合倒數計時器。 */
  function stopTimer() {
    if (timer === null) return
    cancelInterval(timer)
    timer = null
  }

  /**
   * 倒數歸零時先把對手狀態更新為 Submitted，再等待一次瀏覽器繪製後顯示 Time's up。
   * 這裡只更新前端顯示；真人對手的正式答案仍會在 answer_reveal 從資料庫重新取得。
   */
  async function showTimeUpAfterOpponentSubmitted() {
    if (showTimeUp.value || showAnswer.value) return

    const opponentRound = opponentRoundList.value.find(
      (roundData) => roundData.round === currentRound,
    )
    const submittedAt = new Date().toISOString()

    if (opponentRound) {
      if (!opponentRound.submittedAt) {
        roundStore.updateOpponentCurrentRoundData({
          ...opponentRound,
          submittedAt,
        })
      }
    } else {
      // 正常流程會預先建立對手 Round；若重新整理或背景恢復時資料尚未補齊，
      // 先建立只供畫面使用的提交狀態，避免仍顯示 Typing 後就直接出現 Banner。
      roundStore.updateOpponentRoundList({
        roundId: uuidv4(),
        round: currentRound,
        input: '',
        score: 0,
        bonus: 0,
        timeTakenMs: ANSWER_TIME_SECONDS * TIMER_TICK_MS,
        submittedAt,
        createdAt: submittedAt,
      })
    }

    // Submitted 必須先交給瀏覽器完成一個畫面更新，下一格才顯示 Time's up Banner。
    if (!(await nextAnimationFrame()) || !isActive() || showAnswer.value) return
    showTimeUp.value = true
    timeUpShownAtMs = Date.now()
  }

  /** 依後端絕對截止時間顯示倒數，背景分頁恢復時不會從暫停處繼續扣秒。 */
  async function syncRoundTimer() {
    if (roundDeadlineMs === null) return

    const remainingMs = Math.max(roundDeadlineMs - Date.now(), 0)
    remainingTime.value = Math.min(ANSWER_TIME_SECONDS, Math.ceil(remainingMs / TIMER_TICK_MS))
    if (remainingTime.value > 0) return

    stopTimer()
    if (!isStartAnswer.value) isStartAnswer.value = true
    await showTimeUpAfterOpponentSubmitted()
    if (matchStore.matchData.phase === 'answering' && !isButtonDisabled.value) {
      await handleSubmit()
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') void syncRoundTimer()
  }

  function isAnsweringPhase() {
    return matchStore.matchData.phase === 'answering'
  }

  /** 以逐格動畫把畫面上的分數由目前值更新到最新累積分數。 */
  async function animateScoreTransition(
    thisRoundScoreRef: Ref<number>,
    thisRoundScore: number,
    cumulativeScore: number,
  ): Promise<void> {
    thisRoundScoreRef.value = thisRoundScore

    while (isActive()) {
      const frameCompleted = await nextAnimationFrame()
      if (!frameCompleted) return

      const diff = cumulativeScore - thisRoundScoreRef.value
      if (Math.abs(diff) === 0) break

      thisRoundScoreRef.value += Math.sign(diff) * Math.max(1, Math.floor(Math.abs(diff) / 10))
    }

    if (isActive()) thisRoundScoreRef.value = cumulativeScore
  }

  function calcBonus(timeTakenMs: number) {
    const totalMs = ANSWER_TIME_SECONDS * TIMER_TICK_MS
    const remainingMs = Math.max(totalMs - timeTakenMs, 0)
    return Math.round((remainingMs / TIMER_TICK_MS) * 0.5)
  }

  async function updateMyRound(newScore: number) {
    try {
      const roundId = myRoundList.value[currentRound - 1]?.roundId
      const now = Date.now()
      const timeTakenMs = gameStartTime.value ? Math.max(now - gameStartTime.value, 0) : 0
      const submittedAt = new Date().toISOString()
      const bonus = calcBonus(timeTakenMs)

      roundStore.updateMyCurrentRoundData({
        input: inputValue.value,
        score: newScore,
        bonus,
        timeTakenMs,
        submittedAt,
      })
      await updateRoundSubmission({
        matchId,
        roundId,
        round: currentRound,
        input: inputValue.value,
        score: newScore,
        bonus,
        timeTakenMs,
        submittedAt,
      })
    } catch (error) {
      throw reportError('updateMyRound', error)
    }
  }

  /** 時間結束仍未收到對手提交時主動查詢；沒有資料則補上零分空回合。 */
  async function getOpponentRoundData() {
    const opponentRoundData = await findRound(matchId, opponentInfo.value.opponentId, currentRound)
    if (!isActive()) return

    if (opponentRoundData) {
      roundStore.updateOpponentCurrentRoundData(opponentRoundData)
      return
    }

    // console.warn('[getOpponentRoundData] 找不到對方 round，補一筆空資料到 pinia')
    roundStore.updateOpponentCurrentRoundData({
      roundId: uuidv4(),
      round: currentRound,
      input: '',
      score: 0,
      bonus: 0,
      timeTakenMs: 0,
      submittedAt: null,
      createdAt: new Date().toISOString(),
    })
  }

  /** 產生 AI 在允許範圍內的隨機作答耗時。 */
  function getRandomTimeTakenMs(maximum = AI_MAX_RESPONSE_TIME_MS) {
    return Math.floor(Math.random() * (maximum + 1))
  }

  async function getVector(userAnswer: string) {
    isWaitingForScore.value = true

    try {
      const answer = quizStore.quizList[currentRound - 1].answer
      const data = await fetchVectors(answer, userAnswer)

      if (data?.vector1 && data.vector2) {
        return Math.round(cosineSimilarity(data.vector1, data.vector2))
      }
    } catch (error) {
      reportError('getVector', error)
    } finally {
      isWaitingForScore.value = false
    }

    return Math.round(
      calculateFallbackScore(quizStore.quizList[currentRound - 1].answer, userAnswer),
    )
  }

  async function handleSubmit() {
    isButtonDisabled.value = true
    const now = Date.now()
    const timeTakenMs = gameStartTime.value ? Math.max(now - gameStartTime.value, 0) : 0
    const newScore = await getVector(inputValue.value)
    if (!isActive()) return

    roundStore.updateMyCurrentRoundData({
      input: inputValue.value,
      score: newScore,
      bonus: calcBonus(timeTakenMs),
      timeTakenMs,
      submittedAt: new Date().toISOString(),
    })
    try {
      await updateMyRound(newScore ?? 0)
    } catch (error) {
      if (!isActive()) return
      await endGameWithError({
        context: 'handleSubmit',
        error,
        message: 'Unable to save your answer. Returning to the login screen.',
      })
    }
  }

  /** 依對手類型安排 Phantom 歷史答案或 AI 產生答案的提交時間。 */
  async function scheduleSimulatedOpponent() {
    if (matchStore.matchData.opponentType === 'phantom') {
      const phantomData = phantomRoundList.value[currentRound - 1]
      const delay = phantomData?.timeTakenMs ?? AI_MAX_RESPONSE_TIME_MS

      scheduleTimeout(() => {
        roundStore.updateOpponentCurrentRoundData({
          ...phantomData,
          submittedAt: new Date().toISOString(),
        })
      }, delay)
    }

    if (matchStore.matchData.opponentType === 'ai') {
      const aiTimeTakenMs = getRandomTimeTakenMs()
      const roundData = opponentRoundList.value[currentRound - 1]
      const aiRound = {
        ...roundData,
        input: roundStore.aiResponseList[currentRound - 1],
        score: await getVector(roundStore.aiResponseList[currentRound - 1]),
        bonus: calcBonus(aiTimeTakenMs),
        timeTakenMs: aiTimeTakenMs,
        submittedAt: new Date(Date.now() + aiTimeTakenMs).toISOString(),
      }

      if (!isActive()) return
      scheduleTimeout(() => roundStore.updateOpponentCurrentRoundData(aiRound), aiTimeTakenMs)
    }
  }

  /** Game 頁先完成 render；只有後端進入 answering 後才開始正式倒數與模擬對手。 */
  function startAnswerTimer() {
    if (hasStartedAnswering) return
    hasStartedAnswering = true

    const databaseDeadlineMs = Date.parse(matchStore.matchData.phaseDeadlineAt)
    roundDeadlineMs =
      renderedAnswerDeadlineMs ??
      (Number.isFinite(databaseDeadlineMs)
        ? databaseDeadlineMs
        : Date.now() + ANSWER_TIME_SECONDS * TIMER_TICK_MS)
    gameStartTime.value = roundDeadlineMs - ANSWER_TIME_SECONDS * TIMER_TICK_MS
    timer = scheduleInterval(() => void syncRoundTimer(), TIMER_TICK_MS)
    void syncRoundTimer()
    void scheduleSimulatedOpponent()
  }

  function initializeRound() {
    myScoreWithoutThisRound.value = calculateCumulativeScore(
      myRoundList.value.slice(0, currentRound),
    )
    opponentScoreWithoutThisRound.value = calculateCumulativeScore(
      opponentRoundList.value.slice(0, currentRound),
    )
    if (matchStore.matchData.phase === 'answering') startAnswerTimer()
  }

  async function reportRenderReady() {
    if (hasReportedRenderReady) return
    hasReportedRenderReady = true

    // 連續等待兩個 animation frame，確保 Game DOM 已經交給瀏覽器完成首次繪製。
    if (!(await nextAnimationFrame()) || !(await nextAnimationFrame()) || !isActive()) return
    if (matchStore.matchData.phase !== 'answer_preparing') return

    isReportingRenderReady = true
    try {
      const record = await startAnsweringAfterRender(String(matchId))
      if (record && isActive()) {
        // 從瀏覽器收到後端確認的當下顯示完整 10 秒；後端 11 秒包含 RPC 網路緩衝。
        renderedAnswerDeadlineMs = Date.now() + ANSWER_TIME_SECONDS * TIMER_TICK_MS
        matchStore.setMatchData(toMatch(record))
      }
    } catch (error) {
      // RPC 失敗時不重試；Supabase Cron 仍會在準備期限後自動開始作答。
      console.warn('[reportRenderReady] failed:', error)
    } finally {
      isReportingRenderReady = false
      if (isAnsweringPhase()) startAnswerTimer()
    }
  }

  async function revealAnswer() {
    try {
      stopTimer()

      // 真人答案以資料庫提交結果為準；AI／Phantom 沒有目前 Match 的對手 Round，保留模擬答案。
      if (matchStore.matchData.opponentType === 'human') await getOpponentRoundData()
      if (!isActive()) return

      // 正常情況下 Banner 已在倒數歸零時出現；若使用者從背景分頁回來或直接進入
      // answer_reveal，仍以相同順序補上 Submitted 與 Time's up。
      await showTimeUpAfterOpponentSubmitted()
      if (!isActive()) return

      const elapsedTimeUpMs = timeUpShownAtMs ? Date.now() - timeUpShownAtMs : 0
      const remainingTimeUpMs = Math.max(TIME_UP_BANNER_DURATION_MS - elapsedTimeUpMs, 0)
      if (remainingTimeUpMs > 0 && (!(await delay(remainingTimeUpMs)) || !isActive())) return
      showTimeUp.value = false
      showAnswer.value = true

      await Promise.all([
        animateScoreTransition(
          myScoreWithoutThisRound,
          myScoreWithoutThisRound.value,
          myCumulativeScore.value,
        ),
        animateScoreTransition(
          opponentScoreWithoutThisRound,
          opponentScoreWithoutThisRound.value,
          opponentCumulativeScore.value,
        ),
      ])
    } catch (error) {
      if (!isActive()) return
      await endGameWithError({
        context: 'revealAnswer',
        error,
        message: 'Unable to reveal the round result. Returning to the login screen.',
      })
    }
  }

  watchEffect(() => {
    if (matchStore.matchData.phase === 'answering') {
      if (isReportingRenderReady) return
      startAnswerTimer()
      return
    }

    if (matchStore.matchData.phase !== 'answer_reveal' || showAnswer.value || isRevealingAnswer)
      return

    isRevealingAnswer = true
    void revealAnswer()
  })

  onMounted(initializeRound)
  onMounted(reportRenderReady)
  onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    handleSubmit,
    inputValue,
    isStartAnswer,
    isStartHidden,
    isSubmitHidden,
    myScoreWithoutThisRound,
    opponentScoreWithoutThisRound,
    opponentSubmitted,
    remainingTime,
    showTimeUp,
    showAnswer,
    timeProgress,
  }
}

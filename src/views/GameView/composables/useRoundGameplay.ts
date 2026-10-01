import { safePush, safeReplace } from '@/composables/usePageGuard'
import { AI_MAX_RESPONSE_TIME_MS, ANSWER_TIME_SECONDS } from '@/config/game'
import { ANSWER_REVEAL_DURATION_MS, TIMER_TICK_MS } from '@/config/timing'
import { findRound, updateRoundSubmission } from '@/services/roundService'
import { fetchVectors } from '@/services/scoringService'
import { useMatchStore } from '@/stores/match'
import { useQuizStore } from '@/stores/quiz'
import { useRoundStore } from '@/stores/round'
import { useUserStore } from '@/stores/user'
import { calculateCumulativeScore, calculateFallbackScore, cosineSimilarity } from '@/utils/helpers'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect, type Ref } from 'vue'

interface UseRoundGameplayOptions {
  currentRound: number
  delayTimeMs: number
  matchId: string | string[]
}

/** 管理單一作答回合的計時、送出、計分、對手模擬、答案揭曉與導頁流程。 */
export function useRoundGameplay({ currentRound, delayTimeMs, matchId }: UseRoundGameplayOptions) {
  const matchStore = useMatchStore()
  const quizStore = useQuizStore()
  const roundStore = useRoundStore()
  const userStore = useUserStore()
  const { opponentInfo } = storeToRefs(userStore)
  const { myRoundList, opponentRoundList, phantomRoundList } = storeToRefs(roundStore)
  let timer: ReturnType<typeof setInterval> | null = null

  const gameStartTime = ref<number | null>(null)
  const myScoreWithoutThisRound = ref(0)
  const opponentScoreWithoutThisRound = ref(0)
  const remainingTime = ref(ANSWER_TIME_SECONDS)
  const inputValue = ref('')
  const isButtonDisabled = ref(false)
  const roundFinished = ref(false)
  const isWaitingForScore = ref(false)
  const showAnswer = ref(false)
  const isStartAnswer = ref(false)
  const opponentSubmitted = computed(() => !!opponentRoundList.value[currentRound - 1]?.submittedAt)
  const myCumulativeScore = computed(() => calculateCumulativeScore(myRoundList.value))
  const opponentCumulativeScore = computed(() => calculateCumulativeScore(opponentRoundList.value))
  const isSubmitHidden = computed(() => remainingTime.value === 0 || isButtonDisabled.value)
  const isStartHidden = computed(() => remainingTime.value === 0 || isStartAnswer.value)
  const timeProgress = computed(() => {
    const percent = (remainingTime.value / ANSWER_TIME_SECONDS) * 100
    return Math.max(0, Math.floor(percent))
  })

  /** 停止本回合倒數計時器。 */
  function stopTimer() {
    if (timer === null) return
    clearInterval(timer)
    timer = null
  }

  /** 以逐格動畫把畫面上的分數由目前值更新到最新累積分數。 */
  function animateScoreTransition(
    thisRoundScoreRef: Ref<number>,
    thisRoundScore: number,
    cumulativeScore: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const step = () => {
        const diff = cumulativeScore - thisRoundScoreRef.value

        if (Math.abs(diff) > 0) {
          thisRoundScoreRef.value += Math.sign(diff) * Math.max(1, Math.floor(Math.abs(diff) / 10))
          requestAnimationFrame(step)
        } else {
          thisRoundScoreRef.value = cumulativeScore
          resolve()
        }
      }

      thisRoundScoreRef.value = thisRoundScore
      requestAnimationFrame(step)
    })
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
      const timeTakenMs = gameStartTime.value ? now - gameStartTime.value : 0
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
      safeReplace(`/`)
      // console.error('[updateMyRound] failed:', error)
      throw error
    }
  }

  /** 時間結束仍未收到對手提交時主動查詢；沒有資料則補上零分空回合。 */
  async function getOpponentRoundData() {
    const opponentRoundData = await findRound(matchId, opponentInfo.value.opponentId, currentRound)

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
      // console.error('[getVector] failed:', error)
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
    const timeTakenMs = gameStartTime.value ? now - gameStartTime.value : 0
    const newScore = await getVector(inputValue.value)

    roundStore.updateMyCurrentRoundData({
      input: inputValue.value,
      score: newScore,
      bonus: calcBonus(timeTakenMs),
      timeTakenMs,
      submittedAt: new Date().toISOString(),
    })
    await updateMyRound(newScore ?? 0)
  }

  /** 依對手類型安排 Phantom 歷史答案或 AI 產生答案的提交時間。 */
  async function scheduleSimulatedOpponent() {
    if (matchStore.matchData.opponentType === 'phantom') {
      const phantomData = phantomRoundList.value[currentRound - 1]
      const delay = phantomData?.timeTakenMs ?? AI_MAX_RESPONSE_TIME_MS

      setTimeout(() => {
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

      setTimeout(() => roundStore.updateOpponentCurrentRoundData(aiRound), aiTimeTakenMs)
    }
  }

  /** 初始化畫面分數與倒數；倒數歸零時自動送出當下答案。 */
  function startRoundTimer() {
    myScoreWithoutThisRound.value = calculateCumulativeScore(
      myRoundList.value.slice(0, currentRound),
    )
    opponentScoreWithoutThisRound.value = calculateCumulativeScore(
      opponentRoundList.value.slice(0, currentRound),
    )
    gameStartTime.value = Date.now()

    timer = setInterval(async () => {
      if (remainingTime.value > 0) {
        remainingTime.value--
        if (remainingTime.value !== 0) return

        stopTimer()
        if (!isStartAnswer.value) isStartAnswer.value = true
        if (!isButtonDisabled.value) await handleSubmit()
        return
      }

      stopTimer()
    }, TIMER_TICK_MS)
  }

  watch(showAnswer, (isShown) => {
    if (isShown) stopTimer()
  })

  watchEffect(() => {
    const mySubmitted = !!myRoundList.value[currentRound - 1]?.submittedAt
    const opponentHasSubmitted = !!opponentRoundList.value[currentRound - 1]?.submittedAt
    const timeOver = remainingTime.value === 0
    const shouldEndRound = (mySubmitted && opponentHasSubmitted) || (timeOver && mySubmitted)

    if (roundFinished.value || !shouldEndRound) return

    roundFinished.value = true
    stopTimer()
    const shouldFetchOpponentRound = mySubmitted && !opponentHasSubmitted && timeOver

    setTimeout(async () => {
      if (shouldFetchOpponentRound) await getOpponentRoundData()
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

      setTimeout(() => safePush(`/round-result/${matchId}`), ANSWER_REVEAL_DURATION_MS)
    }, delayTimeMs)
  })

  onMounted(scheduleSimulatedOpponent)
  onMounted(startRoundTimer)
  onBeforeUnmount(stopTimer)

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
    roundFinished,
    showAnswer,
    timeProgress,
  }
}

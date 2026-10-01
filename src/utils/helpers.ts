export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getRandomQuizSetId(totalSets = 1): number {
  // return Math.floor(Math.random() * totalSets) + 1
  return totalSets
}

/** 加總所有回合的基本分數與時間獎勵。 */
export function calculateCumulativeScore(rounds: Array<{ score: number; bonus: number }>): number {
  return rounds.reduce((total, round) => total + round.score + round.bonus, 0)
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  // 計算內積
  const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0)

  // 計算兩個向量的長度（magnitude）
  const magnitude1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0))
  const magnitude2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0))

  // 避免分母為 0（即其中一個向量為全 0）
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }

  // 計算餘弦相似度
  const rawScore = dotProduct / (magnitude1 * magnitude2)

  // 將結果限制為 >= 0，並轉成百分比整數（0～100）
  return Math.round(Math.max(0, rawScore) * 100)
}

export function calculateFallbackScore(targetText: string, inputText: string): number {
  const target = targetText.trim().toLowerCase()
  const input = inputText.trim().toLowerCase()

  if (target === input) return 100
  if (!target || !input) return 0

  //1. 關鍵字包含優化 (Keyword Boost)
  let keywordBonus = 0
  if (input.includes(target) || target.includes(input)) {
    keywordBonus = 70 // 給予一個體感較好的保底分數
  }

  // 2. 原始編輯距離計算
  const targetLength = target.length
  const inputLength = input.length
  const matrix: number[][] = Array.from({ length: targetLength + 1 }, () =>
    Array(inputLength + 1).fill(0),
  )

  for (let i = 0; i <= targetLength; i++) matrix[i][0] = i
  for (let j = 0; j <= inputLength; j++) matrix[0][j] = j

  for (let i = 1; i <= targetLength; i++) {
    for (let j = 1; j <= inputLength; j++) {
      const substitutionCost = target[i - 1] === input[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      )
    }
  }

  const editDistance = matrix[targetLength][inputLength]
  const longerTextLength = Math.max(targetLength, inputLength)
  const editDistanceScore = Math.round((1 - editDistance / longerTextLength) * 100)

  // 3. 取兩者最大值
  return Math.round(Math.max(keywordBonus, editDistanceScore))
}

export function formatTime(seconds: number, padZero = false): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (padZero) {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function computeWinRate(winCount: number, lossCount: number, decimals = 0): number {
  const total = winCount + lossCount
  if (total === 0) return 0

  const percentage = (winCount * 100) / total
  const factor = 10 ** decimals
  return Math.round(percentage * factor) / factor
}

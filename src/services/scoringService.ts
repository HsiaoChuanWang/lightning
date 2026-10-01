interface VectorResponse {
  vector1?: number[]
  vector2?: number[]
  details?: string
}

/** 呼叫向量 API 取得兩段文字的 embedding；請求失敗時回傳 null。 */
export async function fetchVectors(text1: string, text2: string): Promise<VectorResponse | null> {
  const response = await fetch('/api/vectors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text1, text2 }),
  })

  const data: VectorResponse = await response.json()
  if (!response.ok) {
    return null
  }

  return data
}

/** 呼叫圖片描述 API 產生 AI 各回合答案；請求失敗時回傳 null。 */
export async function fetchImageDescriptions(
  prompt: string,
  imageList: string[],
): Promise<string[] | null> {
  const response = await fetch('/api/describe-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageList }),
  })

  const data = await response.json()
  if (!response.ok) {
    // console.error('[fetchImageDescriptions] API error:', data.details)
    return null
  }

  return JSON.parse(data.text)
}

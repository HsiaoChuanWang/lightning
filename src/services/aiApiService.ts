/**
 * 呼叫前端使用的 AI API，並驗證 API 實際回傳的資料。
 * 此檔案負責向量與圖片描述請求、錯誤分類及 Response 格式檢查，
 * 不負責計算分數、決定 fallback 或控制 Game Flow。
 */

interface VectorResponse {
  vector1: number[]
  vector2: number[]
}

export type AiApiErrorKind = 'network' | 'http' | 'invalid-payload' | 'gemini'

/** 儲存 AI API 的錯誤種類與 HTTP 狀態。 */
export class AiApiError extends Error {
  readonly kind: AiApiErrorKind
  readonly status: number | null

  constructor(kind: AiApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'AiApiError'
    this.kind = kind
    this.status = status
  }
}

/** 檢查資料是否為一般物件。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 檢查 embedding 是否為有限數字陣列。 */
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every(Number.isFinite)
}

/** 檢查兩組向量是否存在且維度相同。 */
function isVectorResponse(value: unknown): value is VectorResponse {
  return (
    isRecord(value) &&
    isNumberArray(value.vector1) &&
    isNumberArray(value.vector2) &&
    value.vector1.length === value.vector2.length
  )
}

/** 檢查圖片描述是否為指定數量的字串陣列。 */
function isDescriptionResponse(
  value: unknown,
  expectedCount: number,
): value is { descriptions: string[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.descriptions) &&
    value.descriptions.length === expectedCount &&
    value.descriptions.every((description) => typeof description === 'string')
  )
}

/** 檢查 Response 的 Content-Type 是否為 JSON。 */
function hasJsonContentType(response: Response): boolean {
  return response.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false
}

/** 分類 HTTP 錯誤並解析成功回應的 JSON。 */
async function parseJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    let payload: unknown = null

    if (hasJsonContentType(response)) {
      try {
        payload = await response.json()
      } catch {
        // 解析錯誤內容失敗時保留原本的 HTTP 狀態。
      }
    }

    const errorCode = isRecord(payload) ? payload.code : null
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : `API request failed with status ${response.status}`

    const kind: AiApiErrorKind =
      errorCode === 'GEMINI_FAILURE'
        ? 'gemini'
        : errorCode === 'INVALID_GEMINI_PAYLOAD'
          ? 'invalid-payload'
          : 'http'

    throw new AiApiError(kind, message, response.status)
  }

  if (!hasJsonContentType(response)) {
    throw new AiApiError('invalid-payload', 'API response is not JSON', response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new AiApiError('invalid-payload', 'API response contains invalid JSON', response.status)
  }
}

/** 發送 JSON POST 請求並轉換 network 錯誤。 */
async function requestJson(url: string, body: unknown): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const details = error instanceof Error ? `: ${error.message}` : ''
    throw new AiApiError('network', `Unable to connect to ${url}${details}`)
  }

  return parseJsonResponse(response)
}

/** 將兩段文字送到向量 API，回傳通過格式驗證的兩組 embedding。 */
export async function fetchVectors(text1: string, text2: string): Promise<VectorResponse> {
  const payload = await requestJson('/api/vectors', { text1, text2 })
  if (!isVectorResponse(payload)) {
    throw new AiApiError('invalid-payload', 'Vector API returned an invalid payload')
  }

  return payload
}

/** 將圖片送到描述 API，回傳通過格式驗證的字串陣列。 */
export async function fetchImageDescriptions(
  prompt: string,
  imageList: string[],
): Promise<string[]> {
  const payload = await requestJson('/api/describe-image', { prompt, imageList })
  if (!isDescriptionResponse(payload, imageList.length)) {
    throw new AiApiError('invalid-payload', 'Image description API returned an invalid payload')
  }

  return payload.descriptions
}

/** 將未知的拋出值統一轉換成 Error 實例。 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)

  try {
    return new Error(JSON.stringify(error))
  } catch {
    return new Error(String(error))
  }
}

/** 統一記錄錯誤，並將使用者提示文案與技術細節分開。 */
export function reportError(context: string, error: unknown): Error {
  const normalizedError = normalizeError(error)
  console.error(`[${context}] failed:`, normalizedError)
  return normalizedError
}

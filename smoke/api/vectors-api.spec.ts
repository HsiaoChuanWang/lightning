import { expect, test } from '@playwright/test'

interface VectorResponse {
  vector1?: unknown
  vector2?: unknown
}

test('真實 vectors API 回傳兩組有效且同維度的向量', async ({ request }) => {
  const response = await request.post('/api/vectors', {
    data: {
      text1: 'A cat is sitting beside a window.',
      text2: 'There is a cat near the window.',
    },
  })
  const body = (await response.json()) as VectorResponse

  expect(response.ok(), JSON.stringify(body)).toBeTruthy()
  expect(Array.isArray(body.vector1)).toBeTruthy()
  expect(Array.isArray(body.vector2)).toBeTruthy()

  const vector1 = body.vector1 as unknown[]
  const vector2 = body.vector2 as unknown[]
  expect(vector1.length).toBeGreaterThan(0)
  expect(vector2.length).toBe(vector1.length)
  expect(vector1.every(Number.isFinite)).toBeTruthy()
  expect(vector2.every(Number.isFinite)).toBeTruthy()
})

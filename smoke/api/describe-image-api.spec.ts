import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

test('真實 describe-image API 回傳題庫圖片的有效描述', async ({ request }) => {
  expect(supabaseUrl, '.env.local 缺少 VITE_SUPABASE_URL').toBeTruthy()
  expect(supabaseKey, '.env.local 缺少 VITE_SUPABASE_ANON_KEY').toBeTruthy()

  const supabase = createClient(supabaseUrl!, supabaseKey!)
  const { data, error } = await supabase
    .from('quizzes')
    .select('image_url')
    .not('image_url', 'is', null)
    .limit(1)
    .single()

  expect(error?.message ?? '').toBe('')
  expect(data?.image_url).toBeTruthy()

  const imageUrl = new URL(data!.image_url, supabaseUrl).toString()
  const response = await request.post('/api/describe-image', {
    data: {
      prompt: 'Describe this image in one short English sentence.',
      imageList: [imageUrl],
    },
  })
  const body = (await response.json()) as { descriptions?: unknown }

  expect(response.ok(), JSON.stringify(body)).toBeTruthy()
  expect(Array.isArray(body.descriptions)).toBeTruthy()

  const descriptions = body.descriptions as unknown[]
  expect(descriptions).toHaveLength(1)
  expect(typeof descriptions[0]).toBe('string')
  expect((descriptions[0] as string).trim().length).toBeGreaterThan(0)
})

import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

export const TOTAL_ROUNDS = 5
export const FLOW_TIMEOUT_MS = 5 * 60 * 1000
export const PHASE_TIMEOUT_MS = 60 * 1000

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const testSupabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export interface Player {
  context: BrowserContext
  id: string
  name: string
  page: Page
}

export type ScoreLevel = 'high' | 'low' | 'tie'

/** 模擬玩家思考時間；第 10 秒由完全不作答的逾時測試覆蓋。 */
export function randomAnswerDelaySeconds(): number {
  return Math.floor(Math.random() * 9) + 1
}

/** 在自動點擊前保留兩秒，方便 headed 模式觀察目前 UI。 */
export async function clickAfterPause(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({ timeout: PHASE_TIMEOUT_MS })
  await locator.page().waitForTimeout(2_000)
  await locator.click()
}

export async function createPlayer(
  browser: Browser,
  id: string,
  name: string,
): Promise<Player> {
  if (!UUID_PATTERN.test(id)) throw new Error(`「${name}」的測試帳號 ID 不是合法 UUID：${id}`)

  const context = await browser.newContext({ viewport: { width: 900, height: 760 } })
  await context.addInitScript(
    ({ storageKey, userInfo }) => localStorage.setItem(storageKey, JSON.stringify(userInfo)),
    {
      storageKey: `user_info_${name}`,
      userInfo: { userId: id, userName: name },
    },
  )

  // 固定向量結果，使勝、負、平手不依賴外部 AI API。
  await context.route('**/api/vectors', async (route) => {
    const body = route.request().postDataJSON() as { text2?: string }
    const vector2 = body.text2?.includes('[低分]') ? [0, 1] : [1, 0]
    await route.fulfill({ json: { vector1: [1, 0], vector2 } })
  })

  return { context, id, name, page: await context.newPage() }
}

/**
 * 平手情境專用：固定送往 Supabase 的作答時間與加分，避免兩個瀏覽器的毫秒差打破平手。
 */
export async function useFixedRoundTimingForTie(
  player: Player,
  timeTakenMs = 5_000,
  bonus = 3,
): Promise<void> {
  await player.context.route('**/rest/v1/rounds*', async (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') {
      await route.continue()
      return
    }

    const body = request.postDataJSON() as Record<string, unknown>
    await route.continue({
      postData: JSON.stringify({
        ...body,
        time_taken_ms: timeTakenMs,
        bonus,
      }),
    })
  })
}

function waitForMatchingPoolReady(player: Player): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timeout)
      player.page.off('response', handleResponse)
      resolve()
    }
    const handleResponse = async (response: Response) => {
      if (!response.url().includes('/rest/v1/matching_pool') || !response.ok()) return
      if (response.request().method() === 'POST') return finish()
      if (response.request().method() !== 'GET') return
      try {
        const records = (await response.json()) as unknown
        if (Array.isArray(records) && records.length > 0) finish()
      } catch {
        // 空查詢後仍會繼續等待新增配對池的回應。
      }
    }
    const timeout = setTimeout(() => {
      player.page.off('response', handleResponse)
      reject(new Error(`等待「${player.name}」進入配對池逾時`))
    }, PHASE_TIMEOUT_MS)
    player.page.on('response', handleResponse)
  })
}

export async function enterMatchmaking(player: Player, waitForPool = false) {
  await player.page.goto('/', { waitUntil: 'domcontentloaded' })
  const input = player.page.getByPlaceholder('Enter your name [20 words]')
  await input.fill(player.name)
  const clickStart = () => clickAfterPause(player.page.getByRole('button', { name: 'START' }))
  if (waitForPool) await Promise.all([waitForMatchingPoolReady(player), clickStart()])
  else await clickStart()
}

export async function startHumanMatch(first: Player, second: Player): Promise<string> {
  if (!testSupabase) throw new Error('E2E 無法讀取 .env.local 的 Supabase 設定')

  const playerIds = [first.id, second.id]
  const { error: poolError } = await testSupabase
    .from('matching_pool')
    .delete()
    .in('user_id', playerIds)
  if (poolError) throw new Error(`清理 E2E 配對池失敗：${poolError.message}`)

  const playerFilter = playerIds
    .flatMap((id) => [`player_one_id.eq.${id}`, `player_two_id.eq.${id}`])
    .join(',')
  const { error: matchError } = await testSupabase
    .from('matches')
    .update({ status: 'abandoned' })
    .or(playerFilter)
    .in('status', ['matched', 'in_progress'])
  if (matchError) throw new Error(`清理 E2E 未完成比賽失敗：${matchError.message}`)

  await enterMatchmaking(first, true)
  await enterMatchmaking(second)
  await Promise.all(
    [first, second].map((player) =>
      expect(player.page).toHaveURL(/\/start-challenge\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS }),
    ),
  )
  const firstId = new URL(first.page.url()).pathname.split('/').pop()
  const secondId = new URL(second.page.url()).pathname.split('/').pop()
  expect(firstId).toBeTruthy()
  expect(secondId).toBe(firstId)
  return firstId!
}

export async function submitRound(
  player: Player,
  round: number,
  score: ScoreLevel,
  delaySeconds = randomAnswerDelaySeconds(),
) {
  await expect(player.page).toHaveURL(/\/game\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS })
  const start = player.page.getByRole('button', { name: /Click here to describe your answer/i })
  // 作答倒數已經開始，這裡不能再套用一般按鈕的 2 秒展示停留。
  await expect(start).toBeVisible({ timeout: PHASE_TIMEOUT_MS })
  await start.click()
  const marker = score === 'low' ? '[低分]' : '[高分]'
  const answer = `${marker}${player.name} 第 ${round} 回合答案`
  await player.page.getByRole('textbox').fill(answer)
  await player.page.waitForTimeout(delaySeconds * 1_000)
  const submit = player.page.getByRole('button', { name: 'Submit' })
  // 第 9 秒可能因瀏覽器排程跨過倒數終點；若遊戲已自動送出，就繼續後續流程。
  if (await submit.isVisible()) await submit.click()
}

export async function completeHumanMatch(
  first: Player,
  second: Player,
  firstScore: ScoreLevel,
  secondScore: ScoreLevel,
) {
  for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
    const firstDelay = randomAnswerDelaySeconds()
    // 相同分數的情境共用思考時間，避免時間獎勵破壞平手結果。
    const secondDelay = firstScore === secondScore ? firstDelay : randomAnswerDelaySeconds()
    await Promise.all([
      submitRound(first, round, firstScore, firstDelay),
      submitRound(second, round, secondScore, secondDelay),
    ])
  }
  await Promise.all(
    [first, second].map((player) =>
      expect(player.page).toHaveURL(/\/game-result\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS }),
    ),
  )
}

export async function completeSimulatedMatch(player: Player) {
  for (let round = 1; round <= TOTAL_ROUNDS; round += 1) {
    await submitRound(player, round, 'high')
  }
  await expect(player.page).toHaveURL(/\/game-result\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS })
}

export async function closePlayers(...players: Player[]) {
  await Promise.all(players.filter((player) => !player.context.pages().every((p) => p.isClosed())).map((player) => player.context.close()))
}

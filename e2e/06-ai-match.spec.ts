import { expect, test } from '@playwright/test'
import { FLOW_TIMEOUT_MS, PHASE_TIMEOUT_MS, closePlayers, completeSimulatedMatch, createPlayer, enterMatchmaking } from './support/game'

test('AI 描述 API 失敗時改用 Supabase 標準答案並完成五回合', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS * 2)
  const player = await createPlayer(browser, '16000000-0000-4000-8000-000000000001', 'E2E AI Player')
  try {
    await player.context.route('**/rest/v1/rpc/match_users', (route) => route.fulfill({ json: [] }))
    await player.context.route('**/rest/v1/matches*', async (route) => {
      const url = route.request().url()
      if (route.request().method() === 'GET' && url.includes('is_player_one_complete=eq.true')) {
        await route.fulfill({ json: [] })
        return
      }
      await route.continue()
    })
    await player.context.route('**/api/describe-image', (route) => route.abort('failed'))

    await enterMatchmaking(player)
    await expect(player.page).toHaveURL(/\/start-challenge\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS })
    await expect(player.page.getByText('AI opponent', { exact: true })).toBeVisible()
    await completeSimulatedMatch(player)
    await expect(player.page.getByRole('button', { name: 'Play again' })).not.toBeVisible()
  } finally {
    await closePlayers(player)
  }
})

import { expect, test } from '@playwright/test'
import { FLOW_TIMEOUT_MS, PHASE_TIMEOUT_MS, closePlayers, completeSimulatedMatch, createPlayer, enterMatchmaking } from './support/game'

test('匹配 Phantom 對手並完成五回合', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS * 2)
  const player = await createPlayer(browser, '15000000-0000-4000-8000-000000000001', 'E2E Phantom Player')
  try {
    await player.context.route('**/rest/v1/rpc/match_users', (route) => route.fulfill({ json: [] }))
    await enterMatchmaking(player)
    await expect(player.page).toHaveURL(/\/start-challenge\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS })
    await expect(player.page.getByText('AI opponent', { exact: true })).not.toBeVisible()
    await completeSimulatedMatch(player)
    await expect(player.page.getByRole('button', { name: 'Play again' })).not.toBeVisible()
  } finally {
    await closePlayers(player)
  }
})

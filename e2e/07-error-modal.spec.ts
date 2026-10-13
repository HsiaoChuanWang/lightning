import { expect, test } from '@playwright/test'
import { PHASE_TIMEOUT_MS, clickAfterPause, closePlayers, createPlayer } from './support/game'

test('任一 API 錯誤會顯示 Error Modal 並回到登入頁', async ({ browser }) => {
  const player = await createPlayer(browser, '17000000-0000-4000-8000-000000000001', 'E2E Error Player')
  try {
    await player.context.route('**/rest/v1/users*', (route) => route.abort('failed'))
    await player.page.goto('/', { waitUntil: 'domcontentloaded' })
    await player.page.getByPlaceholder('Enter your name [20 words]').fill(player.name)
    await clickAfterPause(player.page.getByRole('button', { name: 'START' }))
    await expect(player.page.getByText('Something went wrong', { exact: true })).toBeVisible({ timeout: PHASE_TIMEOUT_MS })
    await expect(player.page.getByText('Unable to start matchmaking. Please try again.')).toBeVisible()
    await expect(player.page).toHaveURL(/\/$/)
    await clickAfterPause(player.page.getByRole('button', { name: 'OK' }))
    await expect(player.page.getByText('Something went wrong', { exact: true })).not.toBeVisible()
  } finally {
    await closePlayers(player)
  }
})

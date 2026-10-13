import { expect, test } from '@playwright/test'
import {
  FLOW_TIMEOUT_MS,
  clickAfterPause,
  closePlayers,
  completeHumanMatch,
  createPlayer,
  startHumanMatch,
  useFixedRoundTimingForTie,
} from './support/game'

test('真人五回合平手後，一方邀請再戰且被邀請方拒絕', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS * 2)
  const first = await createPlayer(browser, '13000000-0000-4000-8000-000000000001', 'E2E Tie Player One')
  const second = await createPlayer(browser, '13000000-0000-4000-8000-000000000002', 'E2E Tie Player Two')
  try {
    await Promise.all([
      useFixedRoundTimingForTie(first),
      useFixedRoundTimingForTie(second),
    ])
    await startHumanMatch(first, second)
    await completeHumanMatch(first, second, 'high', 'high')
    await expect(first.page.getByText('Tie!', { exact: true })).toBeVisible()
    await expect(second.page.getByText('Tie!', { exact: true })).toBeVisible()
    await clickAfterPause(first.page.getByRole('button', { name: 'Play again' }))
    await expect(second.page.getByText('Your opponent wants a rematch. Ready for revenge?')).toBeVisible()
    await clickAfterPause(second.page.getByRole('button', { name: 'No way' }))
    await expect(first.page.getByText('Rejected', { exact: true })).toBeVisible()
    await Promise.all([
      expect(first.page).toHaveURL(/\/$/, { timeout: 10_000 }),
      expect(second.page).toHaveURL(/\/$/, { timeout: 10_000 }),
    ])
  } finally {
    await closePlayers(first, second)
  }
})

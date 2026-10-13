import { expect, test } from '@playwright/test'
import { FLOW_TIMEOUT_MS, PHASE_TIMEOUT_MS, clickAfterPause, closePlayers, completeHumanMatch, createPlayer, startHumanMatch } from './support/game'

test('真人完成五回合後，輸家邀請贏家並成功再戰', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS * 2)
  const winner = await createPlayer(browser, '12000000-0000-4000-8000-000000000001', 'E2E Winner Two')
  const loser = await createPlayer(browser, '12000000-0000-4000-8000-000000000002', 'E2E Loser Two')
  try {
    const oldMatchId = await startHumanMatch(winner, loser)
    await completeHumanMatch(winner, loser, 'high', 'low')
    await clickAfterPause(loser.page.getByRole('button', { name: 'Play again' }))
    await expect(loser.page.getByText('Pending', { exact: true })).toBeVisible()
    await expect(winner.page.getByText('Your defeated opponent has challenged you to a rematch. Do you accept?')).toBeVisible()
    await expect(winner.page.getByRole('button', { name: 'Sure!' })).toBeVisible()
    await expect(winner.page.getByRole('button', { name: 'No thanks' })).toBeVisible()
    await clickAfterPause(winner.page.getByRole('button', { name: 'Sure!' }))

    await Promise.all([
      expect(winner.page).toHaveURL(/\/start-challenge\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS }),
      expect(loser.page).toHaveURL(/\/start-challenge\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS }),
    ])
    const winnerMatchId = new URL(winner.page.url()).pathname.split('/').pop()
    const loserMatchId = new URL(loser.page.url()).pathname.split('/').pop()
    expect(winnerMatchId).not.toBe(oldMatchId)
    expect(loserMatchId).toBe(winnerMatchId)
  } finally {
    await closePlayers(winner, loser)
  }
})

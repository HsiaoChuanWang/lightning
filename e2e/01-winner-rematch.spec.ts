import { expect, test } from '@playwright/test'
import { FLOW_TIMEOUT_MS, PHASE_TIMEOUT_MS, clickAfterPause, closePlayers, completeHumanMatch, createPlayer, startHumanMatch } from './support/game'

test('真人完成五回合後，贏家邀請輸家並成功再戰', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS * 2)
  const winner = await createPlayer(browser, '11000000-0000-4000-8000-000000000001', 'E2E Winner One')
  const loser = await createPlayer(browser, '11000000-0000-4000-8000-000000000002', 'E2E Loser One')
  try {
    const oldMatchId = await startHumanMatch(winner, loser)
    await completeHumanMatch(winner, loser, 'high', 'low')
    await expect(winner.page.getByText('Win!', { exact: true })).toBeVisible()
    await expect(loser.page.getByText('Lose...', { exact: true })).toBeVisible()

    await clickAfterPause(winner.page.getByRole('button', { name: 'Play again' }))
    await expect(winner.page.getByText('Pending', { exact: true })).toBeVisible()
    await expect(loser.page.getByText('Your opponent wants a rematch. Ready for revenge?')).toBeVisible()
    await expect(loser.page.getByRole('button', { name: "Let's go!" })).toBeVisible()
    await expect(loser.page.getByRole('button', { name: 'No way' })).toBeVisible()
    await clickAfterPause(loser.page.getByRole('button', { name: "Let's go!" }))

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

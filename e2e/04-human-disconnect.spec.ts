import { expect, test } from '@playwright/test'
import {
  FLOW_TIMEOUT_MS,
  PHASE_TIMEOUT_MS,
  clickAfterPause,
  closePlayers,
  createPlayer,
  startHumanMatch,
  submitRound,
} from './support/game'

test('真人對戰中對手掉線，線上玩家看到 Modal 並回到登入頁', async ({ browser }) => {
  test.setTimeout(FLOW_TIMEOUT_MS)
  const onlinePlayer = await createPlayer(browser, '14000000-0000-4000-8000-000000000001', 'E2E Online Player')
  const disconnectingPlayer = await createPlayer(browser, '14000000-0000-4000-8000-000000000002', 'E2E Disconnecting Player')
  try {
    await startHumanMatch(onlinePlayer, disconnectingPlayer)
    await expect(onlinePlayer.page.getByText('E2E Disconnecting Player', { exact: true })).toBeVisible()
    await expect(disconnectingPlayer.page.getByText('E2E Online Player', { exact: true })).toBeVisible()

    // 雙方先完成第一回合，再等待第二回合作答畫面載入。
    await Promise.all([
      submitRound(onlinePlayer, 1, 'high', 2),
      submitRound(disconnectingPlayer, 1, 'high', 2),
    ])
    await Promise.all(
      [onlinePlayer, disconnectingPlayer].map(async (player) => {
        await expect(player.page).toHaveURL(/\/game\/[^/]+$/, { timeout: PHASE_TIMEOUT_MS })
        await expect(
          player.page.getByRole('button', { name: /Click here to describe your answer/i }),
        ).toBeVisible({ timeout: PHASE_TIMEOUT_MS })
      }),
    )

    // 第二回合進行途中，模擬其中一位玩家突然離線。
    await disconnectingPlayer.context.close()
    await expect(onlinePlayer.page.getByText('Something went wrong', { exact: true })).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      onlinePlayer.page.getByText(
        'The opponent disconnected. This match will not affect your record.',
      ),
    ).toBeVisible()

    // Error Modal 保留兩秒供 headed 模式查看，再按 OK 顯示登入頁。
    await clickAfterPause(onlinePlayer.page.getByRole('button', { name: 'OK' }))
    await expect(onlinePlayer.page).toHaveURL(/\/$/, { timeout: PHASE_TIMEOUT_MS })
    await expect(onlinePlayer.page.getByPlaceholder('Enter your name [20 words]')).toBeVisible()
  } finally {
    await closePlayers(onlinePlayer, disconnectingPlayer)
  }
})

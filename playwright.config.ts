import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 測試共用配對池與固定測試帳號，必須依序執行以避免互相搶配對。
  fullyParallel: false,
  // 避免在 CI 中誤將 test.only 提交到版本庫。
  forbidOnly: !!process.env.CI,
  // 只在 CI 環境中重試失敗的測試。
  retries: process.env.CI ? 2 : 0,
  // 本機與 CI 都使用單一 worker，確保共用後端狀態不互相干擾。
  workers: 1,
  // 測試完成後產生 HTML 報告。
  reporter: 'html',
  // 所有瀏覽器專案共用的設定。
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  // 分別使用 Chromium、Firefox 與 WebKit 執行測試。
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 如需測試行動裝置，可以啟用以下設定。
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // }, */

    /* 如需測試 Microsoft Edge 或 Google Chrome，可以啟用以下設定。
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // }, */
  ],

  // 執行測試前自動啟動 Vite；本機已有伺服器時直接沿用。
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})

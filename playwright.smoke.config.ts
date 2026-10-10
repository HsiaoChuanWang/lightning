import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './smoke/api',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run server',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})

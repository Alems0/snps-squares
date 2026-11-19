import { defineConfig, devices } from '@playwright/test'

/** Local mock Supabase — WebKit blocks obscure ports (e.g. port 9); use 54321. */
const MOCK_SUPABASE_URL = 'http://127.0.0.1:54321'
const MOCK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.mock'

const webServerEnv = {
  ...process.env,
  VITE_USE_MOCK: 'true',
  VITE_SUPABASE_URL: MOCK_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: MOCK_SUPABASE_ANON_KEY,
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: webServerEnv,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /iphone-touch.*\.spec\.ts/,
    },
    {
      name: 'webkit-iphone-13',
      use: {
        ...devices['iPhone 13'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: /iphone-touch.*\.spec\.ts/,
    },
    {
      name: 'webkit-iphone-se',
      use: {
        ...devices['iPhone SE'],
        hasTouch: true,
        isMobile: true,
      },
      testMatch: /iphone-touch.*\.spec\.ts/,
    },
  ],
})

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3108",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3108",
    env: {
      ADMIN_PASSWORD: "e2e-admin-password",
      ADMIN_SESSION_SECRET: "e2e-admin-session-secret",
      E2E_REPOSITORY: "memory",
      RSVP_VERIFICATION_SECRET: "e2e-rsvp-verification-secret",
      SUPABASE_SERVICE_ROLE_KEY: "e2e-unused-service-role-key",
      SUPABASE_URL: "https://example.invalid",
    },
    url: "http://127.0.0.1:3108",
    reuseExistingServer: false,
  },
});

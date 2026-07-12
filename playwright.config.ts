import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Drop the {projectName}/{platform} suffix from snapshot paths so the
  // baselines committed alongside the spec are reused across macOS dev
  // and Linux CI. Cross-platform font rendering noise is absorbed by the
  // `toHaveScreenshot` tolerance below.
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The preview server and browser processes contend heavily when this repo is
  // run from an external macOS volume; serial execution is both faster and
  // avoids navigation-only timeouts. CI was already intentionally serial.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "only-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    // 10% pixel-ratio + per-pixel 0.3 threshold absorbs font/antialiasing
    // differences between macOS (local) and Linux (CI) renderers. Tighten
    // later if it masks real regressions.
    toHaveScreenshot: { maxDiffPixelRatio: 0.1, threshold: 0.3 },
  },
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});

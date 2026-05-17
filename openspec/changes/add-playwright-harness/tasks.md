## 1. Install Playwright

- [ ] 1.1 Add `@playwright/test` as a devDependency at the matching/closest version to the existing `playwright` package (currently ^1.58.2). Run `npm install --save-dev @playwright/test`. Verify the lockfile updates.
- [ ] 1.2 Install Chromium locally: `npx playwright install chromium`. Confirm `~/Library/Caches/ms-playwright/` (macOS) or equivalent is populated. The CI workflow installs `--with-deps` to also bring system libraries.

## 2. Playwright config

- [ ] 2.1 Create `playwright.config.ts` at the repo root with:
  - `testDir: './e2e'`
  - `fullyParallel: true`
  - `forbidOnly: !!process.env.CI` (catch accidental `.only` in CI)
  - `retries: process.env.CI ? 1 : 0`
  - `reporter: process.env.CI ? 'github' : 'list'`
  - `use.baseURL: 'http://localhost:4173'` (Vite preview default)
  - `use.trace: 'only-on-failure'`
  - `use.screenshot: 'only-on-failure'`
  - `use.video: 'retain-on-failure'`
  - `webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 60_000 }`
  - `projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]`
  - `expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } }` (~2% diff tolerance for font/anti-aliasing noise)

## 3. First smoke spec

- [ ] 3.1 Create `e2e/smoke.spec.ts` with one test: "ii-V-I in C voice-leads through the piano view." Steps:
  - Navigate to `/`.
  - Fill the chord input textbox with `Dm7 G7 Cmaj7`.
  - Press Enter.
  - Click the "Piano" toggle.
  - Wait for three chord cards to render.
  - Via `page.evaluate`, decode the active piano keys' MIDI positions for each card. Assert the MIDI arrays match `[50,53,57,60]`, `[50,53,55,59]`, `[52,55,59,60]`.
  - Take a full-page screenshot with `expect(page).toHaveScreenshot('voice-leading-piano-iiVI-c.png', { fullPage: true })`.
- [ ] 3.2 Generate the baseline screenshot: `npx playwright test --update-snapshots`. Commit the resulting PNG under `e2e/__screenshots__/` (or wherever Playwright places it per its convention — typically `e2e/<spec>.spec.ts-snapshots/`).

## 4. npm scripts

- [ ] 4.1 In `package.json`, add `"test:e2e": "playwright test"` and `"test:e2e:update": "playwright test --update-snapshots"`.

## 5. .gitignore

- [ ] 5.1 Add `playwright-report/`, `test-results/`, and `.playwright/` to `.gitignore`. These are runtime outputs and should never be committed. (Already-committed baseline PNGs under `e2e/**/*.png` remain tracked.)

## 6. CI workflow

- [ ] 6.1 Update `.github/workflows/ci.yml` to add a new `playwright` job in parallel with `build-and-test`:
  - Checkout, setup Node 20, `npm ci`.
  - `npx playwright install --with-deps chromium`.
  - `npm run build`.
  - `npm run test:e2e`.
  - On failure, upload `playwright-report/` as a job artifact via `actions/upload-artifact@v4`.
- [ ] 6.2 Verify the existing `build-and-test` job is unchanged.

## 7. Local verification

- [ ] 7.1 `npm install` clean.
- [ ] 7.2 `npm run lint` exit 0.
- [ ] 7.3 `npm run build` green.
- [ ] 7.4 `npm run test` green (existing 57 vitest tests untouched).
- [ ] 7.5 `npm run test:e2e` green locally with the committed baseline.
- [ ] 7.6 Sanity-check the baseline screenshot by opening the PNG and confirming it shows the voice-led piano view for Dm7-G7-Cmaj7 (the canonical v2 ii-V-I case).

## 8. PR

- [ ] 8.1 Commit per logical unit (tooling + config + spec in one commit; CI workflow in a second).
- [ ] 8.2 Push `chore/add-playwright-harness`.
- [ ] 8.3 Open PR with the standard template (What / Why / Screenshots / Test summary / Risks / Follow-ups). Embed the committed baseline screenshot in the PR body.
- [ ] 8.4 Self-merge when both `build-and-test` and the new `playwright` job are green.

## 9. Archive

- [ ] 9.1 After merge: move `openspec/changes/add-playwright-harness/` → `openspec/changes/archive/$(date +%Y-%m-%d)-add-playwright-harness/`. No spec deltas to apply (process tooling).
- [ ] 9.2 Update `docs/long_horizon_plan.md` to mark milestone 1.2 Done with PR link.
- [ ] 9.3 Add dated entry to `docs/long_horizon_log.md`.

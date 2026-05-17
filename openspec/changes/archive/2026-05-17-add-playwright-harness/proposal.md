## Why

`docs/long_horizon_prompt.md §3.4` requires a before/during/after Playwright cadence for every UI-touching milestone:

> **Before**: capture a baseline screenshot of the relevant view (piano card, chord card, progression) on `main` so you can detect regressions you didn't intend.
> **During**: re-run focused Playwright tests after each meaningful UI commit so you catch breakage in the commit that introduced it, not three commits later.
> **After**: full Playwright run, updated baseline screenshots committed, before flipping the PR out of draft.

v2 (Piano Voicings — Voice Leading) just shipped with a manual smoke check via the Playwright MCP, but no committed baselines and no automated visual regression test. v3 onward needs the harness in place so the cadence can actually run.

Today the only browser-aware tooling in the repo is the standalone `playwright` package (v1.58.2) in devDependencies, with no test runner, no config, no specs, and no committed baselines. CI runs `npm run build` and `npm run test` — neither touches a browser.

## What Changes

### Tooling

- **Add** `@playwright/test` as a devDependency (the test runner; the existing standalone `playwright` is unused and stays in place as a transitive driver).
- **Add** `playwright.config.ts` at the repo root configuring:
  - Test directory: `e2e/`.
  - `webServer`: spins up `npm run preview` automatically (Vite preview serves the built SPA, no Worker needed for the engine/UI assertions v2 covers).
  - Single browser project: `chromium` only. Saves CI time and bandwidth; cross-browser comes later if a real bug ever depends on it.
  - Trace/screenshot/video set to `only-on-failure`.
  - `expect.toHaveScreenshot` with a small tolerance for sub-pixel font/anti-aliasing noise.
- **Add** an `e2e/` directory:
  - `e2e/smoke.spec.ts` — the first spec. Loads the SPA, types "Dm7 G7 Cmaj7" into Free Input, presses Run, switches to Piano view, asserts the rendered MIDI keys equal `[50,53,57,60]` / `[50,53,55,59]` / `[52,55,59,60]` (the v2 voice-leading-locked values), and takes a full-page screenshot for visual diffing.
  - `e2e/__screenshots__/` — committed baseline PNGs. Generated once with `npx playwright test --update-snapshots` on `main`.
- **Add** npm scripts:
  - `test:e2e` → `playwright test`.
  - `test:e2e:update` → `playwright test --update-snapshots`.

### CI

- **Add** a `playwright` job to `.github/workflows/ci.yml` that runs in parallel with `build-and-test`:
  - `npm ci`
  - `npx playwright install --with-deps chromium` (downloads + system deps)
  - `npm run build` (Playwright's `webServer` runs `npm run preview` against the `dist/`)
  - `npx playwright test`
  - On failure, upload `playwright-report/` and trace as a build artifact.

- The existing `build-and-test` job is unchanged; the new `playwright` job is additive.

### Workflow integration

The §3.4 before/during/after cadence is now operable from v3 onward:

- **Before**: agent runs `npx playwright test` against `main` once, captures the existing baseline; if intentional UI changes are planned, `npx playwright test --update-snapshots` regenerates baselines on the feature branch.
- **During**: agent re-runs focused Playwright tests after each meaningful UI commit (`npx playwright test e2e/specific-spec.spec.ts`).
- **After**: full run + commit any updated `__screenshots__/` files alongside the UI change in the same PR.

## Capabilities

### New Capabilities

None. Visual regression tooling is dev-facing infrastructure, not user-facing behavior. The Playwright specs *verify* requirements that already live in the `chord-card-display` and `harmony-brain` capability specs (e.g., the v2 voice-leading note sets) — they don't add new ones.

### Modified Capabilities

None.

## Impact

- **New files:** `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/__screenshots__/` (PNG baselines), `openspec/changes/add-playwright-harness/` (this change), `.github/workflows/ci.yml` updates.
- **Modified files:** `package.json` (devDependency + scripts), `.gitignore` (Playwright report + cache directories).
- **New devDependency:** `@playwright/test` (~6 MB on disk; browsers are installed in CI on demand, not vendored).
- **Bundle impact:** zero. Tests don't ship with the SPA build.
- **CI cost:** new `playwright` job adds ~2-3 minutes per push (browser download is cached after the first run). Single browser (chromium only) keeps it cheap.
- **Risk:** **Low.** The harness is additive — no existing test or build path changes. The first smoke spec uses the exact MIDI assertions already locked down by v2's vitest tests, so a Playwright failure on day one would mean either a UI wire-up regression (caught early) or a flaky test (rare with `webServer` autostart + explicit waits). Visual screenshot diff has a small built-in tolerance to absorb font-rendering noise across OS versions.
- **Rollback:** revert the PR; no schema, secret, or external-state change.

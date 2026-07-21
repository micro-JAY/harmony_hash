## 1. Welcome visibility

- [x] 1.1 Initialize onboarding open on every normal app visit while retaining the E2E returning-visitor fixture.
- [x] 1.2 Preserve explicit close, guided-tour, Help/About, focus, and storage fallback behavior.

## 2. Locale default

- [x] 2.1 Add an SSR-safe ordered EN/JP browser-locale detector.
- [x] 2.2 Initialize `I18nProvider` from the detector and cover supported/unsupported preference cases.

## 3. Verification

- [x] 3.1 Run focused Vitest checks, build, lint, and the onboarding/localization Playwright flows.
- [x] 3.2 Perform Browser visual and interaction validation, then stage and commit only the requested patch and preserved user edits.

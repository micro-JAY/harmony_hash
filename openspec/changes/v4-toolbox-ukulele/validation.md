# Validation — 2026-09-27

The original checkout was clean and matched `origin/main` at `936be49d472bd26057a109b701a9c93920c0d96b` after fetching. Implementation is isolated on `feat/v4-toolbox-ukulele`; no production deployment or main-branch changes were made.

- Installed the exact lockfile with `npm ci` in the isolated checkout. Vitest 5.0.0: **66 files / 1,370 tests passed**.
- Production build, TypeScript, ESLint, and `git diff --check` pass.
- Strict validation of this OpenSpec change passes. Repository-wide strict validation has four pre-existing failures, independently reproduced on the unchanged base: `migrate-hanz-to-openai-realtime`, `refine-circle-and-hasher-learning-controls`, `refine-hasher-presets-and-chord-cards`, and `restore-hanz-spoken-voice`.
- Full initial Chromium run: 200 passed, 10 failed. Failures identified outdated navigation/layout/screenshot expectations and a real nested-board clipping defect at 320px. After fixes, all 68 affected/new scenarios pass (67 in the grouped rerun, followed by the corrected compact-mobile test). Eighteen earlier focused ukulele, fretboard, and localization scenarios also passed.
- Browser coverage includes retained shared Toolbox context, four persistent disclosures, equal 44px settings controls, keyboard access to every compact fret, ukulele variant locks and instrument switching, mixed available/unavailable chords preserving playback indices, all-unavailable playback, and ukulele share-link import.
- Screenshot baselines were visually inspected and refreshed for the intended layout. Internal horizontal scrolling preserves usable note targets at 320px without document overflow.
- Voicing coverage: 594 of 600 catalog identities have a supported high-G shape under the bounded ergonomic search. This is implementation coverage, not a claim that the other six chords cannot be played on any ukulele. Reduced voicings disclose omitted tones; unavailable shapes retain their progression slot as a rest.

The combined Discovery and typed-Harmony preview will receive another complete regression run. Guided-tour content and navigation behavior remain deferred until the user approves the v4 features.

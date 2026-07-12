## 1. Guidance and contract

- [x] 1.1 Create stacked branch `feat/guitar-fretboard`, read the long-horizon contract and relevant OpenSpec/Build Web Apps skills, and inspect existing theory, chord-diagram, app-shell, token, and test patterns.
- [x] 1.2 Query Context7 for current React lazy-loading/memoization/accessibility patterns and Playwright grid, keyboard, scrolling, reduced-motion, and performance guidance before implementation.
- [x] 1.3 Strictly validate the complete OpenSpec proposal, design, and capability deltas before code.

## 2. Pure fretboard theory

- [x] 2.1 Export an immutable ordered interval accessor from the shared scale basics without changing existing scale-membership behavior.
- [x] 2.2 Add typed standard guitar/bass tuning definitions and a pure 0–15 fret mapping helper with pitch class, scale membership, interval label, degree, root flag, and deterministic sharp/flat note display.
- [x] 2.3 Add focused Vitest coverage for both instruments, open strings, fret 12, all seven modes, flat/sharp spelling, invalid inputs, and deterministic output.

## 3. First-class explorer UI

- [x] 3.1 Add accessible Builder/Fretboard workspace navigation while keeping builder instrument and progression state above the workspace branch.
- [x] 3.2 Lazy-load a Tonari-styled explorer with independent Guitar/Bass, Root, Mode, and Intervals/Notes controls plus an interval-role legend.
- [x] 3.3 Render the horizontal 15-fret board with open strings, conventional string order, fret markers, root emphasis, semantic note buttons, arrow-key spatial navigation, and focus scrolling.
- [x] 3.4 Preserve reduced-motion behavior, readable non-color labels, desktop/tablet/mobile document containment, and one labeled internal horizontal scroller.
- [x] 3.5 Keep the existing builder, chord cards, voice bridge, provider routes, and tool surface behaviorally unchanged; switching away SHALL not expose a hidden active companion UI.

## 4. Automated verification

- [x] 4.1 Add Playwright coverage for default state, guitar/bass row counts, root/mode/label updates, exact note semantics, arrow navigation, builder-state preservation, and lazy-load behavior.
- [x] 4.2 Cover desktop, 820px tablet, and 375px mobile containment, internal scrolling, visible focus, reduced motion, console health, and a 500ms control-update budget.
- [x] 4.3 Run build, lint, full Vitest, focused shared-theory regressions, full Playwright, repeated focused Playwright, and strict current-change validation; fix every failure.

## 5. Visual QA and delivery

- [x] 5.1 Attempt the in-app Browser first, then inspect desktop/tablet/mobile screenshots, DOM, focus, scroll, and console evidence with the documented Playwright fallback only if Browser runtime is unavailable.
- [x] 5.2 Complete an independent code/spec/accessibility review and close every Critical, High, and Medium finding.
- [x] 5.3 Update the long-horizon plan/log with the shipped slice, explicit alternate-tuning/lefty/CAGED/3NPS/chord-overlay follow-ups, test evidence, stacked base, and unchanged voice 502 blocker.
- [x] 5.4 Commit logical milestones, push `feat/guitar-fretboard`, open a stacked draft PR against `feat/free-input-harmonic-suggestions`, and do not merge to main.

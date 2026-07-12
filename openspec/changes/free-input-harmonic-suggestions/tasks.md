## 1. Guidance and contract

- [x] 1.1 Query Context7 for current React derived-state/memoization/accessibility guidance and Playwright locator/performance guidance before implementation.
- [x] 1.2 Validate the OpenSpec change strictly and reconcile any proposal, design, or scenario mismatch before code.

## 2. Pure harmonic scoring

- [x] 2.1 Add typed key-fit, voice-leading, root-motion, tier, reason, and combined next-chord scoring helpers under `src/lib/theory/` with no runtime side effects.
- [x] 2.2 Cover diatonic, borrowed/altered, enharmonic, dominant-resolution, missing-previous, tier-boundary, and repeatability cases with focused Vitest tests.

## 3. Free Input context

- [x] 3.1 Add independent Free Input Key and Mode state and accessible selectors for all supported keys and modes without changing Progressions state.
- [x] 3.2 Keep the chord browser mounted in Free Input after chord cards render and preserve explicit Run as the timeline-update boundary.

## 4. Chord-grid suggestions

- [x] 4.1 Replace the binary overlay with Off, Key, and Next modes and derive the last dictionary-valid input chord without hiding parse errors.
- [x] 4.2 Memoize per-cell scores and render percentage, tier, legend, token-based fit styling, title, and ARIA reasons without changing root identity colors or insertion/undo behavior.
- [x] 4.3 Preserve keyboard focus, pointer/touch activation, responsive wrapping, horizontal scrolling, and reduced-motion behavior.
- [x] 4.4 Update voice capability comments/docs so they accurately distinguish app-local scoring from the unchanged companion tool surface.

## 5. Automated verification

- [x] 5.1 Add focused UI tests for context independence, persistent browser access, invalid trailing input, score updates, and explicit Run behavior.
- [x] 5.2 Add Playwright coverage for desktop, tablet, 375px mobile, keyboard, pointer, guitar/piano continuity, console health, document overflow, and scoped interaction latency.
- [x] 5.3 Run build, lint, full Vitest, focused shared-library regressions, full Playwright, repeated focused Playwright, and strict OpenSpec validation; fix all failures.

## 6. Visual QA and delivery

- [x] 6.1 Use the in-app Browser first to inspect desktop, tablet, and mobile screenshots plus DOM, console, focus, scroll, and primary interaction evidence.
- [x] 6.2 Complete an independent code review and close all critical, high, and medium findings.
- [x] 6.3 Update the long-horizon plan/log with the feature state, test evidence, stacked base, and remaining voice permission blocker.
- [ ] 6.4 Commit logical milestones, push `feat/free-input-harmonic-suggestions`, and open a stacked draft PR when GitHub authentication permits; do not merge to main.

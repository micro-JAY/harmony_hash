## 1. OpenSpec and visual direction

- [x] 1.1 Create the proposal, delta specs, technical design, and implementation checklist; verify `openspec validate guided-tour-improv-light-theme --strict` succeeds.
- [x] 1.2 Generate and inspect a current-UI concept covering the compact Discovery overlay, clearer guitar neck, and warm-paper light appearance; verify it preserves the shipped information hierarchy and Tonari visual language.

## 2. Persistent light and dark appearance

- [x] 2.1 Add an exception-safe appearance model, versioned persistence, pre-render restoration, document color scheme, and browser theme-color updates; verify unit tests cover dark default, both valid values, invalid storage, and thrown storage access.
- [x] 2.2 Add semantic light-theme tokens using the approved palette and make DOM, piano/guitar, inverse labels, shadows, and the live Note Neural Network canvas theme-aware; verify representative contrast assertions and a mounted-network theme-toggle test pass.
- [x] 2.3 Add an accessible Sun/Moon appearance control inside Help / About, localized copy, focus-preserving live updates, and the local-storage privacy disclosure; verify modal and translation unit tests pass at desktop and mobile widths.

## 3. Discovery Improv Insight overlay

- [x] 3.1 Pass immutable Hasher chord data into Discovery and add pure recommendation-selection helpers around the canonical Improv Insight ranker; verify tests cover top-six ranking, flat spelling, stable selection, progression mutation, and empty input.
- [x] 3.2 Add the compact recommendation selector and Highlight toggle with an honest disabled empty state and instrument-persistent local state; verify Discovery component tests cover the default-off behavior and non-mutation of progression/note state.
- [x] 3.3 Add low-priority scale membership to every matching Discovery piano key while keeping selected and held states dominant; verify repeated pitch classes, accessible scale semantics, and priority in component tests.
- [x] 3.4 Redesign the Discovery guitar anatomy and apply the same scale membership with readable note/root markers, focus semantics, and an internal mobile scroller; verify component and browser tests cover desktop, 375–390px containment, keyboard use, and both appearance themes.

## 4. Fret Finder simplification

- [x] 4.1 Remove the Fret Finder chord-overlay picker, state, legend, renderer props, styles, and overlay-only translation copy; verify no overlay control or chord-tone data attribute is rendered.
- [x] 4.2 Simplify Fret Finder decoration and spatial-navigation helpers to the pattern-only visible set while preserving Scale Synthesia callers; verify mapping, pattern, keyboard, handedness, tuning, latency, and responsive tests pass.
- [x] 4.3 Remove or refocus obsolete overlay tests and update the canonical guitar-fretboard purpose to match the new scope; verify no production import of the removed picker remains and strict OpenSpec validation still succeeds.

## 5. Guided-tour refresh

- [x] 5.1 Add an explicit non-modal handoff step to GuidedTour that focuses the requested tab, cannot be bypassed with Next or forward arrows, advances only after the real matching activation, and retains modal/inert behavior elsewhere; verify focused component tests cover pointer, keyboard, wrong-tab, Escape, and focus restoration.
- [x] 5.2 Reorder and rewrite the tour for current Hasher input modes, Tune Toolbox/Fret Finder order, Discovery input/overlay/loop, and three-workspace welcome copy; add stable target selectors and Japanese strings, then verify translation and target-resolution tests pass.
- [x] 5.3 Update the end-to-end traversal to prove workspaces do not switch before explicit Tune Toolbox and Discovery tab activations, no target is missing, and the handoff prompt fits a short 375px viewport; verify the focused onboarding browser suite passes in English and Japanese.

## 6. Integration, visual QA, and delivery

- [x] 6.1 Run focused unit and browser suites for appearance, Help / About, Discovery, Fret Finder, guided tour, and UI tokens; fix regressions and record the exact passing commands.
- [x] 6.2 Run `npm run lint`, `npm run build`, and `npm run test`; verify all repository checks pass without skips or focused tests.
- [x] 6.3 Capture and inspect final dark/light desktop and mobile screenshots for Hasher, Help / About, Discovery piano/guitar, Tune Toolbox, and the live tour handoffs; verify no clipping, stale canvas palette, unreadable state, or unintended horizontal overflow.
- [x] 6.4 Update `docs/long_horizon_log.md`, run strict OpenSpec validation, commit with conventional messages, push the feature branch, and open the requested PR with the repository template and test/visual evidence; verify CI is green and the PR is attached to this task.

## 1. Guidance and contract

- [x] 1.1 Create stacked branch `feat/fretboard-tunings-handedness`, inspect the shipped explorer engine/UI/tests, and create a fresh OpenSpec change before code.
- [x] 1.2 Query Context7 for current React derived-list/layout-effect guidance and Playwright orientation, scroll-edge, keyboard, and responsive assertions.
- [x] 1.3 Strictly validate proposal, design, and modified `guitar-fretboard` scenarios before implementation.

## 2. Immutable tuning engine

- [x] 2.1 Add frozen typed tuning catalog records for four guitar and three bass tunings plus instrument-filtered lookup helpers.
- [x] 2.2 Extend fretboard mapping to accept a compatible tuning id and fail explicitly on unknown or instrument-mismatched ids.
- [x] 2.3 Add Vitest coverage for every pitch sequence, Drop D/Open G/DADGAD/BEAD placement, runtime immutability, mismatches, enharmonic display, and unchanged standard defaults.

## 3. Handed explorer UI

- [x] 3.1 Add tuning and Right-handed/Left-handed controls with independent guitar/bass tuning memory and a dynamic tuning readout.
- [x] 3.2 Render one derived visual fret sequence across headers, cells, markers, and accessible names while retaining high-to-low string rows.
- [x] 3.3 Make Left/Right navigation follow rendered direction, retain nearest-fret vertical movement, and synchronize the open-string scroll edge after handedness changes.
- [x] 3.4 Preserve reduced motion, focus visibility, one internal scroller, builder state, companion continuity, and 375px document containment.

## 4. Verification

- [x] 4.1 Add Playwright coverage for every tuning option, per-instrument memory, exact pitch changes, handed column order, right/left arrow semantics, lefty mobile edge, and accessible names.
- [x] 4.2 Cover desktop, 820px tablet, 375px mobile, console health, reduced motion, document overflow, and a 500ms tuning/orientation budget.
- [x] 4.3 Run build, lint, full Vitest, focused theory regressions, full Playwright, three repeated focused runs, strict OpenSpec, and diff checks.

## 5. Review and delivery

- [x] 5.1 Use the in-app Browser first for desktop/mobile interaction and screenshot evidence, with documented Playwright fallback only if unavailable.
- [x] 5.2 Complete independent code/spec/accessibility review and close every Critical, High, and Medium finding.
- [x] 5.3 Update the long-horizon plan/log with tuning coverage, handedness semantics, validation evidence, stacked base, and remaining pattern/overlay plus voice blockers.
- [x] 5.4 Commit logical milestones, push the feature branch, open a draft PR stacked on `feat/guitar-fretboard`, and do not merge to main.

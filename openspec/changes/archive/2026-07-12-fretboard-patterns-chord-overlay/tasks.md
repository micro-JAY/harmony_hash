## 1. Contract and guidance

- [x] 1.1 Create the stacked feature branch and inspect the existing fretboard, tuning, theory, dictionary, and UI patterns before implementation.
- [x] 1.2 Consult current Context7 React and Playwright guidance before code, or record the final service limitation and apply the successful guidance already captured for this run.
- [x] 1.3 Strictly validate the completed proposal, design, specification delta, and implementation task contract.

## 2. Pure pattern and chord engines

- [x] 2.1 Add immutable absolute open-pitch metadata to tuning strings and verify every shipped guitar and bass tuning.
- [x] 2.2 Add a typed, deeply frozen pattern catalog and compatibility result with behavior-identical `All` output.
- [x] 2.3 Implement immutable CAGED templates, deterministic transposition and placement, per-string envelopes, and G Major E-form fixtures.
- [x] 2.4 Implement absolute-pitch 3NPS generation and exhaustive root, mode, and start-degree invariants, including the exact C Major degree-one fixture.
- [x] 2.5 Add a frozen unique chord-catalog search accessor without exposing the mutable alias lookup map.
- [x] 2.6 Extract and reuse chord-tone pitch-class, degree, and slash-bass derivation with Cmaj7 and G7#9 classification tests.
- [x] 2.7 Combine scale, pattern, and overlay data into a pure visible-position decoration result with `All` and focused-pattern envelope semantics.

## 3. Explorer interface

- [x] 3.1 Add a separate responsive learning-layer surface for pattern family, remembered sub-selection, and explicit compatibility status.
- [x] 3.2 Add an accessible dictionary-backed chord-overlay picker with capped search results, keyboard selection, Escape handling, focus restoration, inline errors, and clear behavior.
- [x] 3.3 Render the visible pattern and chord-tone union with in-scale rings, outside-scale dashed markers, forced note labels, complete accessible names, and a non-color-only legend.
- [x] 3.4 Preserve roving focus, handedness, tuning memory, builder state, playback and highlight state, provider continuity, reduced-motion behavior, and responsive containment.

## 4. Verification

- [x] 4.1 Add exhaustive unit and component coverage for pattern compatibility, exact fixtures, overlay theory, search uniqueness, persistence, and focus recovery.
- [x] 4.2 Add Playwright coverage for pointer and keyboard pattern and overlay flows, compatibility recovery, builder continuity, and representative performance updates.
- [x] 4.3 Validate desktop, tablet, and 375px mobile containment, internal scrolling, left-handed behavior, reduced motion, accessibility, console output, and the 500ms budget.
- [x] 4.4 Run build, lint, full Vitest, full Playwright, repeated focused browser tests, strict OpenSpec validation, and a final diff audit.
- [x] 4.5 Inspect the finished interface in the in-app Browser and capture representative evidence for the pull request.

## 5. Review and delivery

- [x] 5.1 Run an independent code review and close every critical, high, and medium finding before delivery.
- [x] 5.2 Reconcile the long-horizon plan and log with validation evidence, stack state, the voice-provider blocker, and the user's post-change planning preference.
- [x] 5.3 Commit logical milestones, push the stacked feature branch, and open a draft pull request targeting `feat/fretboard-tunings-handedness` without merging to main.
- [x] 5.4 After the stacked change becomes eligible and merges, apply the delta to the canonical specification, archive this change, and use normal planning without new OpenSpec changes for subsequent work.

## 1. Specification Boundary and Baseline

- [x] 1.1 Run strict OpenSpec validation and reconcile any proposal/design/delta inconsistency before source edits.
- [x] 1.2 Record a requirement-by-requirement acceptance ledger for the supplied screenshots and written fixes, including authoritative proof for every item.
- [x] 1.3 Capture current PR #75 desktop, tablet, and mobile evidence for header centering, preset visibility, composer controls, Guitar cards, and Piano cards.
- [x] 1.4 Commit the complete OpenSpec artifact boundary as a standalone milestone without staging `.agents/` or `AGENTS.md`.

## 2. Centered Header and Complete Preset Dialogs

- [x] 2.1 Replace desktop header flex balancing with a true three-region centered layout while preserving the wrapped tablet/mobile layout.
- [x] 2.2 Replace the inline preset subgroup/progression carousels with four centered Major, Minor, Modal, and Advanced category buttons inside the existing bordered surface.
- [x] 2.3 Implement one localized accessible preset dialog that renders every subgroup and progression for the selected category, closes on selection, and restores focus on dismissal.
- [x] 2.4 Preserve preset transposition, Minor Blend help, shared timeline replacement, stale-agent invalidation, and Japanese labels through the dialog path.
- [x] 2.5 Strengthen catalogue parity tests for exact 23/21/13/5 category counts, subgroup/name/numeral parity, uniqueness, and all-key dictionary resolution.
- [x] 2.6 Add Playwright coverage for header center geometry, all four complete dialog inventories, pointer/keyboard selection, Escape/outside dismissal, focus restoration, and 375px containment.
- [x] 2.7 Inspect and approve the four category-dialog visual states at desktop and mobile widths, then commit the header/preset milestone.

## 3. Intuitive Composer Removal and Drag Safety

- [x] 3.1 Add selected/focused chip state that reveals one compact localized `X` removal action without restoring persistent handles, arrows, or insertion buttons.
- [x] 3.2 Route selected `X`, Delete/Backspace, and empty-input Backspace through the same atomic removal transaction and live-region announcement.
- [x] 3.3 Remove an existing chip after an actual native mouse drop or threshold-qualified touch/pen release anywhere outside the composer while retaining exact inside-composer insertion and reorder boundaries.
- [x] 3.4 Ensure Escape, pointer cancellation, or an invalid drop never removes or moves a chord.
- [x] 3.5 Preserve stable item identity, locks, variants, piano style, playback cancellation, Hanz index handling, and text-agent invalidation for remove/reorder operations.
- [x] 3.6 Add pure/component/Playwright coverage for click selection, focus selection, `X`, keyboard removal/reorder, drag-in reorder, drag-out removal, cancelled drag, appending grid clicks, and mobile containment.
- [x] 3.7 Inspect the composer at desktop, tablet, and mobile widths and commit the removal/drag milestone.

## 4. Chord-Family Colors and Card Control Alignment

- [x] 4.1 Audit and correct the shared chord-family classifier across major extensions, minor, dominant/altered, suspended, diminished/half-diminished, and augmented aliases.
- [x] 4.2 Finalize semantic tokens for pastel-green Major, pastel-orange Minor, deep-red Dominant, light-yellow Suspended, soft-pink Diminished, and white Augmented with tested contrast on every real surface.
- [x] 4.3 Apply family styling to chord-grid quality headers while preserving blue root rows and independent Key/Next/Jazz/Modal score tiers and percentages.
- [x] 4.4 Apply family styling to Guitar/Piano chord-card headings and modifier option names without replacing playback, Hanz, lock, or match-score semantics.
- [x] 4.5 Keep the modifier in `AccessibleDialog`, verify the `Top picks` label, and apply the existing percentage-match gradient to supported scores and accessible descriptions.
- [x] 4.6 Rebuild the Guitar card toolbar as a symmetric centered layout for `Fingering`, `Intervals`, and `Notes`, including a contained narrow-card wrap.
- [x] 4.7 Remove the Piano label-mode selector and confirm Guitar retains its three display modes and exact diagram behavior.
- [x] 4.8 Add classifier, token, contrast, non-color, geometry, dialog, focus-restoration, and responsive visual tests, then commit the semantic card-controls milestone.

## 5. Equal, Fully Visible Piano Cards

- [x] 5.1 Refactor the procedural C3–B5 keyboard to percentage-based white/black key geometry shared by primary and comparison renderers.
- [x] 5.2 Adapt compact note/finger labels without changing MIDI mapping or hiding active keys, and expose complete voicing labels to assistive technology.
- [x] 5.3 Render `Auto` plus only applicable explicit voicing styles and reserve no disabled or empty selector slots.
- [x] 5.4 Stabilize Piano card keyboard/style/metadata heights so sibling cards remain aligned despite different voicing spans and available-style counts.
- [x] 5.5 Verify the comparison remains an accessible modal with only applicable options, contained scrolling, selection/Escape behavior, and focus restoration.
- [x] 5.6 Add unit/component/Playwright coverage for wide voicings, every active key inside card bounds, full keyboard visibility, equal sibling bounds, style filtering, Guitar/Piano switching, and desktop/tablet/375px containment.
- [x] 5.7 Inspect representative triad, seventh, altered/extended, spread, and two-hand Piano cards and commit the Piano-layout milestone.

## 6. Full Validation, Review, and PR #75 Update

- [x] 6.1 Run `npm run build`, `npm run lint`, `npm run test`, strict OpenSpec validation, `git diff --check`, and Worker dry-run packaging on the exact implementation tree.
- [x] 6.2 Run the complete Playwright suite plus repeated focused preset/composer/card/piano suites to distinguish real regressions from environment flakes.
- [x] 6.3 Perform rendered Browser QA in English and Japanese on desktop, then use Playwright for 820px tablet, 500px transition, 375px mobile, and reduced-motion proof; inspect screenshots, focus, console, and overflow directly.
- [x] 6.4 Commission independent correctness, music-theory/color, accessibility, responsive-layout, and specification-conformance reviews; fix every P0–P2 finding and rerun affected/full gates.
- [x] 6.5 Reconcile every acceptance item against current code, rendered evidence, and tests; leave no item marked complete from intent or indirect evidence.
- [x] 6.6 Update OpenSpec task checkboxes and the long-horizon plan/log with exact commits, evidence, risks, and the next merge/archive step.
- [x] 6.7 Push milestone commits to the PR #75 branch, update the PR description/screenshots, and require exact-head GitHub build, Playwright, and Cloudflare checks to pass before handoff.

## 7. Complete Original PR #75 Contract

- [x] 7.1 Replace target-only composer removal with deliberate touch/pen release or actual native mouse drop anywhere outside the composer; keep Escape, pointer cancellation, lost capture, no-drop dragend, and external grid-source paths inert.
- [x] 7.2 Apply the shared chord-family presentation to composer chips, Circle chord labels, and FRET FINDER overlay selection/readout while retaining selection, relationship, score, focus, playback, lock, and Hanz semantics.
- [x] 7.3 Replace the Piano style selector's fixed grid/height with centered content-sized wrapping that reserves no unavailable track or empty row and preserves equal sibling cards.
- [x] 7.4 Keep the media rail exact—`RANDOMIZE (UNLOCKED VOICES)`, icon-backed `PLAY`/`STOP`, icon-backed `SHARE`, and `IMPROV INSIGHT`—with Hanz available only from progression-prompt help.
- [x] 7.5 Unify HASHER, TUNE TOOLBOX, Circle, and in-panel IMPROV controls under the dedicated pale-pink token family while keeping Style neutral and match/degree colors independent.
- [x] 7.6 Color IMPROV scale names and notes through the shared named-degree mapping and prove representative Root, minor-third/Ab, tritone, and other intervals match SCALE SYNTHESIA and FRET FINDER.
- [x] 7.7 Verify the complete four-category vocabulary dialog, display-face scale typography, compact note spacing, aligned <=14rem match meter, centered <=72rem panel, and local Circle/Toolbox open/close focus behavior.
- [x] 7.8 Add or strengthen pure/component/Playwright coverage for arbitrary outside removal and cancellation safety, all-six-family real surfaces, media icons/text, centered partial Piano selector rows, comparison backdrop/no-mutation/no-reflow, IMPROV palette/vocabulary/degree colors, Japanese, reduced motion, and desktop/tablet/375px containment.
- [x] 7.9 Inspect all new desktop/tablet/mobile rendered states and commit composer, global-color/Piano, and IMPROV milestones separately without staging `.agents/` or `AGENTS.md`.

## 8. Full-Contract Validation and PR #75 Delivery

- [x] 8.1 Run production build, lint, all Vitest, strict OpenSpec, diff hygiene, dependency audit, and Worker dry-run on the exact implementation tree.
- [x] 8.2 Run complete Playwright plus three repeated focused composer/color/Piano/IMPROV passes and direct Browser QA in English/Japanese at desktop, tablet, transition, 375px, and reduced motion.
- [x] 8.3 Commission independent correctness, accessibility, responsive, music-color/theory, and specification-conformance reviews; fix every P0–P2 finding and rerun affected/full gates.
- [x] 8.4 Reconcile acceptance rows A1–A18 from direct code/render/test evidence, update the long-horizon plan/log and PR description/screenshots, then push milestone commits.
- [ ] 8.5 Require exact-head GitHub build/test, both complete Playwright jobs, and Cloudflare Workers build to pass before handoff; keep PR #75 draft until the user approves all remaining issues.

## 9. Merge and Archive Boundary

- [ ] 9.1 After PR #75 merges, sync/archive this change and update canonical specs in a separate reviewed documentation boundary.

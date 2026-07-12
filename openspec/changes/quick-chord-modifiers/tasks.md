## 1. Contract and Guidance

- [x] 1.1 Create the proposal, design decisions, and quick-chord-modifiers capability specification.
- [ ] 1.2 Validate the OpenSpec change strictly and query Context7 for current React interaction/state and Playwright accessibility guidance.

## 2. Catalog Alternatives

- [ ] 2.1 Add a pure same-root alternative helper that preserves display spelling and slash bass while revalidating every option through the shared lookup.
- [ ] 2.2 Add family-aware quick ranking for major, minor, dominant, sustained, and other catalog chords without hiding the full alternative set.
- [ ] 2.3 Unit-test C major, G dominant alterations, flat roots, slash bass, current-entry exclusion, ranking, and dictionary membership.

## 3. Accessible Card Interaction

- [ ] 3.1 Build the focused ChordModifier disclosure/search component using existing Tonari tokens and explicit control typography.
- [ ] 3.2 Compose the modifier into ChordCard with pointer, touch, focus, keyboard selection, Escape dismissal, and responsive containment.
- [ ] 3.3 Add component-level behavior coverage for quick selection, search filtering, cancellation, and focus restoration.

## 4. Timeline Mutation

- [ ] 4.1 Add an App-owned one-index replacement callback that marks the timeline mutation, stops playback, and preserves unrelated cards.
- [ ] 4.2 Preserve lock state, clamp only the changed guitar variant, retain or reset only the changed piano style based on applicability, and keep highlight indices aligned.
- [ ] 4.3 Add deterministic regression coverage proving a modifier invalidates a stale in-flight text-agent response.

## 5. Rendered Validation

- [ ] 5.1 Verify the full pointer flow in guitar and piano modes and confirm instrument switching retains the replacement.
- [ ] 5.2 Verify keyboard open/select/Escape focus behavior and search results with accessible locators.
- [ ] 5.3 Validate desktop, tablet, and 375px mobile layouts for clipping, overflow, console errors, and interaction state; inspect screenshots directly.

## 6. Quality and Delivery

- [ ] 6.1 Run build, lint, full Vitest, full Playwright, focused repeated modifier tests, and strict OpenSpec validation.
- [ ] 6.2 Perform an independent code/security/accessibility review and resolve every critical, high, or medium issue.
- [ ] 6.3 Reconcile tasks and long-horizon tracking, commit at significant boundaries, and push `feat/quick-chord-modifiers` without merging to main.

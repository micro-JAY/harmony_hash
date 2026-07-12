## 1. Contract and Guidance

- [x] 1.1 Create the proposal, design decisions, and quick-chord-modifiers capability specification.
- [x] 1.2 Validate the OpenSpec change strictly and query Context7 for current React interaction/state and Playwright accessibility guidance.

## 2. Catalog Alternatives

- [x] 2.1 Add a pure same-root alternative helper that preserves display spelling and slash bass while revalidating every option through the shared lookup.
- [x] 2.2 Add family-aware quick ranking for major, minor, dominant, sustained, and other catalog chords without hiding the full alternative set.
- [x] 2.3 Unit-test C major, G dominant alterations, flat roots, slash bass, current-entry exclusion, ranking, and dictionary membership.

## 3. Accessible Card Interaction

- [x] 3.1 Build the focused ChordModifier disclosure/search component using existing Tonari tokens and explicit control typography.
- [x] 3.2 Compose the modifier into ChordCard with pointer, touch, focus, keyboard selection, Escape dismissal, and responsive containment.
- [x] 3.3 Add component-level behavior coverage for quick selection, search filtering, cancellation, and focus restoration.

## 4. Timeline Mutation

- [x] 4.1 Add an App-owned one-index replacement callback that marks the timeline mutation, stops playback, and preserves unrelated cards.
- [x] 4.2 Preserve stable card identity, display modes, lock state, the clamped guitar variant, compatible piano style, and highlight indices for the changed card.
- [x] 4.3 Add deterministic regression coverage proving a modifier invalidates a stale in-flight text-agent response.

## 5. Rendered Validation

- [x] 5.1 Verify the full pointer flow in guitar and piano modes and confirm instrument switching retains the replacement.
- [x] 5.2 Verify keyboard open/select/Escape focus behavior and search results with accessible locators.
- [x] 5.3 Validate desktop, tablet, and 375px mobile layouts for clipping, overflow, console errors, and interaction state; inspect screenshots directly.

## 6. Quality and Delivery

- [x] 6.1 Run build, lint, full Vitest, full Playwright, focused repeated modifier tests, and strict OpenSpec validation.
- [x] 6.2 Perform an independent code/security/accessibility review and resolve every critical, high, or medium issue.
- [x] 6.3 Reconcile tasks and long-horizon tracking, commit at significant boundaries, and push `feat/quick-chord-modifiers` without merging to main.

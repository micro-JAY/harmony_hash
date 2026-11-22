## Context

See `proposal.md` for motivation. The current tour is internally indexed, makes the application inert, and changes workspaces in its pre-step callback. That combination cannot support a real tab activation because the requested tab is both programmatically bypassed and physically blocked. Discovery already receives read-only progression playback data but not the chord objects required by the existing pure Improv Insight ranker. Fret Finder still owns an independent chord-overlay picker. Appearance is currently expressed through root semantic tokens, except for a small number of canvas and music-label colors that cache or hard-code dark values.

The visual direction was checked against the current Discovery and Fret Finder screenshots with a three-state concept board: a compact Improv Insight strip, a quieter scale layer with direct notes dominant, a materially clearer guitar neck, and a warm-paper light appearance. It is a reference for hierarchy and contrast, not a raster asset to ship.

## Goals / Non-Goals

**Goals:**

- Make the two tour workspace boundaries user-driven and keyboard-operable without weakening the modal behavior of ordinary steps.
- Reuse canonical theory calculations so Hasher Improv Insight and Discovery cannot disagree about scale rankings.
- Keep scale guidance visually subordinate to direct playing and identified-chord feedback on both instruments.
- Establish one persistent semantic appearance state that redraws DOM and canvas content safely.
- Delete the obsolete Fret Finder overlay surface and its now-unreachable state without altering scale-pattern behavior.

**Non-Goals:**

- No new scale-ranking algorithm, key detector, progression editor, recording flow, or backend API.
- No automatic system-theme following; the explicit stored choice is authoritative and Dark remains the fallback.
- No change to Hasher Improv Insight's expanded analysis or to the meaning of Fret Finder's CAGED and 3NPS patterns.
- No broader brand-asset redesign: this change uses the supplied light Harmony Hash mark for the welcome / Help visual and leaves the header and social-card identity unchanged.

## Decisions

### Model workspace handoffs as explicit tour steps

`GuidedTourStep` gains a handoff variant with a destination selector and instruction. Ordinary steps retain the existing spotlight, focus trap, and inert background. A handoff step temporarily becomes non-modal: the overlay root is pointer-transparent, the requested tab remains focusable and receives focus, and the next control/forward-arrow path is withheld. A capture listener observes the real tab activation and advances only after the application's normal workspace callback runs.

This keeps the tour index local and adds the smallest state needed to express a pause. A fully controlled tour index was considered, but it would duplicate restoration and spotlight bookkeeping across `App` and the tour component. Continuing to switch in `onBeforeStep` was rejected because it teaches no navigation and cannot satisfy the requested interaction.

### Keep preparation callbacks local to the destination workspace

`onBeforeStep` may open a Toolbox disclosure or ensure Discovery's instrument is visible, but it does not change a top-level workspace while moving forward. Header tabs receive stable tour selectors. The tour sequence follows the rendered Toolbox order, and new Discovery targets wrap note input/results, Improv Insight, and the loop.

This separation makes a missing target an observable defect rather than silently transporting the user to make it exist.

### Pass immutable progression chords into Discovery and reuse the pure ranker

`App` passes the current indexed chord array to Discovery alongside the existing read-only playback request. A small Discovery adapter calls the existing scale ranker, caps the choices, retains a selected recommendation only while it remains valid, and exposes a pitch-class membership set. No new parser or theory table is introduced.

The selector chooses among recommendations; Highlight is explicit and defaults off so an educational overlay never appears without consent. Both controls remain local UI state and therefore cannot mutate the progression.

### Use one scale-overlay contract for piano and guitar

The renderers receive the selected scale identity and pitch classes rather than knowledge of ranking. A scale membership attribute/class is applied to every matching visible note. CSS establishes the priority order: base instrument, translucent scale tone, root cue, selected note, held/sounding note, visible focus. Accessible labels append scale membership as text.

For guitar, the same refactor also separates physical anatomy from note markers: a visible nut, graduated fret columns, string-weight tokens, fret guides/markers, and larger targets live in the renderer. Internal horizontal scrolling is preserved on narrow screens. Reusing Fret Finder's dense interval palette was considered and rejected because Discovery needs a single quiet recommendation layer, not simultaneous pattern analysis.

### Remove Fret Finder overlay state at the boundary

The picker, selected chord state, overlay props, legend, overlay-only semantics, and unreachable styles/tests are removed from the Fret Finder component boundary. Pure dictionary or interval helpers are removed only when no other consumer remains; pattern and spatial-navigation helpers stay intact.

Hiding the picker while retaining overlay state was rejected because it would leave focus-union behavior and maintenance paths active for a feature that no longer has a user entry point.

### Apply appearance at document root with exception-safe persistence

A small appearance module owns the `dark | light` type, versioned local-storage key, validation, document attribute, `color-scheme`, and theme-color meta value. A tiny pre-render initializer applies the stored value before React mounts; React then owns the same state and writes explicit changes. Storage failures fall back to Dark without escaping.

Help / About renders a labeled two-option Sun/Moon group with 44px controls below its main actions. Changing it does not close the dialog or move focus. `html[data-theme="light"]` overrides semantic tokens; raw instrument anatomy is changed only where contrast requires a theme-specific semantic token. Canvas palettes include the appearance in their invalidation path so an already-mounted Note Neural Network redraws instead of retaining stale colors.

A CSS-only toggle was rejected because it cannot persist, update browser color scheme, or invalidate canvas drawing. Following `prefers-color-scheme` was rejected because it conflicts with the requested explicit toggle and makes the fallback nondeterministic.

## Risks / Trade-offs

- **[Tour handoff accidentally re-enables the whole page]** → Make only the overlay pointer-transparent, focus the named destination, reject nonmatching workspace activations, and cover pointer plus keyboard traversal in browser tests.
- **[Lazy destination target is measured before mount]** → Advance after the normal workspace state update and let the existing target-resolution cycle run on the next frame.
- **[Scale tint competes with white/black keys or note feedback]** → Use a translucent semantic token and explicit state priority; validate both themes in screenshots and computed contrast checks.
- **[Large guitar DOM becomes expensive]** → Memoize pitch membership, keep the fixed visible fret range, and avoid per-position theory calculations during render.
- **[Theme switch leaves stale canvas colors]** → Include appearance in palette construction/redraw dependencies and test a live toggle while the network is mounted.
- **[Deleting overlay code regresses pattern navigation]** → Preserve pure pattern maps and rerun focused Fret Finder keyboard, responsive, and mapping suites after removal.
- **[Theme-specific logo flashes or ships from the source-material folder]** → Keep both welcome marks in the shipped public asset directory, switch them from the root appearance attribute, and verify the correct mark before and after a live toggle.

## Migration Plan

1. Land spec artifacts and implementation together on the feature branch.
2. Add semantic light tokens and startup preference restoration before exposing the Help / About control.
3. Add Discovery scale guidance and renderer states, then remove the redundant Fret Finder overlay code.
4. Replace automatic tour workspace changes with explicit handoff steps and update onboarding copy/translations.
5. Run focused unit/browser suites, full build/lint/tests, dark and light visual baselines, and mobile overflow checks.
6. Roll back by reverting this branch; stored `hh:appearance:v1` values are inert in earlier versions and require no data migration.

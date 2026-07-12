## Context

`ChordReferenceGrid` already resolves every cell through the shared chord dictionary and has a local Off/Diatonic overlay. In Free Input it receives `selectedKey` and `activeGroup.scaleType` from Progression state even though those controls are hidden, so the apparent context is always the preset tab's state (C major by default). The grid is also unmounted after `App` has any rendered chords.

This change extends the existing shared `src/lib/theory/` foundation. It remains a focused interaction inside the current Tonari grid and input language; it does not introduce a new route, global store, provider tool, design token, or generated visual asset.

## Goals / Non-Goals

**Goals:**

- Make Free Input key and mode explicit, independent, persistent across tab switches, and immediately reflected in the chord grid.
- Score every visible catalog chord for key compatibility and, when possible, suitability after the last valid chord in the text input.
- Keep scores deterministic, explainable, pure, and reusable by later Improv Insight, Scale Synthesia, and modal-relationship work.
- Preserve dictionary authority, insertion/undo/focus behavior, responsive scrolling, and current timeline/provider invalidation boundaries.
- Keep the grid responsive while recomputing several hundred candidate scores.

**Non-Goals:**

- Detecting a key automatically, claiming a uniquely correct next chord, or generating chords outside the catalog.
- Adding style/genre priors, reharmonization, tritone substitutions, or song-corpus probabilities.
- Exposing key/mode or suggestions to the ElevenLabs companion in this milestone.
- Changing Progressions-tab transposition controls or the agent response contract.

## Decisions

### 1. Free Input owns an independent harmony context

`ProgressionInput` will add `freeKey` and `freeScaleType` state initialized to C major. Key and Mode selects render only in Free Input and pass a complete context to `ChordReferenceGrid`. Existing `selectedKey` and `activeTonality` remain dedicated to presets.

Sharing the preset state was rejected because changing a hidden control is confusing and violates the existing requirement that each tab preserve its own state. Lifting this context into `App` was rejected because no other runtime surface consumes it yet.

### 2. Score chord tones, then transition quality

The pure theory API will accept catalog `IndexedChord` values and return an integer score, tier, component scores, and short reasons.

- **Key mode:** score equals the percentage of unique candidate chord tones inside the selected seven-note scale.
- **Next mode:** `55% key fit + 30% voice-leading fit + 15% root-motion fit`.
- **Voice-leading fit:** average the shortest pitch-class distance from each candidate tone to any previous-chord tone, then map smaller movement to a higher 0–100 score.
- **Root-motion fit:** perfect-fourth/fifth motion ranks highest, seconds next, thirds/sixths next, chromatic steps lower, repeated root lower, and tritone motion lowest.
- **Dominant resolution:** when a catalog Dominant chord resolves by ascending fourth/descending fifth, expose that as a reason and retain the maximum root-motion score.

This intentionally ranks options rather than asserting harmonic correctness. A hard-coded functional-progression matrix was rejected because its assumptions do not transfer cleanly across all seven supported modes. Random or corpus-derived weights were rejected because results must be deterministic and no new data/service is in scope.

### 3. The text input is the live previous-chord source

The grid will scan the input tokens from right to left and use the last dictionary-valid chord as the `Next` anchor. This makes ranking update immediately when a user types, inserts, or undoes a chord without coupling the input component to `App` timeline state.

Using the rendered card array was rejected because it lags unsaved text edits and would require a new state channel from `App`. Invalid trailing tokens are ignored so one typo does not erase the last usable context; the existing Run action remains responsible for surfacing parse errors.

### 4. Precompute scores once and keep visual semantics token-based

`ChordReferenceGrid` will memoize a score map by primitive key, mode, suggestion mode, and input text. Cells consume the map rather than recomputing theory functions inside nested render loops. Static options and thresholds stay module-level.

Fit is communicated through three redundant cues: numeric percentage, tier label/legend, and token-based background/border/glow. Text and score badges remain at full opacity in every tier, and each cell receives an ARIA label with score and reasons. Existing root colors remain untouched, and no new color tokens are added.

The grid will read the user's reduced-motion preference through Framer Motion's `useReducedMotion`. Panel entrance/exit and cell transitions become immediate when reduction is requested; the content, score evidence, focus order, and insertion behavior remain identical.

### 5. Keep the browser mounted throughout Free Input

The `chordsEmpty` gate will be removed from `ProgressionInput`; the collapsed `Browse chords` control remains below the text field after results render. Inserting a chord still edits the text and focuses the input; pressing Run remains the explicit timeline update boundary, preserving playback and stale-agent invalidation semantics.

Automatic submission on every grid click was rejected because it would unexpectedly replace the timeline, reset compatible per-card state, and make multi-chord drafting slower.

## Risks / Trade-offs

- [A numeric score looks more authoritative than it is] → Label it `fit`, explain the active formula in a concise legend, and expose component reasons rather than claiming correctness.
- [Dense score badges reduce grid readability] → Use compact two-digit badges only while Key/Next is active and validate desktop, tablet, and 375px horizontal-scroll behavior.
- [Low-fit styling makes evidence unreadable] → Never reduce whole-cell opacity; use token backgrounds/borders/glow while keeping chord names and percentages at full contrast.
- [Animation conflicts with reduced-motion preference] → Disable panel and cell transition durations when `prefers-reduced-motion: reduce` is active and assert the rendered behavior in Playwright.
- [Altered chords score lower because intentional outside tones are penalized] → Keep Off mode, preserve all interactions, and describe lower tiers as `color`/`outside` instead of invalid.
- [Typing can trigger many score passes] → Memoize the full map and add a Playwright interaction-latency assertion.
- [Next mode has no previous chord] → Fall back to key score, show `Add a chord to rank what follows`, and never fabricate transition reasons.
- [Voice comments become stale after adding a local theory engine] → Keep the voice tool surface unchanged and update comments to say the companion does not receive this context, rather than claiming the application has no theory scorer.

## Context

The current explorer derives immutable scale rows from instrument, tuning, root, and mode, then renders every scale position through one handedness-aware visual fret sequence. The chord catalog already owns symbol lookup, aliases, note parsing, and enharmonic display rules, but the fretboard does not consume those chord semantics. This change adds a second, orientation-neutral pattern axis and an orthogonal dictionary chord overlay without changing the existing scale-position contract or lifting local explorer state into the progression builder.

The primary control rail is intentionally dense after tuning and handedness shipped. Pattern and overlay controls therefore need their own compact learning-layer surface beneath the primary controls. No new dependency, route, provider tool, persisted format, or design token is required.

## Goals / Non-Goals

**Goals:**

- Make `All` exactly equivalent to the current complete scale map.
- Provide musically explicit C, A, G, E, D forms and seven three-notes-per-string positions for Standard six-string guitar.
- Keep pattern membership numeric-fret based and identical under right- and left-handed presentation.
- Resolve every overlay selection through the shared dictionary and show both scale intersections and chromatic chord tones.
- Preserve alternate tunings, bass maps, explorer state, builder state, companion continuity, keyboard navigation, responsive containment, reduced motion, and the 500ms interaction budget.

**Non-Goals:**

- CAGED or 3NPS claims for bass, alternate/custom tunings, capo positions, extended-range instruments, or non-heptatonic scales.
- Fingering numbers, picking direction, tablature, playable chord voicings, chord-shape diagrams, or scale/chord playback.
- Timeline-synchronized overlays, automatic key changes, progression editing, URL persistence, or cross-session preference storage.

## Decisions

### Keep scale mapping, pattern membership, and chord membership separate

`buildFretboardRows()` remains the source of scale position truth and keeps `isScaleTone` behavior unchanged. A sibling pure pattern module returns frozen stable `stringNumber:fret` keys plus per-string fret envelopes. A chord-tone helper returns frozen pitch-class/degree records. A final pure decoration step combines those three axes for rendering.

This separation keeps `All` behavior-identical, prevents pattern logic from leaking into tuning math, and lets future views consume chord-tone classification without depending on React. The rendering edge may build local `Set`/`Map` indexes for lookup speed, but exported results remain frozen arrays because freezing a JavaScript `Set` does not prevent mutation.

Alternative considered: add `isPatternTone` and chord fields directly while building every base position. Rejected because patterns and overlays are optional view state and would make the otherwise reusable scale map depend on UI-specific selections.

### Model CAGED as data-backed form envelopes

Five immutable Standard-guitar templates describe C, A, G, E, and D form root anchors and per-string relative fret envelopes. The pure engine transposes a form to the selected root, considers octave-equivalent placements within frets 0–15, and deterministically chooses the placement with the most visible template coordinates, then the least clipping, lowest visible fret, and serialized coordinate order. It fills the selected scale's tones inside that form envelope; the form name identifies its tonic framework rather than asserting that every selected mode uses a major tonic chord.

CAGED is explicitly unavailable outside Standard six-string guitar. The UI shows the reason and uses effective `All` while retaining the last CAGED form for restoration when compatibility returns.

Alternative considered: label a generic four-fret rectangle as CAGED. Rejected because it would look plausible while teaching the wrong system.

### Generate 3NPS positions from absolute pitch

Each tuning string gains an immutable absolute open pitch alongside its existing pitch class. For the seven shipped heptatonic formulas, the 3NPS engine traverses Standard guitar from lowest to highest physical string, selects three consecutive scale degrees per string for the chosen start degree, and ranks complete octave-equivalent candidates by smallest total fret span, smallest adjacent-string shift, lowest minimum fret, then serialized coordinates. A valid result contains exactly three positions per string within frets 0–15 and strictly ascending absolute pitches; otherwise it is explicitly unavailable rather than showing a clipped pseudo-3NPS shape.

The UI labels positions as `Starts on degree 1` through `Starts on degree 7`, avoiding claims that choosing a position changes the current mode. CAGED/3NPS compatibility remains Standard guitar only in this version even though absolute pitches make later tuning-aware expansion possible.

Alternative considered: hand-author seven fixed major-scale masks. Rejected because it would not generalize correctly to harmonic minor's augmented second or the other shipped modes.

### Use shared dictionary identity for overlay selection

The picker derives a frozen unique catalog list from shared chord entries rather than iterating the alias-heavy exported lookup map. Search matches display name, long name, and aliases, renders at most 24 results, and re-resolves the chosen label through `lookupChord()` before storing `{ chord: IndexedChord, displayName }`. Flat display roots and true slash basses follow the same spelling/identity rules as quick chord modifiers.

A pure chord-tone helper pairs `parseNotes()` output with catalog step labels, normalizes pitch classes through the shared theory utilities, includes a distinct slash bass when needed, rejects malformed dictionary data explicitly, deduplicates tones, and freezes the result. Existing private chord-pitch-class logic in harmonic suggestions will be extracted or reused rather than reimplemented.

Alternative considered: accept arbitrary text and parse chord formulas locally. Rejected because it would diverge from the guitar/piano dictionary and could display chords the rest of Harmony Hash cannot render.

### Keep overlay semantics orthogonal to the selected pattern

With `All`, every selected chord tone is shown at every matching position from open strings through fret 15. With CAGED or 3NPS, in-scale chord tones appear where the pattern exposes that scale tone; outside-scale chord tones appear only inside each pattern's per-string fret envelope. This preserves the focused shape while still revealing altered tones such as the `#9` of `G7#9` over C Major.

In-scale chord tones retain the existing degree fill and add a strong outer ring. Outside-scale chord tones use an existing warm/warning surface, a dashed border, and their note name even in Intervals mode because no selected-scale interval exists. Accessible names append chord degree and `in scale` or `outside <root> <mode>`; the legend states the ring and dashed meanings so color is never the only cue.

Alternative considered: show only chord/scale intersections. Rejected because it hides the chromatic alterations that make the overlay educational.

### Keep interaction state local and rendering derived

`FretboardExplorer` owns pattern family, remembered CAGED/3NPS sub-selection, overlay picker disclosure, and selected chord. Pure rows, pattern results, search results, tone classification, and legends are derived during render or memoized from primitive dependencies. Effects remain limited to external focus restoration and existing scroll synchronization. Pattern or overlay changes resolve the roving focus key to the first surviving semantic position when the prior target disappears.

The overlay persists across root, mode, tuning, handedness, labels, instrument, and pattern changes. Switching into an incompatible pattern context uses effective `All` with a visible status but does not erase remembered choices or mutate builder state.

## Risks / Trade-offs

- [CAGED sources disagree on boundary notes] → choose one documented template catalog, encode explicit root anchors/envelopes, and lock every form with fixture tests.
- [3NPS can look correct while violating ascending pitch] → include absolute open pitches and require three notes per string plus strict whole-shape ascent in exhaustive tests.
- [Pattern filtering can strand keyboard focus] → derive the valid roving key from the visible scale/chord union and regression-test every family transition.
- [Overlay tones can overwhelm a focused pattern] → limit chromatic tones to the active pattern envelope while leaving `All` exhaustive.
- [Alias-heavy search can duplicate results] → search unique entry identities, cap visible results at 24, and re-resolve selection through the shared lookup.
- [New controls can crowd the primary rail] → render a separate wrapping learning-layer surface and assert desktop, 820px tablet, and 375px containment.
- [Cross-platform screenshot wrapping can recur] → use deterministic layout gaps/widths and retain structural assertions alongside inspected baselines.
- [Large derived maps can regress responsiveness] → use stable indexes at the rendering edge and assert pattern, overlay, key/mode, and orientation updates below 500ms.

## Migration Plan

The change is additive and stacked on the tuning/handedness branch. Existing users default to `All` with no chord overlay, producing the current fretboard exactly. Rollback removes the new learning-layer controls and pure helpers without data migration or API changes. Canonical specs are updated and the change is archived only after its stacked PR merges.

## Open Questions

None. Pattern compatibility, overlay visibility, focus behavior, and non-goals are fixed by this design; exact fixture coordinates will be reviewed against the selected music-theory references before implementation.

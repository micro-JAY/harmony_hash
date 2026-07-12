## Context

Phase 2.8 v1 introduced a pure standard-tuning map and a lazy-loaded horizontal guitar/bass explorer. The current tuning helper branches only on instrument and the renderer assumes fret numbers increase left-to-right. Pattern filtering and chord overlays must not land until tuning identity and visual handedness are first-class, deterministic inputs.

## Goals / Non-Goals

**Goals:**
- Represent every supported tuning as immutable typed data with stable ids and high-to-low visual strings.
- Recompute every pitch position from the selected tuning without duplicating scale theory.
- Give guitar and bass independent remembered tuning selections.
- Mirror the entire fret axis for left-handed presentation, including headers, cells, markers, keyboard navigation, and initial mobile scroll position.
- Preserve existing scale labels, colors, accessibility, performance, companion continuity, and builder state.

**Non-Goals:**
- Custom user-entered tunings, 5/6-string bass, 7/8-string guitar, capo/transposition, or persisted preferences.
- Reversing high-to-low string order; handedness changes the neck axis, not string numbering.
- CAGED/3NPS filtering, chord overlays, or playback.

## Decisions

### Use an immutable discriminated tuning catalog

`fretboard.ts` will expose frozen `FretboardTuning` records keyed by stable ids. Each record carries instrument, user-facing label, compact pitch sequence, and frozen high-to-low string definitions. `buildFretboardRows` receives a tuning id and fails explicitly if it does not belong to the requested instrument.

Alternative considered: patch only the low string for Drop D inside React. Rejected because it cannot scale to Open G/DADGAD/BEAD, weakens tests, and would make later overlays depend on UI state.

### Keep per-instrument tuning state in one typed record

The explorer will store `{ guitar, bass }` tuning ids. Switching instruments selects that instrument's remembered tuning rather than resetting or applying an incompatible id. State remains local to Fretboard and does not mutate the builder.

Alternative considered: one tuning id reset to Standard on every instrument change. Rejected because it needlessly discards deliberate user choices during comparison.

### Treat handedness as visual column order

Theory rows always retain numeric fret order 0–15. The renderer derives `visualFrets`: ascending for right-handed and descending for left-handed. Headers, positions, alternating lane treatments, and markers consume that same order. This keeps the engine orientation-neutral and prevents pitch math from diverging.

### Navigate from rendered row order

Horizontal arrow movement will use each row's rendered active-position sequence rather than comparing fret numbers. ArrowLeft selects the preceding visual note; ArrowRight selects the following visual note. Vertical movement still chooses the closest numeric fret on the adjacent string because fret alignment is identical across rows.

### Synchronize the mobile scroll edge deliberately

The scroll container is an external browser system, so a layout effect will move it to scrollLeft 0 for right-handed mode and its maximum scroll for left-handed mode whenever handedness changes. Focus-driven scrolling remains `auto` and reduced-motion-safe.

## Risks / Trade-offs

- [Left-handed layout can show the wrong edge initially on mobile] → synchronize after layout and assert the open-string column is visible at the right edge.
- [Tuning ids can be paired with the wrong instrument] → validate catalog membership and throw a precise error in the pure helper.
- [Changing tuning can leave roving focus on a no-longer-active pitch] → continue deriving the valid focus key from current rows.
- [More controls can crowd mobile] → retain the existing wrapping control rail and document-width assertions.
- [Open tuning names can hide their actual pitches] → display both the label and compact pitch sequence in the control/readout.

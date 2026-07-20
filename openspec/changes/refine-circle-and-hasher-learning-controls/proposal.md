## Why

THE CIRCLE still presents relationship strength through decorative marks, offers only two nearby-key shortcuts, and appears before the primary Scale Synthesia tool. HASHER keeps its instrument selector in an overloaded global header and does not carry the shared musical degree colors into its Guitar and Piano chord views, making two learning surfaces feel disconnected from the rest of Harmony Hash.

## What Changes

- Reorder TUNE TOOLBOX as Scale Synthesia, THE CIRCLE, then Note Neural Network, with Scale Synthesia as the initial expanded tool.
- Rename the English tool heading to `THE CIRCLE` while retaining the localized Japanese name and the generic music-theory phrase “circle of fifths” where it is explanatory copy.
- Remove decorative dotted modulation arcs and relationship swatches from THE CIRCLE, while retaining explicit Strong, Medium, and Weak text in a stable aligned layout.
- Normalize enharmonic labels with balanced parentheses and add practical Popular modes and Common key changes guidance with concrete musical examples.
- Move HASHER’s Guitar/Piano selector from the global header to the Browse chords / Undo output toolbar and place a compact, wrapping note-degree color legend beside it.
- Simplify the Help/About and EN/JP header utilities without changing their behavior, accessibility, or the centered workspace navigation.
- Apply the shared FRET FINDER / Scale Synthesia interval colors to playable Guitar and Piano chord tones while preserving fingering, note labels, voicings, playback, modifiers, and chord-family colors.
- Keep NOTE NEURAL NETWORK, FRET FINDER, Worker/API behavior, progression generation, and timeline transactions outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `theory-workspace`: Change Toolbox order/naming and make THE CIRCLE’s relationship display and advanced-learning guidance clearer and more useful.
- `app-shell`: Move the builder-only instrument control out of the global header and refine the remaining help/language utility grouping without disturbing centered navigation.
- `progression-input`: Add the instrument selector and note-degree legend to the responsive Browse/Undo toolbar before chord output.
- `chord-card-display`: Render active Piano chord tones with the shared interval-color system while preserving voicing behavior and fixed card geometry.
- `guitar-display-mode`: Render Guitar fingering, interval, and note surfaces with the shared chord-degree colors while preserving every label mode and variant.

## Impact

- Affects `src/components/TheoryWorkspace.tsx`, `src/components/CircleOfFifths.tsx`, Circle-specific pure theory helpers, HASHER header/input/output controls, Guitar/Piano chord renderers, scoped CSS, localization, and focused tests.
- Reuses existing Harmony Hash interval tokens and existing callback/state ownership; no dependency, data schema, Worker, or API change is required.
- Does not alter NOTE NEURAL NETWORK implementation or FRET FINDER source, behavior, or presentation.

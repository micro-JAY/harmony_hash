## Why

The guitar chord display in Harmony Hash currently renders static SVG images with no ability to see interval or note-name information. Piano mode already has a Notes/Fingering toggle. Guitar players need the same ability to see what notes and intervals they're playing to develop harmonic understanding.

## What Changes

- Add `GuitarDisplayMode` type ("fingering" | "intervals" | "notes") to shared types
- Create a guitar SVG parser utility that fetches SVG text, parses circle elements to identify finger dots, maps each dot to a pitch class using string tuning + fret position
- Create `GuitarChordDiagram` component that renders inline SVG with optional note/interval labels overlaid on finger dots, with root dots highlighted in accent color
- Wire the new component into ChordCard's guitar branch with a 3-way pill toggle matching the existing piano toggle pattern
- Remove the CSS `filter: invert(...)` from the old `<img>` approach (no longer needed with inline SVG)

## Capabilities

### New Capabilities
- `guitar-display-mode`: 3-way display toggle (Fingering/Intervals/Notes) for guitar chord diagrams with inline SVG rendering, dot-to-note mapping, and root highlighting

### Modified Capabilities

_(None — piano branch and existing guitar variant cycling are untouched)_

## Impact

- **Files added:** `src/lib/guitarSvgParser.ts`, `src/components/GuitarChordDiagram.tsx`
- **Files modified:** `src/lib/types.ts` (new type), `src/components/ChordCard.tsx` (wire new component + toggle)
- **No new dependencies** — uses native `fetch()` and `DOMParser`
- **No changes to:** `PianoKeyboard.tsx`, `PianoDisplayMode`, piano rendering branch

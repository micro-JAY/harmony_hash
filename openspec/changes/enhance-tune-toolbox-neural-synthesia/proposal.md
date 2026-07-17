## Why

Scale Synthesia currently offers only two arpeggio shapes at one implicit playback speed, while duplicated handoff actions make the collapsible Toolbox hierarchy noisy. Note Neural Network exposes the right theory data, but its row-based layout leaves the active scale off-center, buries nodes behind crossing connectors, and changes context on a single click instead of supporting deliberate exploration.

## What Changes

- Expand Scale Synthesia with musically useful arpeggio patterns and selectable `1/16`, `1/8`, `1/4`, `1/2`, and whole-note lengths, scheduled against an internal 120 BPM, 4/4 clock that is not shown to the user.
- Keep the Scale Synthesia transport label material-neutral as `PLAY` (and `STOP` while active), remove the duplicate collapsed-header handoff, and rename the one expanded handoff to `HASH it`.
- Remove the duplicate collapsed-header Circle action; rename the expanded Circle handoffs to `HASH it` and `IMPROV INSIGHT`.
- Rebuild the desktop Note Neural Network canvas around a centered active scale with readable radial scale/chord relationships, bounded controls, animated outward entry, and a true-black canvas.
- Require a double click (or the keyboard semantic equivalent) on a related scale to make it the new center; a single click on a related chord changes only the existing detail panel.
- Render a simplified, static, resource-light mobile graph while keeping scale information on the right at desktop and the existing information/semantic panel below the graph.
- Preserve the shared TUNE TOOLBOX context and explicitly leave HASHER and FRET FINDER source, behavior, and presentation unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `theory-workspace`: Extend Scale Synthesia practice timing and arpeggio behavior, simplify Toolbox action placement/copy, and replace Note Neural Network's clustered rows with deliberate desktop radial and mobile static interaction contracts.

## Impact

- Affects TUNE TOOLBOX components and shared theory helpers under `src/components/ScaleSynthesia.tsx`, `src/components/CircleOfFifths.tsx`, `src/components/TheoryWorkspace.tsx`, `src/components/NoteNeuralNetwork.tsx`, and `src/lib/theory/`.
- Extends existing English/Japanese Toolbox copy and focused Vitest/Playwright coverage.
- Does not add a runtime dependency, change Worker/API routes, or modify HASHER/FRET FINDER components.

## Why

Scale Synthesia currently offers only two arpeggio shapes at one implicit playback speed, while duplicated handoff actions make the collapsible Toolbox hierarchy noisy. Note Neural Network exposes the right theory data, but its row-based layout leaves the active scale off-center, buries nodes behind crossing connectors, and changes context on a single click instead of supporting deliberate exploration.

## What Changes

- Expand Scale Synthesia with musically useful arpeggio patterns and selectable `1/16`, `1/8`, `1/4`, `1/2`, and whole-note lengths, scheduled against an internal 120 BPM, 4/4 clock that is not shown to the user.
- Keep the Scale Synthesia transport label material-neutral as `PLAY` (and `STOP` while active), remove the duplicate collapsed-header handoff, and rename the one expanded handoff to `HASH it`.
- Remove the duplicate collapsed-header Circle action; rename the expanded Circle handoffs to `HASH it` and `IMPROV INSIGHT`.
- Rebuild the desktop Note Neural Network as a native high-DPI canvas with a lightweight force simulation: many-body repulsion, edge springs, center gravity, velocity damping, and a centered active scale on a true-black surface.
- Add fluid node dragging that leaves the rest of the graph physically active, empty-canvas panning, cursor-centered wheel zoom, and first-degree hover emphasis while retaining the existing Harmony Hash node/relationship colors.
- Require a double click (or the keyboard semantic equivalent) on a related scale to make it the new center; a single click on a related chord changes only the existing detail panel.
- Render a simplified, static, resource-light mobile graph while keeping scale information on the right at desktop and the existing information/semantic panel below the graph.
- Grow Note Neural Network progressively: inspection selects one concept, expansion appends a bounded scale/chord/note neighborhood without discarding prior exploration, and an explicit Make Center action is the only operation that replaces the shared scale context.
- Add advanced theory evidence, distinct node-kind cues, truthful Strong/Medium/Weak rendering, long-press plus accessible pin/unpin controls, and a complete localized help dialog for graph concepts and interactions.
- Preserve the shared TUNE TOOLBOX context and explicitly leave HASHER and FRET FINDER source, behavior, and presentation unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `theory-workspace`: Extend Scale Synthesia practice timing and arpeggio behavior, simplify Toolbox action placement/copy, and replace Note Neural Network's rigid desktop projection with fluid canvas physics while retaining the mobile static interaction contract.

## Impact

- Affects TUNE TOOLBOX components and shared theory helpers under `src/components/ScaleSynthesia.tsx`, `src/components/CircleOfFifths.tsx`, `src/components/TheoryWorkspace.tsx`, `src/components/NoteNeuralNetwork.tsx`, the focused desktop canvas renderer, and `src/lib/theory/`.
- This force-canvas continuation changes only Note Neural Network source, theory helpers, localization, and focused tests; the already delivered Scale Synthesia/Circle work and all HASHER/FRET FINDER source remain untouched.
- The progressive-knowledge continuation remains Note Neural Network-only and SHALL NOT change the shared relationship catalog consumed by THE CIRCLE.
- Extends existing English/Japanese Toolbox copy and focused Vitest/Playwright coverage.
- Does not add a runtime dependency, change Worker/API routes, or modify HASHER/FRET FINDER components.

## Context

TUNE TOOLBOX already lazy-loads Circle of Fifths, Scale Synthesia, and Note Neural Network over one shared theory context. The current Scale Synthesia sequence builder treats arpeggios as two hard-coded index sets and the component always schedules notes with the same `0.34s` spacing. Circle and Scale also expose actions in both their collapsible headers and expanded bodies. Note Neural Network consumes the correct shared relationship catalog, but its pure layout stacks the selected scale above clustered rows; its SVG single-click handler immediately mutates the shared root/scale, and the same interactive/pannable surface is used on mobile.

The supplied screenshots are information-architecture references. The existing Tonari tokens and component language remain authoritative everywhere except the graph canvas, which the user explicitly requires to be true black. The surrounding scale detail stays at desktop right, and the semantic node/information path stays below the graph.

## Goals / Non-Goals

**Goals:**

- Add several clear arpeggio shapes plus exact musical note-length choices without exposing tempo or meter controls.
- Make the expanded tool body the single owner of Circle/Scale handoff actions and use the requested concise copy.
- Center the active scale in a deterministic radial desktop graph, animate satellites outward once per context change, and keep connectors behind bounded node labels.
- Separate inspection from activation: single click inspects any node; double click recenters a scale/key node; chord inspection never changes shared theory context.
- Replace the mobile interactive graph with a bounded static projection while retaining the complete semantic list/detail path.
- Preserve HASHER and FRET FINDER code and behavior and add explicit regression/scope checks.

**Non-Goals:**

- No user-visible tempo, time-signature, swing, loop, or metronome controls.
- No free-running force simulation, physics dependency, WebGL/canvas dependency, or graph persistence outside the existing session state.
- No redesign of the shared context rail, right-hand scale detail, lower semantic list, HASHER, FRET FINDER, or unrelated IMPROV presentation.
- No merge/deploy until the feature branch has passed review and exact-head CI; OpenSpec archive remains a post-merge boundary.

## Decisions

### Immutable arpeggio and timing definitions

Extend the shared scale catalog with immutable pattern definitions for Triad (`1 3 5`), Seventh (`1 3 5 7`), Sixth (`1 3 5 6`), Sus2 (`1 2 5`), and Sus4 (`1 4 5`). The existing pure sequence builder remains the source of note spelling and MIDI values. An immutable note-length catalog maps `1/16`, `1/8`, `1/4`, `1/2`, and `1` to `0.25`, `0.5`, `1`, `2`, and `4` quarter-note beats. At the internal constant of 120 BPM, those onsets are spaced by `0.125s`, `0.25s`, `0.5s`, `1s`, and `2s`; event gates remain slightly shorter than the onset spacing for articulation.

This keeps meter/tempo truthful and testable without adding visible controls that the user explicitly excluded. The length selector appears only for arpeggio material; ordinary scale playback retains its existing pacing.

### Expanded bodies own handoff actions

Remove the optional action slot from the collapsible `TheoryToolSection` headers. Scale Synthesia retains exactly one expanded `HASH it` action. Circle retains exactly one expanded `HASH it` action and one expanded `IMPROV INSIGHT` action. Existing callbacks and focus-return identifiers remain unchanged, so this is copy/placement cleanup rather than a routing rewrite.

### Pure deterministic radial geometry

Replace row/cluster placement inside `buildNoteNetworkLayout` with deterministic polar placement. The selected context node is fixed at the exact canvas center. Scale/key satellites occupy an inner elliptical ring; chord satellites occupy an outer ring. Stable sorting and fixed start angles make repeated contexts byte-for-byte deterministic. Existing rectangle-boundary edge termination remains the single connector implementation, and collision/bounds tests cover the final geometry.

No force-graph package is added: deterministic geometry is cheaper, testable, and avoids continuing layout drift. The desktop canvas retains bounded pan/zoom/reset controls for dense contexts.

### Inspection and context activation are separate transactions

`inspectedNodeId` is local presentation state keyed to the current catalog. Single click, Space, or arrow-list traversal changes only the detail panel. Double click on a graph scale/key node, or Enter on its semantic-list button, commits its root/scale/family to the shared Toolbox context, resets the viewport, and rebuilds the radial graph with that node centered. Chord nodes never commit root/scale context and only populate chord details.

### Static mobile projection

At the existing small-screen boundary, render no pan/zoom toolbar and attach no pointer handlers to the SVG. A pure projection keeps the centered scale plus up to six strongest scale/key relationships and four representative chord relationships, laid out on fixed rings inside a roughly square true-black canvas. The complete node inventory remains in the semantic list below, so resource reduction does not remove accessible information. Reduced-motion desktop renders directly at final positions; mobile is always static regardless of motion preference.

### Visual and performance boundary

Use literal `#000` only on the graph-canvas surface as the explicit user-approved design-system exception. All nodes, text, controls, borders, detail panels, focus states, and chord-family meanings continue to use existing semantic tokens. Node entry uses the existing motion dependency and stops after the context transition; it does not animate continuously.

## Risks / Trade-offs

- **[Risk] Radial labels collide at narrow desktop/tablet widths.** → Bound node sizes, use separate rings, test 1280/820 widths, and switch to the static projection at the mobile breakpoint.
- **[Risk] Double click is undiscoverable or inaccessible.** → Add localized instruction text and use Enter as the semantic-list activation equivalent while Space/single click remains inspection.
- **[Risk] Single-click inspection accidentally mutates the shared context.** → Split inspect and center functions and assert the shared Root/Scale controls remain unchanged after chord and scale single clicks.
- **[Risk] Long note lengths make tests or collapse cleanup flaky.** → Test pure schedules directly, stub AudioContext in browser tests, and retain the existing immediate stop-on-collapse cleanup.
- **[Risk] Mobile still pays for the desktop graph.** → Select one layout/render path from a small viewport subscription and do not mount desktop controls or animated SVG groups on mobile.
- **[Risk] Scope leaks into HASHER/FRET FINDER.** → Stage explicit files, assert their source paths are unchanged from the branch base, and run their existing focused plus full browser regressions.


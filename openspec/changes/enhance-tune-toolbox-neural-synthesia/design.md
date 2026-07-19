## Context

TUNE TOOLBOX already lazy-loads Circle of Fifths, Scale Synthesia, and Note Neural Network over one shared theory context. The first part of this change completed the Scale Synthesia timing/action work and replaced the old clustered Note Neural Network with a centered radial SVG plus a static mobile projection. That graph corrected hierarchy and activation semantics, but its fixed rectangular nodes and deterministic spokes still feel rigid, leave connectors visually prominent behind labels, and cannot reproduce the elastic exploration shown in the supplied Obsidian graph reference.

The supplied screenshots are information-architecture references. The existing Tonari tokens and component language remain authoritative everywhere except the graph canvas, which the user explicitly requires to be true black. The surrounding scale detail stays at desktop right, and the semantic node/information path stays below the graph.

## Goals / Non-Goals

**Goals:**

- Add several clear arpeggio shapes plus exact musical note-length choices without exposing tempo or meter controls.
- Make the expanded tool body the single owner of Circle/Scale handoff actions and use the requested concise copy.
- Center the active scale in a native high-DPI desktop canvas and let related nodes spread through a small custom force simulation with smooth settling.
- Support direct node dragging with elastic network response, empty-canvas panning, cursor-centered wheel zoom, and first-degree hover isolation.
- Separate inspection from activation: single click inspects any node; double click recenters a scale/key node; chord inspection never changes shared theory context.
- Replace the mobile interactive graph with a bounded static projection while retaining the complete semantic list/detail path.
- Preserve HASHER and FRET FINDER code and behavior and add explicit regression/scope checks.

**Non-Goals:**

- No user-visible tempo, time-signature, swing, loop, or metronome controls.
- No third-party physics/graph dependency, WebGL renderer, persisted graph coordinates, or user-facing force-tuning controls.
- No animated, draggable, pannable, or zoomable graph on mobile.
- No redesign of the shared context rail, right-hand scale detail, lower semantic list, HASHER, FRET FINDER, or unrelated IMPROV presentation.
- No merge/deploy until the feature branch has passed review and exact-head CI; OpenSpec archive remains a post-merge boundary.

## Decisions

### Immutable arpeggio and timing definitions

Extend the shared scale catalog with immutable pattern definitions for Triad (`1 3 5`), Seventh (`1 3 5 7`), Sixth (`1 3 5 6`), Sus2 (`1 2 5`), and Sus4 (`1 4 5`). The existing pure sequence builder remains the source of note spelling and MIDI values. An immutable note-length catalog maps `1/16`, `1/8`, `1/4`, `1/2`, and `1` to `0.25`, `0.5`, `1`, `2`, and `4` quarter-note beats. At the internal constant of 120 BPM, those onsets are spaced by `0.125s`, `0.25s`, `0.5s`, `1s`, and `2s`; event gates remain slightly shorter than the onset spacing for articulation.

This keeps meter/tempo truthful and testable without adding visible controls that the user explicitly excluded. The length selector appears only for arpeggio material; ordinary scale playback retains its existing pacing.

### Expanded bodies own handoff actions

Remove the optional action slot from the collapsible `TheoryToolSection` headers. Scale Synthesia retains exactly one expanded `HASH it` action. Circle retains exactly one expanded `HASH it` action and one expanded `IMPROV INSIGHT` action. Existing callbacks and focus-return identifiers remain unchanged, so this is copy/placement cleanup rather than a routing rewrite.

### Native high-DPI canvas renderer

Desktop uses one native `<canvas>` owned through a React ref. A `ResizeObserver` measures its CSS box, and the backing store is resized to `cssWidth × devicePixelRatio` by `cssHeight × devicePixelRatio` before the 2D context is reset into CSS-pixel coordinates. Rendering stays imperative: simulation positions, velocities, pointer state, camera offsets, hover state, resolved CSS colors, and animation-frame identifiers live in refs rather than React state. React remains responsible for theory context, inspected details, localization, semantic controls, and the mobile branch.

The canvas retains literal `#000` as the already approved graph-only design-system exception. Edges render first, then glowing connection-weighted circles, then bounded labels, so connectors never visually cover nodes or their text. Existing Harmony Hash scale, relationship, and chord-family tokens are resolved from computed CSS custom properties rather than replaced by a new palette.

### Fixed-step force simulation

Add a small mutable physics module specialized to the existing relationship catalog; do not add a graph package. Nodes seed deterministically near the selected center, then each fixed 60 Hz step applies:

- pairwise Coulomb-style repulsion to every node pair;
- Hooke-style spring attraction along catalog edges, with stronger relationships using shorter target distances;
- gentle center gravity that keeps the full network within the working area;
- collision separation derived from the connection-weighted circle radius and bounded label footprint;
- velocity decay of `0.88` plus boundary containment so motion settles without perpetual jitter.

The active scale is anchored at the exact world center whenever it is not being dragged. The animation loop remains alive while the desktop graph is active, but the solver sleeps after a measured low-energy window and wakes on resize, context change, drag, pan, or zoom. When the component is collapsed, unmounted, or the document is hidden, work pauses and resumes without accumulating a large time delta. Reduced motion advances a deterministic warm-up immediately and renders the settled result without animated travel.

### Pointer physics and camera

Pointer hit-testing converts client coordinates through `panX`, `panY`, and `scale` into world coordinates and checks circle distance. Dragging a node captures the pointer, writes its world position directly, zeroes its velocity, and keeps every other node in the live solver; release returns the node to normal physics, with the active scale restoring its center anchor. Dragging empty canvas space changes camera pan only. A non-passive wheel listener prevents accidental page scrolling over the graph and changes scale around the cursor's world point, so the musical location under the pointer does not jump. Existing toolbar buttons call the same camera operations for an accessible non-wheel alternative.

### Hover neighborhood emphasis

The hovered node and its first-degree neighbors/edges render at full brightness with a stronger glow; unrelated nodes and edges dim but remain visible. Node radius is a bounded function of catalog degree, so more connected concepts are visibly more important without changing their semantic color. Hover is transient ref state and must not mutate the selected details or shared Root/Scale context.

### Inspection and context activation are separate transactions

`inspectedNodeId` is local presentation state keyed to the current catalog. A click produced by a pointer release below the drag threshold, Space, or arrow-list traversal changes only the detail panel. Double click on a canvas scale/key node, or Enter on its semantic-list button, commits its root/scale/family to the shared Toolbox context, resets the camera, and rebuilds the force graph with that node centered. Chord nodes never commit root/scale context and only populate chord details.

### Static mobile projection

At the existing small-screen boundary, keep the current static SVG projection, render no pan/zoom toolbar, and attach no graph pointer handlers. A pure projection keeps the centered scale plus up to six strongest scale/key relationships and four representative chord relationships, laid out on fixed rings inside a roughly square true-black surface. The complete node inventory remains in the semantic list below, so resource reduction does not remove accessible information. Mobile never initializes the canvas solver regardless of motion preference.

### Visual and performance boundary

Use literal `#000` only on the graph surface as the explicit user-approved design-system exception. All nodes, text, controls, borders, detail panels, focus states, and chord-family meanings continue to use existing semantic tokens. The physics engine is dependency-free, O(n²) over the current small catalog, fixed-step, allocation-light inside the hot loop, and ref-driven so frames do not trigger React renders.

## Risks / Trade-offs

- **[Risk] Force labels collide at narrow desktop/tablet widths.** → Include bounded label footprints in collision separation, keep labels above masked connector layers, test 1280/820 widths, and retain the static projection at the mobile breakpoint.
- **[Risk] A continuous loop consumes CPU after the graph settles or while collapsed.** → Sleep the solver after a low-energy window, pause while inactive/hidden, resume on interaction, and assert frame/energy behavior in browser tests.
- **[Risk] Pointer gestures conflict with document scrolling.** → Enable gesture capture only on the desktop canvas, use pointer capture for active drags, attach wheel as non-passive only to the canvas, and leave mobile to native page scrolling.
- **[Risk] Double click is undiscoverable or inaccessible.** → Add localized instruction text and use Enter as the semantic-list activation equivalent while Space/single click remains inspection.
- **[Risk] Single-click inspection accidentally mutates the shared context.** → Split inspect and center functions and assert the shared Root/Scale controls remain unchanged after chord and scale single clicks.
- **[Risk] Long note lengths make tests or collapse cleanup flaky.** → Test pure schedules directly, stub AudioContext in browser tests, and retain the existing immediate stop-on-collapse cleanup.
- **[Risk] Mobile still pays for the desktop graph.** → Select one layout/render path from a small viewport subscription and do not mount desktop controls or animated SVG groups on mobile.
- **[Risk] Scope leaks into HASHER/FRET FINDER.** → Stage explicit files, assert their source paths are unchanged from the branch base, and run their existing focused plus full browser regressions.

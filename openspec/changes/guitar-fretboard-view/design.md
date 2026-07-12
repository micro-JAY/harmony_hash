## Context

The existing app has one progression-builder workspace and a guitar chord-shape renderer, but no full-instrument scale surface. `src/lib/theory/scaleBasics.ts` already owns the seven shipped mode formulas, note normalization, and pitch-class membership. The new view must reuse those primitives, preserve the builder's stateful voice/playback bridge, follow Tonari tokens, avoid new dependencies, and stay practical on a 375px viewport despite a naturally wide instrument.

## Goals / Non-Goals

**Goals:**
- Make Fretboard a first-class, lazy-loaded workspace reachable from the header.
- Map the seven existing scale/mode formulas across standard guitar and bass tunings with pure deterministic helpers.
- Give musicians immediate root, mode, instrument, and interval/note-label controls.
- Render a musically familiar horizontal board with strong root orientation, octave markers, responsive containment, and keyboard/assistive semantics.
- Preserve all builder state and behavior when moving between workspaces.

**Non-Goals:**
- Adding a second chord editor or changing chord-card diagrams.
- Alternate tunings, handedness, CAGED/3NPS position filtering, chord overlays, playback, exotic-scale datasets, or persistence.
- Changing the shared `Instrument` type, public API routes, provider configuration, or voice-agent tool surface.

## Decisions

### Keep workspace state in `App` and lazy-load only the explorer

`App` will own a `builder | fretboard` workspace value and pass it to `Header`. Builder state stays in the existing hooks regardless of which workspace is visible, while `React.lazy` keeps the new visual surface out of the initial builder bundle. The builder subtree may conditionally render because its durable progression and bridge state live above it; switching back restores the same chords, variants, locks, instrument, and agent-facing data.

Alternative considered: add the fretboard below chord cards. Rejected because it would make the wide learning surface secondary, increase builder page length, and fail the roadmap's first-class-view intent.

### Extend the shared theory layer with a pure fretboard module

`src/lib/theory/fretboard.ts` will define standard tunings and return immutable position records from instrument, fret count, key, and mode inputs. It will reuse `pitchClassOf` and an exported scale-interval accessor instead of duplicating mode formulas. Interval labels derive from semitone distance (`1`, `b2`, `2`, `b3`, `3`, `4`, `#4`, `5`, `b6`, `6`, `b7`, `7`), while note display uses one explicit sharp/flat spelling table selected from the root spelling.

Alternative considered: derive positions inside React. Rejected because it would duplicate theory logic, complicate tests, and recompute on unrelated renders.

### Use an HTML grid with semantic note buttons

The fretboard will be an HTML grid inside a labeled horizontal scroll region. Each string is a row, fret 0 is an open-string lane, frets 1–15 share a consistent minimum width, and markers appear at 3, 5, 7, 9, 12, and 15. Scale notes render as semantic buttons with exact accessible names and arrow-key spatial navigation; non-scale positions remain visible string/fret structure but are not focus targets.

Alternative considered: one SVG. Rejected because native control focus, accessible names, hit targets, and responsive text are more fragile inside a large generated SVG.

### Reuse semantic tokens for interval roles

The root uses the established gold accent. Third-family degrees use warm/apricot, fifth-family degrees use academy/sky, and remaining scale degrees use soft/petal or secondary neutral treatment. Interval and Note modes change the text label only, so spatial color memory stays stable. No new palette token is required.

### Keep explorer controls local and independent

The explorer defaults to Guitar, C, Major, and Intervals. Changing guitar/bass does not modify the builder's guitar/piano toggle. Changing key/mode does not modify Free Input harmonic-suggestion context. This prevents surprising cross-workspace mutations until a future OpenSpec explicitly defines shared context.

## Risks / Trade-offs

- [Wide board can become a mobile scroll trap] → keep scrolling inside a labeled region, retain page-width containment, provide visible edge guidance, and ensure focused notes scroll into view.
- [Many note nodes can increase render cost] → cap at 16 fret lanes, compute immutable rows with `useMemo`, and assert interaction latency.
- [Enharmonic labels can be theoretically ambiguous] → use a deterministic root-spelling preference and test flat/sharp roots; more advanced mode-specific spelling is a future theory enhancement.
- [Workspace switching could reset voice or progression state] → keep all durable builder hooks and bridge construction above the workspace branch and add an end-to-end preservation test.
- [Color alone could carry interval meaning] → every active position always includes a visible interval or note label plus an accessible name.

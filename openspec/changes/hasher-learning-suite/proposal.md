## Why

Harmony Hash already has the underlying builder, playback, sharing, and music-learning tools, but their current separation and control hierarchy make related workflows feel disconnected and make common performance tasks unnecessarily cumbersome. This change turns those shipped capabilities into one coherent, responsive musician workflow while preserving the Tonari visual language and the existing theory and voice-agent contracts.

## What Changes

- Reorganize both Hasher input modes so Key and Mode lead the workflow, Browse Chords is easy to find, selected parameters form a compact responsive rail, and a centered “or” clearly separates prompt-based generation from direct chord entry or selection. Remove the Hasher Mood Lens without removing mood-aware learning behavior from Scale Synthesia.
- Make Improv Insight, progression sharing, and progression playback consistently reachable where they are relevant. Add a distinct plucked-string guitar playback path wherever piano progression playback is offered.
- Keep piano cards usable as a performance surface by fitting multiple cards per row, containing expanded voicing comparison inside the card grid, and supporting keyboard-accessible chord reordering and insertion as well as pointer drag and drop.
- Combine Circle of Fifths, Scale Synthesia, and Note Neural Network into one collapsible `Tune Toolbox` workspace with shared key, mode, mood, and selection state. Add Scale Synthesia handoff into Hasher, a persistent `Any` mood default, Circle-to-Improv navigation, and relationship-strength cues that never rely on color alone.
- Rework Note Neural Network into a legible Obsidian-like interactive graph with a protected center, readable long labels, clear connections, and responsive interaction.
- Rank Chord Modifier quick changes against the active key and harmonic function, including function-appropriate minor, dominant, altered, and extension choices with an explainable fit score and an honest unknown-key fallback.
- Remove the marked nonessential badge from Fretboard Explorer.
- Add a concise first-visit Harmony Hash splash/onboarding experience with durable dismissal and a permanent way to reopen it.

## Capabilities

### New Capabilities

- `guitar-playback`: Deterministic guitar progression scheduling, plucked-string synthesis, transport lifecycle, and parity with the existing piano playback entry points.
- `theory-workspace`: The unified `Tune Toolbox` containing the collapsible Circle of Fifths, Scale Synthesia, Note Neural Network, and Improv Insight workflow, including shared state, cross-tool handoffs, relationship visualization, and graph readability.
- `splash-onboarding`: First-visit education, dismissal persistence, accessible close/focus behavior, and an always-available reopen action.

### Modified Capabilities

- `app-shell`: Expand the responsive workspace/navigation contract around the alliterative `Hasher`, `Tune Toolbox`, and `Fret Finder` labels, unified theory surface, onboarding entry point, and compact cross-workspace controls.
- `progression-input`: Change both input modes' control hierarchy, remove their Mood Lens, expose Browse/Share/Improv consistently, and add accessible timeline reordering and insertion.
- `chord-card-display`: Generalize progression transport visibility to guitar, contain voicing comparison, and make the piano card grid fit multiple playable cards per row.
- `quick-chord-modifiers`: Replace generic quick alternatives with key- and function-aware ranked recommendations and explainable fit feedback.
- `guitar-fretboard`: Remove the nonessential learning-layer badge while preserving the explorer's controls, semantics, and responsive containment.

## Impact

- Primary UI impact: `src/App.tsx` and the Hasher, chord-card, sharing, Circle of Fifths, Scale Synthesia, Note Neural Network, Improv Insight, Fretboard Explorer, and onboarding components.
- Shared logic impact: progression state/reordering, `src/lib/audioEngine.ts`, piano/guitar playback scheduling, and pure helpers under `src/lib/theory/` for relationships and contextual recommendation scoring.
- Test impact: focused Vitest coverage for new pure logic and state transitions plus Playwright coverage for desktop/mobile layout, pointer and keyboard reordering, playback, cross-tool handoff, persistence, focus restoration, reduced motion, and clean console/network behavior.
- Deployment impact: SPA and existing Worker static-asset deployment only; no public API route, secret, provider, licensing, or paid-service change is planned.

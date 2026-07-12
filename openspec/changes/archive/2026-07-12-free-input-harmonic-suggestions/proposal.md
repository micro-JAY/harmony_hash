## Why

Free Input currently borrows a hidden C-major context from the Progressions tab and hides the chord grid as soon as a progression renders. Musicians need an explicit key/mode context and a fast way to see which catalog-valid chord best fits the key or follows the chord they just entered.

## What Changes

- Add independent Key and Mode controls to Free Input, preserving their state when switching tabs.
- Keep the chord-reference grid available after chord cards render so it remains useful while extending a progression.
- Replace the binary row-level Diatonic overlay with `Off`, `Key`, and `Next` modes that score every dictionary-valid chord cell.
- Add a pure theory scorer that combines chord-tone scale membership with explainable voice-leading and root-motion signals; `Next` also recognizes dominant-to-tonic resolution.
- Render fit strength with token-based background, border, and glow plus full-contrast text/ARIA descriptions so color is never the only cue.
- Preserve existing grid insertion, undo, focus, responsive scrolling, timeline replacement, playback, and stale-agent invalidation behavior.
- Add unit, component, Playwright, responsive, keyboard, pointer, and interaction-latency coverage.

## Capabilities

### New Capabilities
- `harmonic-suggestions`: Pure key-fit and next-chord scoring for catalog chords, including stable score tiers and human-readable reasons.

### Modified Capabilities
- `chord-grid-suggestions`: Replace the shipped Off/Diatonic row overlay with Off/Key/Next cell scoring, explicit context evidence, accessible full-contrast cues, and reduced-motion behavior.
- `progression-input`: Free Input gains independent key/mode context and keeps the chord browser available while a progression is rendered.

## Impact

- Affected UI: `src/components/ProgressionInput.tsx` and `src/components/ChordReferenceGrid.tsx`.
- Affected shared theory: `src/lib/theory/` gains chord-tone and transition scoring helpers consumed by the grid and future theory views.
- Affected tests: theory unit tests, focused component tests, and Playwright coverage for desktop, tablet, mobile, keyboard, pointer, and render latency.
- No new dependencies, provider calls, voice-agent tools, public routes, chord-data formats, design tokens, or Worker behavior.

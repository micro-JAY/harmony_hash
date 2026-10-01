## Why

The guided tour no longer reflects the shipped Tune Toolbox, Discovery, and Harmony input changes, and it currently moves people between workspaces without explaining or teaching that navigation. Discovery also needs a focused way to turn Improv Insight recommendations into playable instrument guidance, while the old Fret Finder chord overlay competes with its primary note-finding workflow and the site offers no light appearance.

## What Changes

- Update the guided tour for the current Hasher, Tune Toolbox, and Discovery layout, including Harmony Voice/Type, the relocated Fret Finder, and Discovery's accompaniment workflow.
- Add explicit workspace handoff steps that pause the tour and require the user to click the highlighted Tune Toolbox or Discovery tab before the tour continues in that workspace.
- Add a compact Discovery Improv Insight control that ranks compatible scales for the current Hasher progression, lets the user select a recommendation, and optionally highlights every matching pitch class on the active piano or guitar.
- Render scale guidance as a quiet translucent layer beneath selected and sounding notes, with a redesigned Discovery guitar presentation that keeps strings, frets, labels, and interactive states legible.
- Remove the chord-overlay picker and overlay settings from Fret Finder so chord-scale visualization has a single, progression-aware home in Discovery.
- Add a persistent light/dark appearance toggle with an appropriate sun/moon icon inside Help / About, backed by semantic light-theme tokens and startup theme restoration.

## Capabilities

### New Capabilities

- `discovery-improv-overlay`: Progression-aware scale recommendations and optional low-priority note highlighting on Discovery instruments.

### Modified Capabilities

- `splash-onboarding`: Bring the tour up to date and make cross-workspace progression depend on the user's explicit tab click.
- `app-shell`: Add a persisted light appearance and expose the appearance control inside Help / About.
- `guitar-fretboard`: Remove the Fret Finder chord-overlay controls and associated chord-tone rendering behavior.

## Impact

This change affects the application shell and theme bootstrap, Help / About and guided-tour components, Discovery's piano and fretboard renderers, Fret Finder controls, localized copy, semantic design tokens, and their unit/end-to-end coverage. It reuses the existing theory engine and current Hasher progression state; it adds no backend route, provider, or runtime dependency.

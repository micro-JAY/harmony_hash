## Why

Hasher chord cards show the exact voicing a musician is shaping, but the only current audio action plays the whole progression. A musician needs to audition one card repeatedly while comparing chord choices, variants, and voicings.

## What Changes

- Make each Hasher chord-card heading an accessible audition button.
- Play the card's current instrument-specific MIDI voicing and timbre when activated.
- Allow repeated activation to stop and immediately retrigger the chord.
- Keep the active-card playback treatment aligned with the auditioned card and prevent overlap with progression playback.

## Capabilities

### Modified Capabilities

- `chord-card-display`: Add repeatable, keyboard-accessible single-card audition behavior.

## Impact

- UI: `src/components/ChordCard.tsx`, `src/components/ChordCardFrame.tsx`, and localized accessible labels.
- Playback: `src/App.tsx` reuses the existing audio engine and playback controller with the card's current piano, guitar, or ukulele voicing.
- Tests: focused component coverage plus existing audio/controller and application checks.

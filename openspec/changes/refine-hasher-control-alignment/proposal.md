## Why

HASHER's direct-entry controls and header utilities have drifted from the shared control geometry: the composer Run button and input do not match the natural-language prompt row, the chord browser and instrument picker do not form a balanced rail, and the two-button locale switch creates a clipped square active state. This small visual repair makes the primary HASHER flow feel intentional without changing musical behavior.

## What Changes

- Match the Build Your Own composer input and Run action to the Describe a Progression row at desktop widths.
- Align the chord-browser disclosure with the shared instrument picker while preserving the current responsive placement.
- Preserve the rounded outer surface of the instrument selector and replace the locale switch with one square EN/JP toggle matching the onboarding close control's size.
- Align the Help / About control and locale toggle as a consistent header utility pair.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: Refine HASHER header locale control presentation and utility alignment.
- `progression-input`: Keep direct-entry and natural-language input controls geometrically aligned, and align the composer-adjacent chord browser and instrument selector.

## Impact

Affected surfaces are `Header`, `ProgressionInput`, `InstrumentToggle`, their shared HASHER CSS, and focused browser coverage. No chord parsing, localization content, musical state, playback, API, TUNE TOOLBOX, or FRET FINDER behavior changes.

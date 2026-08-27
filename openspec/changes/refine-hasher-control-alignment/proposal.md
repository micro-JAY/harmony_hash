## Why

HASHER's direct-entry controls and header utilities have drifted from the shared control geometry: the composer Run button and input do not match the natural-language prompt row, the chord browser and instrument picker do not form a balanced rail, and the two-button locale switch creates a clipped square active state. Note Neural Network also needs a clear preview-status signal and interaction guidance that reads like user instructions instead of an implementation timing detail. This visual repair makes both surfaces more intentional without changing musical behavior.

## What Changes

- Match the Build Your Own composer input and Run action to the Describe a Progression row at desktop widths.
- Align the chord-browser disclosure with the shared instrument picker while preserving the current responsive placement.
- Preserve the rounded outer surface of the instrument selector and replace the locale switch with one square EN/JP toggle matching the onboarding close control's size.
- Align the Help / About control and locale toggle as a consistent header utility pair.
- Label Note Neural Network as an `EARLY PREVIEW` with the restrained Tonari status-pill treatment and replace millisecond-based interaction copy with plain-language press-and-hold guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: Refine HASHER header locale control presentation and utility alignment.
- `progression-input`: Keep direct-entry and natural-language input controls geometrically aligned, and align the composer-adjacent chord browser and instrument selector.
- `theory-workspace`: Keep Note Neural Network accessible while clearly identifying its preview status and explaining its controls in user-facing language.

## Impact

Affected surfaces are `Header`, `ProgressionInput`, `InstrumentToggle`, `TheoryWorkspace`, Note Neural Network guidance, shared semantic tokens, localization, and focused browser coverage. No chord parsing, musical state, playback, API, graph interaction mechanics, or FRET FINDER behavior changes.

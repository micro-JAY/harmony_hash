## Why

Harmony Hash has a new canonical logo, while the first-visit welcome surface and browser icons still use the previous asset and introductory copy. The welcome should present the mark as an immersive branded field without weakening the existing accessible dismissal and guided-tour behavior.

## What Changes

- Replace the shipped Harmony Hash logo and generate appropriately sized favicon and Apple touch-icon derivatives from the supplied canonical asset.
- Recompose the welcome/help modal so the left visual surface is fully covered by the logo artwork and the mark fills that surface without clipping or changing the text panel's hierarchy.
- Update the welcome title to `HARMONIOUS HARMONY`, rename the guided-tour action to `TAKE A TOUR`, and use concise toolbox and guitar-headstock destination symbols.
- Select and apply a replacement welcome tagline after user review, without changing any guided-tour step, persistence, or cross-workspace behavior.
- Preserve all non-onboarding surfaces, including HASHER, TUNE TOOLBOX, FRET FINDER, voice, playback, and theory workflows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `splash-onboarding`: Refresh welcome branding, imagery, copy, destination symbols, and asset derivatives while retaining the existing accessible modal and tour contract.
- `app-shell`: Keep the application metadata and icon links aligned to the canonical Harmony Hash visual identity.

## Impact

- Affects `public/` logo/icon assets, `index.html`, onboarding presentation/copy, localization, and onboarding-focused unit and browser coverage.
- Does not change public APIs, dependencies, music theory logic, playback, or non-onboarding workspace functionality.

## Why

Shared Harmony Hash links still use an outdated remote preview image and generic explorer copy, so link cards no longer match the refreshed welcome identity. The welcome also has too little copy variety for a surface that opens on every visit.

## What Changes

- Ship a repository-owned 1200×630 social preview card composed from the canonical Harmony Hash logo and the current split-panel welcome style.
- Point Open Graph and Twitter/X metadata at the production-hosted preview asset and align the document description with the welcome message.
- Expand the randomized welcome subtext set with concise English lines and complete Japanese translations.
- Add focused source and browser coverage for preview metadata, asset dimensions, and every randomized copy option.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: Require first-party, current-brand social metadata and a correctly sized share-preview image.
- `splash-onboarding`: Expand localized welcome subtext variety while preserving random selection and existing onboarding behavior.

## Impact

- Affects `index.html`, one new public social-preview image, onboarding copy constants, localization, and focused tests.
- Does not change application APIs, dependencies, navigation, persistence, music-theory behavior, or deployment configuration.

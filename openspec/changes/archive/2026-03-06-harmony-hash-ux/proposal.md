## Why

Harmony Hash currently lacks in-context guidance for users encountering mixed minor-harmony progressions, and piano cards only show one key-label mode. This creates confusion in minor tonality workflows and limits practice use for players who want either note labels or fingering guidance.

## What Changes

- Add a minor-only contextual help trigger in the tonality row that opens a modal explaining the "Minor Blend" concept.
- Add a dedicated `MinorBlendModal` component with structured static educational content, token-based styling, and full close interactions (outside click, close button, Escape).
- Add a per-card piano display mode toggle (`Notes` / `Fingering`) in piano mode only.
- Update piano key labeling behavior to support fingering labels (1-5) while preserving notes mode behavior.
- Highlight the root key differently in fingering mode for clearer tonal anchoring.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `progression-input`: Tonality controls gain a minor-only help affordance and modal flow.
- `chord-card-display`: Piano card UI gains display-mode toggle and fingering-vs-note key label behavior.

## Impact

- Affected code: `src/components/ProgressionInput.tsx`, new `src/components/MinorBlendModal.tsx`, `src/components/ChordCard.tsx`, `src/components/PianoKeyboard.tsx`, `src/lib/types.ts` (if needed).
- UX impact: better minor-tonality education and clearer piano-practice workflows.
- Dependencies: uses existing Framer Motion dependency for modal transitions.

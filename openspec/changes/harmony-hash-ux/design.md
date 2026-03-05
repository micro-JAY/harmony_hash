## Context

Harmony Hash currently exposes tonality and progression controls but provides no in-app explanation for why minor progression blends can include unexpected major-function chords. Piano rendering also has a single key-label behavior, limiting use for either theory-first (note names) or technique-first (fingering) practice. The requested UX updates affect progression controls, chord-card UI state, and piano-key label rendering.

## Goals / Non-Goals

**Goals:**
- Add a minor-tonality contextual help affordance and modal with static educational content.
- Ensure modal can be dismissed by outside click, close button, and Escape key.
- Add per-card piano display mode (`notes`/`fingering`) in piano mode only.
- Keep notes-mode behavior unchanged while adding fingering labels and root-key emphasis in fingering mode.
- Preserve existing guitar behavior.

**Non-Goals:**
- No markdown parser integration; modal content stays explicit JSX.
- No changes to chord parser/voicing math in `harmonyBrain.ts` or catalog logic in `chordData.ts`.
- No progression library data changes.

## Decisions

1. **Minor help affordance is scoped to minor tonality only**
   - Add local `minorHelpOpen` state in `ProgressionInput` and render the `?` trigger adjacent to tonality select only when `activeTonality === 'minor'`.
   - Keeps UI noise low while surfacing help only where needed.

2. **Modal content is fully static semantic JSX**
   - Implement `MinorBlendModal` as explicit headings, paragraphs, lists, and blockquote.
   - Uses token-based inline styles and Framer Motion for entry/exit transitions.

3. **Per-card piano display mode remains local UI state**
   - Add local `pianoDisplay` state in `ChordCard` so each card can be switched independently without global coupling.
   - Toggle renders only when instrument is `piano`.

4. **Fingering labels derived from current active key ordering**
   - In `PianoKeyboard`, sort active notes by MIDI ascending and assign 1-5 in order.
   - For chords with >5 notes, label first five only and leave extras unlabeled.
   - In fingering mode, root key receives accent fill and inverse label color.

## Risks / Trade-offs

- **[Risk] Modal content drift vs requested copy** -> **Mitigation:** hardcode exact copy/structure from prompt in JSX.
- **[Risk] Fingering assignment ambiguity for dense voicings** -> **Mitigation:** deterministic lowest-to-highest assignment and documented >5-note fallback.
- **[Risk] UI regression in notes mode** -> **Mitigation:** preserve existing key activation logic and only switch label text/color by display mode.

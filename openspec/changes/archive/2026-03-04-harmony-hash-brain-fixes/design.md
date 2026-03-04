## Context

Harmony Hash currently resolves chord progressions and renders guitar/piano cards from a shared chord catalog, but several cross-module regressions create invalid symbols, parse failures, and incomplete piano rendering. The affected behavior spans progression transposition logic (`harmonyBrain`), note formatting (`chordData`), and UI state/rendering (`ChordCard`, `PianoKeyboard`, `App`) so the fix needs coordinated updates rather than isolated patches.

## Goals / Non-Goals

**Goals:**
- Ensure roman numeral parsing/transposition handles lowercase-minor suffixes and slash numerals without generating invalid chord names.
- Standardize user-visible note text so internal `s/f` note encoding never appears in UI output.
- Keep full chord voicings visible by aligning keyboard range and octave-selection logic.
- Restore deterministic variant controls after randomize and add per-card lock behavior in guitar mode.
- Preserve existing architecture and design-token-based styling.

**Non-Goals:**
- Do not implement bass-note slash-chord rendering/voicing behavior (slash suffix may be dropped for now).
- Do not modify progression library definitions or progression input UX.
- Do not add new piano interaction modes (voice-leading, fingering/note-name toggles).
- Do not alter chord JSON data content.

## Decisions

1. **Normalize duplicated minor suffixes in numeral parsing path**
   - Decision: Strip a leading lowercase `m` from the parsed suffix only when numeral quality is already minor and the next character is a digit or absent.
   - Rationale: Fixes `iim7 -> Amm7` regression while preserving `maj` extensions.
   - Alternative considered: Post-process final chord symbol string. Rejected because quality/suffix intent is clearer and safer before assembly.

2. **Treat slash-numeral bass segment as non-blocking metadata**
   - Decision: Split numeral token at `/` and resolve only the left segment for now.
   - Rationale: Removes parse failures for progression-library tokens (`V/ii`, `I/III`) without introducing incomplete bass-voicing logic.
   - Alternative considered: Parse and map slash bass numerals fully. Rejected for this change because no bass rendering path exists yet.

3. **Centralize note display formatting in chord-data utilities**
   - Decision: Add formatter helpers in `chordData.ts` (`formatNoteForDisplay`, `prefersFlatNotation`) and consume them in card rendering paths.
   - Rationale: Keeps conversion logic reusable and consistent between note row and future key-label display.
   - Alternative considered: Format directly in components. Rejected to avoid duplicated mapping logic and drift.

4. **Align piano range and voicing engine to visible MIDI window**
   - Decision: Extend keyboard to C3-B5 and choose lowest starting octave where all voiced notes fit in 48-83; for drop-2, skip drop when it would move below C3.
   - Rationale: Eliminates partial chord renders for high-root chords while keeping voicings musically coherent.
   - Alternative considered: Keep 2 octaves and clamp off-screen notes. Rejected because it hides required chord tones.

5. **Promote variant state ownership to parent for override handoff + locks**
   - Decision: Use parent-managed per-card variant state and lock state; child arrow clicks emit explicit variant changes so randomized overrides no longer mask local interactions.
   - Rationale: Avoids dual-source-of-truth between `variantOverride` and local state and enables lock-aware randomization.
   - Alternative considered: Keep child-local state with key-based remount after randomize. Rejected due to brittle lifecycle coupling.

## Risks / Trade-offs

- **[Risk] Not rendering slash bass notes could surprise users** -> **Mitigation:** ensure slash numerals resolve without error now and track bass rendering as future enhancement.
- **[Risk] Octave-fit heuristic might alter familiar voicing register** -> **Mitigation:** choose deterministic lowest-fit rule and preserve existing interval ordering/drop-2 intent.
- **[Risk] Parent-managed variant/lock state increases prop wiring complexity** -> **Mitigation:** keep explicit callback contracts and add tests around randomize + arrow interactions.
- **[Risk] Enharmonic display preference may not cover uncommon roots (e.g., Cb)** -> **Mitigation:** keep formatting table explicit and default to non-flat preference unless root indicates flat context.

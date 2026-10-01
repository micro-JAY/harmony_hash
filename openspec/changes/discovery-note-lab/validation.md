# Discovery integration handoff

Branch: `feat/discovery-note-lab`, based on `936be49`.

## Verified in isolation

- `npm test`: 70 files, 1,394 tests passed (shared local install: Vitest 4.1.10).
- `npx vitest run src/lib/discovery src/components/Discovery.test.tsx`: 41 focused tests passed after the final MIDI review fixes.
- `npm run lint`: passed.
- `npm run build`: passed. Existing Browserslist freshness and large main-chunk warnings remain.
- `openspec validate discovery-note-lab --strict`: passed.
- `git diff --check`: passed.

Independent MIDI review fixed explicit port closure, reconnect serialization, and repeated-note re-articulation while sustain is held; the regression tests pass. Type checking and focused lint also pass after those fixes.

No dependencies changed. No deployment performed. The existing App shell was intentionally not edited in this isolated slice.

## Integration contract and remaining verification

Lazy-load the default `Discovery` export from `src/components/Discovery.tsx` in the new third workspace. It accepts:

- `active?: boolean` for input/audio lifecycle, especially if kept mounted while hidden.
- `playbackRequest?: ProgressionPlaybackRequest & { allowRests?: boolean } | null`, containing current Hasher voicings, timbre, BPM and beats per chord.
- `progressionLabels?: readonly string[]`, in the same chord order as the request.
- `onBeforeLoopStart?: () => void`, used to stop the existing one-shot Hasher playback before accompaniment starts.

The v4 integration owner will pass the new fourth `snapshot.allowRests` argument into `buildMidiPlaybackSchedule` in `discoveryAudio.ts`, once the ukulele branch's extended audio API is present. This is intentionally not called against the older three-argument API in this branch.

`e2e/discovery.spec.ts` contains eight integrated browser cases: requested chord/inversion examples, independent instrument selections, one-fret-per-string input, computer shortcuts and lifecycle cleanup, MIDI connection/sustain/unplug, unsupported MIDI, read-only progression loop, and 390px mobile containment. Run after the shell integration; these require a DISCOVERY navigation button and have not been run in isolation. Root final verification against fresh lockfile dependencies supersedes this branch's existing local-install test version.

Use screenshots of the desktop selected chord and 390px piano/fretboard when reviewing the combined UI. Physical MIDI hardware and browser-specific audio permission behavior remain manual checks; MIDI API behavior is covered using deterministic test doubles.

## Integrated verification — 2026-09-27

`feat/v4-discovery` is based on the validated toolbox/ukulele branch. App now lazy-loads the third DISCOVERY tab on first visit, preserves selections across tabs, and supplies current Hasher voicings, timbre, silent slots and labels. Starting its loop stops any existing Hasher one-shot playback. The existing guided tour has not been redesigned.

- Fresh lockfile dependencies (Vitest 5.0.0): **71 files / 1,413 unit tests pass**.
- Build, TypeScript, ESLint and strict validation of this change pass.
- **16 Chromium scenarios pass**: ten Discovery cases plus six shared UI scenarios. Additional Japanese localization coverage passes. New mixed-ukulele tests verify middle/trailing rests and complete loop duration, reject entirely silent loops, and exercise repeated browser playback through the unavailable chord slot.
- Desktop, tablet and mobile screenshots are committed; the selected Cmin7 HUD and highlighted notes were visually inspected.
- Physical MIDI and live provider audio remain separate manual/provider checks. Browser MIDI, Web Audio scheduling, sustain and device lifecycle are verified deterministically.

## Review refinements — 2026-10-01

PR #110 now includes the requested Discovery and Piano review pass:

- The Discovery HUD uses the shared chord-family and chromatic-interval palettes, keeps the complete chord symbol on one compact line at desktop width, aligns its explanatory details in the right column, and places a dictionary-gated pin action in that detail surface.
- Piano key note/octave labels are centered and non-wrapping, computer shortcuts occupy their own bounded row, and the pastel-green Z/X octave hint sits directly above Computer keys.
- Web MIDI enumerates all connected inputs after permission, listens to one selected input, exposes a selector only when needed, releases and closes the old port on switch, and falls back when the selected device disappears. The lifecycle follows Context7 `/mdn/content` guidance for `MIDIAccess.inputs`, `statechange`, `MIDIPort.open()`, and `MIDIPort.close()`.
- Hasher Piano cards expose bounded per-card octave controls and a whole-progression control. Offsets are keyed by stable timeline item id, survive reorder, move the rendered three-octave window, and feed the same effective voicings to playback, MIDI export, Hanz, and the Discovery loop.
- A supported discovered chord creates the existing silent, draggable, cross-workspace floating card without mutating the Hasher timeline or starting audio. Unsupported detector-only spellings remain visible with an honest disabled pin action.
- PR #112's exact Wrangler 4.144.0 dependency commit was cherry-picked, resolving `sharp` to 0.35.4. A fresh audit then identified and non-breakingly resolved transitive `nanoid` 3.3.19 and `brace-expansion` 1.1.21/5.0.12 in the lockfile.

Final validation on a fresh `npm ci` install:

- `npm audit --audit-level=low`: **0 vulnerabilities**.
- `npm run lint`: passed.
- `npm test`: **71 files / 1,419 tests passed** (Vitest 5.0.0).
- `npm run build`: passed; the existing large main-chunk advisory remains informational.
- `npx playwright test e2e/discovery.spec.ts --project=chromium`: **14 passed**.
- `npx playwright test --project=chromium`: **225 passed**.
- `openspec validate discovery-note-lab --strict`: passed.
- `git diff --check`: passed.

The refreshed selected-Cmin7 and shared desktop/tablet/mobile Discovery baselines were visually inspected. No deployment was performed. Physical multi-device MIDI remains a manual hardware check; deterministic browser doubles cover permission, selection, sustain, hotplug, switching, and cleanup.

PR #110 was retargeted from the merged #109 feature branch to `main`, and its description was refreshed with the review changes, theory rationale, current screenshots, exact validation evidence, risks, and the #112 consolidation note. PR #111 remains an independent draft; PR #112 was not closed or otherwise mutated.

## References

- Ableton Computer MIDI Keyboard mapping: https://www.ableton.com/en/manual/routing-and-i-o/#playing-midi-with-the-computer-keyboard
- Web MIDI permission and input API: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
- React event subscription lifecycle: Context7 `/reactjs/react.dev`, useEffect cleanup guidance.

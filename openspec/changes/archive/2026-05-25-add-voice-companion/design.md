# Design — Add Voice Companion

## Capability map (real repo symbols, verified against source)

The package was authored against an idealized store. These are the **actual** symbols the bridge
wires to. Anything marked NOT AVAILABLE is why a package tool/field was dropped.

### Progression state — `src/App.tsx`
- `const [chords, setChords] = useState<DisplayChord[]>([])` — `DisplayChord = { input: string; chord: IndexedChord }` (local to App.tsx:37). `setChords` is a stable setter.
- `handleResult = useCallback((resolved: DisplayChord[], _errors: ParseError[]) => {…}, [])` (App.tsx:61) — sets chords + clears `cardVariants`/`lockedCards`/`pianoStyles` + stops playback. **Stable.** The funnel for a full progression replace.
- `activeChordIndex: number | null` + `setActiveChordIndex` (App.tsx:57); `isPlaying = activeChordIndex !== null`.
- `instrument: Instrument ("guitar" | "piano")` + `setInstrument` (App.tsx:52). Playback UI renders only when `instrument === "piano"` (App.tsx:204).
- `randomizeAll()` (App.tsx:135) — reshuffles **variants (guitar) / voicing styles (piano)** of existing chords; never generates chords. Plain fn (not `useCallback`); closes over `chords` + `lockedCards`.
- `handleTogglePlayback()` (App.tsx:109) — **toggle**: stop if playing, else start (builds schedule from `pianoVoicings`, lazily creates `AudioContext`). Plain fn.
- `pianoVoicings = computeVoiceLedProgression(chords.map(c => parseNotes(c.chord.entry)), styles)` (App.tsx:101).

### Chord resolution — `src/lib/chordData.ts`
- `lookupChord(input: string): IndexedChord | undefined` (chordData.ts:296) — returns `undefined` on an unresolvable name (not null, not throw). The bridge throws a clear `Error` when it gets `undefined`.
- `parseNotes(entry: ChordEntry): string[]` (chordData.ts:345) — chord tones in internal `s`/`f` encoding.
- `formatNoteForDisplay(internalName: string, preferFlats: boolean): string` (chordData.ts:115) + `prefersFlatNotation(root: string): boolean` (chordData.ts:110) — edge formatting for agent-facing note names.

### Analysis — `src/lib/harmonyBrain.ts` + `src/lib/theory/index.ts`
- Key inference from a chord set — **NOT AVAILABLE.**
- Roman-numeral analysis of a chord set — **NOT AVAILABLE** (engine only goes numerals → chords via `transposeProgression`).
- Compatible-scale ranking — **NOT AVAILABLE.**
- Next-chord suggestion engine — **NOT AVAILABLE.**
- Available, pure, importable: `computeVoiceLedProgression(noteSets, styles?)`, `parseNotes`. `src/lib/theory` has `pitchClassOf`/`scalePitchClasses`/`isRootDiatonic`/`scaleDegreeOf` but all require a *given* key — they do not infer one.

→ `analyze_progression` therefore returns only `{ chords, chordCount, chordTones, voicing }`. Three tools (`get_chord_suggestions`, `set_key`, `set_suggestion_mode`) are dropped: nothing real backs them.

### Audio — `src/lib/audioEngine.ts`
- `buildPlaybackSchedule(voicings, bpm, beatsPerChord=2): PlaybackEvent[]`, `playSchedule(schedule, ctx, onChordChange?): PlaybackHandle`. The bridge reuses App's `handleTogglePlayback` rather than re-driving the engine.

### Worker — `worker/index.ts`
- `Env { ANTHROPIC_API_KEY; ALLOWED_ORIGIN?; ASSETS }` → extended with `ELEVENLABS_API_KEY` + `HH_VOICE_AGENT_ID`.
- Reusable: `corsHeaders(request, env)`, `isOriginPermitted(...)`, `jsonResponse(body, status, request, env)`. The new route uses all three so CORS/allowlist behavior is identical to `/api/progression`.

## Key decisions

### 1. Ref-mirror instead of a new store
ElevenLabs client-tool handlers fire outside React's render cycle. A bridge that closed over the
`chords` array value would read a stale snapshot. So `App.tsx` keeps `chordsRef`/`instrumentRef`/
`activeIndexRef` mirrors (updated in effects) plus "latest function" refs for the two non-stable
actions (`randomizeAll`, `handleTogglePlayback`). The bridge is built once (`useMemo`, stable deps)
and reads `*.current`. This keeps the working, tested core state untouched. Lifting into Zustand is
out of scope.

### 2. `play()` returns a result, never silently switches instrument
Playback is piano-only. The bridge's `play()` returns `{ ok: false, message }` when the guitar view
is active (or the timeline is empty) so the agent can tell the user to switch — it does not flip
`instrument` behind their back. When piano + stopped, it starts playback; when already playing it is
a no-op `{ ok: true }`.

### 3. Append preserves per-card state; replace/clear resets it
`replaceProgression`/`clear` go through `handleResult` (resets variants/locks/styles + stops
playback — correct, the whole progression changed). `addChords` appends via `setChords(prev => …)`
so existing cards keep their chosen variant/voicing (append doesn't shift earlier indices).

### 4. Bad chord throws
`addChords`/`replaceProgression` resolve each name via `lookupChord`; an `undefined` result throws
`Error("…'<name>'…")`. The ElevenLabs tool layer turns a thrown error into a tool error the agent
retries on — never a silent drop, never a success-shaped fallback.

### 5. Honest analysis
`analyze()` recomputes from the live timeline using `parseNotes` + `computeVoiceLedProgression`
(default voice-leading). It reports chord symbols, per-chord tones, and the voiced notes — all
genuinely computed. The system prompt tells the agent it may add general theory but must never claim
the app detected a key/numerals/scales.

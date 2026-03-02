## Context

Harmony Hash is a greenfield Next.js 14 app replacing the deprecated ChordCorral feature from Cadence/Noted-Sheets. The project has:
- 600 chord entries in `chords_clean.json` covering all 12 keys with alias symbols
- 2,775 guitar chord SVGs pre-organized at `public/music_src/chords/<key>/<chord_type>/var_N.svg`
- Tonari Labs design system (CDN-hosted CSS tokens: dark navy, glow accents, Zalando Sans)

The app is purely client-side for v1 — no backend, no database, no auth. All chord data is bundled at build time.

## Goals / Non-Goals

**Goals:**
- Ship a functional chord progression builder with guitar SVGs and procedural piano rendering
- Support both free-text chord input and preset progression picking
- Normalize diverse chord symbol notations to resolve against the catalog
- Render Drop 2 voicings for piano 7th+ chords
- Apply Tonari Labs design system for a polished, branded experience
- Unit test the core logic layer (harmonyBrain)

**Non-Goals:**
- Audio playback or MIDI export
- Bass instrument support
- Extended piano voicings beyond Drop 2 (no rootless voicings, shell voicings, etc.)
- User accounts, saving progressions, or sharing
- Server-side rendering of chord data (static import is sufficient)
- Mobile-native app — responsive web only
- Deployment/hosting configuration (handled separately)

## Decisions

### 1. Static JSON import vs API layer
**Decision:** Import `chords_clean.json` statically at build time via TypeScript import.
**Rationale:** 600 entries is ~80KB — small enough to bundle. No server needed. This keeps the app fully static/client-side with zero latency for lookups.
**Alternative considered:** API routes with server-side filtering — unnecessary complexity for a fixed dataset.

### 2. Chord lookup architecture
**Decision:** Build a multi-key index map at module load time — keyed by root+symbol combinations derived from each entry's `Symbols` field.
**Rationale:** A user typing "Cm7" needs instant lookup. The Symbols field contains comma-separated aliases (e.g. "m7, min7, -7"). By expanding these into a flat Map<string, ChordEntry>, we get O(1) lookup for any valid symbol variation.
**Key detail:** The JSON uses `s` for sharp and `f` for flat in note names (e.g. "Ef" = E♭, "Gs" = G♯). The parser must normalize user input (`Eb`, `E♭`, `Ef`) to match.

### 3. SVG path resolution strategy
**Decision:** Map chord entries to SVG filesystem paths using a lookup table that maps chord symbols to folder names.
**Rationale:** The SVG folders use names like `maj7`, `m7`, `7_sharp_9`, `dim` etc. — similar but not identical to the JSON symbols. We need a mapping from the canonical chord type to the folder name (e.g. symbol `7#9` → folder `7_sharp_9`, symbol `m7b5` → folder `m7_flat_5`). This mapping is built once and pairs with the key folder mapping (e.g. root `C#` → folder `c_sharp-d_flat`).

### 4. Piano rendering approach
**Decision:** Pure HTML/CSS keyboard rendered as a React component — no canvas, no SVG generation.
**Rationale:** A 2-octave keyboard is simple enough for DOM rendering. CSS transforms handle the black/white key layout. Highlighted notes get a glow effect using the design system's accent color. This is more accessible and easier to style than canvas.
**Voicing logic:**
- Triads (3 notes): Root position — notes as-is from the JSON
- 7th chords and above (4+ notes): Drop 2 — take closed voicing, drop the 2nd-highest note down one octave
- The Notes field (e.g. "C-E-G-Bf") provides the pitch classes; the voicing engine assigns octave numbers

### 5. Roman numeral transposition
**Decision:** Parse roman numerals (I, ii, bVII, etc.) into scale degrees, then resolve against the selected key using major/minor/modal scale formulas.
**Rationale:** Preset progressions are stored as roman numerals. The case (uppercase = major, lowercase = minor) and modifiers (°, b, #) determine chord quality. Combined with the selected key, each numeral maps to a concrete chord (e.g. "ii" in C major → Dm).

### 6. State management
**Decision:** React useState/useReducer at page level — no global state library.
**Rationale:** The app has a single page with limited state: current progression (chord list), selected instrument (guitar/piano), current variant index per card, selected key. This is well within useState territory. No need for Redux, Zustand, or context providers.

### 7. File structure
```
app/
  layout.tsx          — root layout with design system CSS import
  page.tsx            — main (and only) page
  globals.css         — Tailwind + design token overrides
lib/
  harmonyBrain.ts     — parser, normalizer, transposer, voicing engine
  harmonyBrain.test.ts — Vitest unit tests
  chordData.ts        — loads JSON, builds index, resolves SVG paths
  types.ts            — shared TypeScript interfaces
components/
  ProgressionInput.tsx  — free-text input + preset picker + key dropdown
  ChordCard.tsx         — individual chord card (guitar or piano mode)
  PianoKeyboard.tsx     — procedural 2-octave keyboard renderer
  InstrumentToggle.tsx  — Guitar/Piano global switch
  Header.tsx            — app header with branding
public/
  music_src/chords/     — guitar SVGs (already present)
```

### 8. Testing strategy
**Decision:** Vitest unit tests for `lib/harmonyBrain.ts` only. No component tests or E2E in v1.
**Rationale:** The harmony brain is the riskiest code (complex parsing, transposition math, voicing calculations). UI testing can come later. Vitest is lightweight and fast for pure logic tests.

## Risks / Trade-offs

**[Risk] Chord symbol ambiguity** → Mitigation: The Symbols field provides the canonical alias list. Any user input not matching a known alias returns a clear "unrecognized chord" error rather than a silent wrong match.

**[Risk] SVG folder naming mismatches** → Mitigation: Build the symbol-to-folder mapping exhaustively from the actual filesystem at dev time. Include a build-time validation script that ensures every chord entry with Variation Count > 0 has matching SVG folders.

**[Risk] Note notation inconsistency (s/f vs #/b)** → Mitigation: The parser normalizes all input to the internal notation before lookup. The normalization layer handles `#`→`s`, `b`→`f`, `♯`→`s`, `♭`→`f`.

**[Risk] Drop 2 voicing edge cases** → Mitigation: Unit tests cover specific known voicings. For v1, we only support Drop 2 for 4-note chords (7ths). Extended chords (9ths, 11ths, 13ths) use the first 4 notes for voicing, displaying remaining notes as "color tones."

**[Trade-off] Static bundle size** → The JSON + index adds ~80KB to the client bundle. Acceptable for v1; could lazy-load per key if needed later.

**[Trade-off] No persistence** → Users lose progressions on page refresh. Acceptable for v1; URL-encoded state or localStorage could be added later.

## 1. Project Setup

- [x] 1.1 Initialize Vite + React + TypeScript project with Tailwind CSS
- [x] 1.2 Configure Vitest for unit testing
- [x] 1.3 Add Tonari Labs design system CDN link to index.html
- [x] 1.4 Set up index.css with Tailwind directives and design token overrides (dark navy background, glow accent variables, Zalando Sans typography)
- [x] 1.5 Create `lib/types.ts` with shared TypeScript interfaces (ChordEntry, ParsedChord, VoicedChord, Progression, etc.)

## 2. Chord Data Layer

- [x] 2.1 Copy `chords_clean.json` to project data directory and create `lib/chordData.ts` with typed JSON import
- [x] 2.2 Build the multi-key chord index — expand Symbols aliases into a Map<string, ChordEntry> keyed by normalized root+symbol
- [x] 2.3 Implement SVG path resolution — mapping from chord entry to `public/music_src/chords/<key_folder>/<chord_type_folder>/var_N.svg` with the symbol-to-folder name translation
- [x] 2.4 Implement root note normalization (# → s, b → f, ♯ → s, ♭ → f, case-insensitive roots)

## 3. Harmony Brain — Core Logic

- [ ] 3.1 Create `lib/harmonyBrain.ts` with chord symbol parser — splits space-separated input, normalizes each symbol, resolves against the chord index
- [ ] 3.2 Implement parenthetical stripping and alias matching (e.g. "E7(#9)" → "E7#9", "G13(sus4)" → "G13sus4")
- [ ] 3.3 Implement roman numeral parser — parse case, accidentals (b, #), diminished (°), and quality from numeral strings
- [ ] 3.4 Implement scale degree transposition — map numerals to concrete chord names given a key, supporting major, natural minor, harmonic minor, and modal contexts
- [ ] 3.5 Implement Drop 2 voicing engine — take note names from chord entry, assign octave numbers, drop 2nd-highest note for 4+ note chords
- [ ] 3.6 Implement note-to-pitch-class mapping (C=0, C#/Db=1, ..., B=11) for piano rendering

## 4. Harmony Brain — Unit Tests

- [ ] 4.1 Write Vitest tests for chord symbol normalization (alias resolution across multiple notation styles)
- [ ] 4.2 Write Vitest tests for transposition across all 12 keys (major, minor, modal progressions)
- [ ] 4.3 Write Vitest tests for Drop 2 voicing output — verify Cmaj7 produces G3-C4-E4-B4, triads stay root position
- [ ] 4.4 Write Vitest tests for edge cases — empty input, unrecognized chords, parenthetical notation, bare root notes

## 5. UI Components — Input

- [ ] 5.1 Create `components/ProgressionInput.tsx` with free-text input field and Run button (Enter key support)
- [ ] 5.2 Add preset progression picker dropdown with grouped categories (Major, Aeolian, Harmonic Minor, Modal) and all specified progressions
- [ ] 5.3 Add key selector dropdown with all 12 chromatic keys
- [ ] 5.4 Wire input modes — free-text submits directly, preset picker + key selector triggers transposition then display
- [ ] 5.5 Add inline error display for unrecognized chord symbols

## 6. UI Components — Chord Cards

- [ ] 6.1 Create `components/ChordCard.tsx` — container card with chord name heading and instrument-conditional rendering
- [ ] 6.2 Implement guitar mode in ChordCard — render SVG via `<img>` tag, show variant cycling arrows (prev/next) when Variation Count > 1, display variant indicator ("2 / 5")
- [ ] 6.3 Create `components/PianoKeyboard.tsx` — procedural 2-octave HTML/CSS keyboard (C3 to B4) with white and black keys
- [ ] 6.4 Implement note highlighting in PianoKeyboard — highlight active notes with glow accent color, distinguish LH/RH for Drop 2 voicings
- [ ] 6.5 Implement "Randomize All" button — visible only in guitar mode, randomizes variant selection for all cards simultaneously

## 7. UI Components — App Shell

- [ ] 7.1 Create `components/Header.tsx` with "Harmony Hash" branding and Tonari Labs identity
- [ ] 7.2 Create `components/InstrumentToggle.tsx` — Guitar/Piano toggle with design system styling
- [ ] 7.3 Build `app/page.tsx` — compose all components in the page layout (Header → Input → Chord Cards)
- [ ] 7.4 Implement responsive layout — horizontal scroll / grid on desktop, 2-column on tablet, single-column stack on mobile

## 8. Integration & Polish

- [ ] 8.1 Wire global instrument toggle state through all ChordCards
- [ ] 8.2 Apply Tonari Labs design tokens throughout — glow accents on buttons/toggles, dark navy cards, proper typography
- [ ] 8.3 Test full flow: type "Cmaj7 Am9 Dm7 G7" → see 4 guitar chord cards → toggle to piano → toggle back → cycle variants → randomize
- [ ] 8.4 Test preset flow: pick "ii V I" → select key "Bb" → verify correct transposition → change key to "F#" → verify update
- [ ] 8.5 Verify all Vitest tests pass

## Why

Tonari Labs needs a focused, standalone web tool for musicians to create, visualize, and explore chord progressions on both guitar and piano. The previous ChordCorral feature inside Cadence (Noted-Sheets) is being deprecated due to systemic issues. Harmony Hash replaces it as a purpose-built app at harmony.tonari.ai — lighter, faster, and designed from scratch.

## What Changes

- **New web app** built with Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Chord data layer** that loads and indexes 600 chord entries from `chords_clean.json` (all 12 keys) with alias/symbol normalization
- **Free-text chord input** — users type space-separated chord symbols (e.g. `Cmaj7 Dm9 G13sus4`) with flexible notation acceptance (Cm7 = Cmin7 = C-7)
- **Preset progression picker** — curated progressions grouped by scale type (Major, Aeolian, Harmonic Minor, Modal), transposable to any key via dropdown
- **Guitar chord cards** — displays SVGs from the 2,775-file asset library with variant cycling (prev/next arrows) and a "Randomize All" button
- **Piano chord cards** — procedurally rendered 2-octave HTML/CSS keyboard with highlighted notes, Drop 2 voicing for 7th+ chords, root position for triads
- **Global instrument toggle** — switches all cards between Guitar and Piano view simultaneously
- Tonari Labs design system applied throughout (dark navy, glow accent, Zalando Sans)

## Capabilities

### New Capabilities
- `chord-data`: Loading, indexing, and querying the 600-entry chord catalog with alias resolution and SVG path mapping
- `harmony-brain`: Core logic engine — chord symbol parsing, normalization, roman-numeral-to-chord transposition, and Drop 2 voicing calculations
- `progression-input`: Both input modes (free-text and preset progression picker with key selector)
- `chord-card-display`: Chord card rendering for guitar (SVG variants with cycling) and piano (procedural keyboard)
- `app-shell`: Page layout, instrument toggle, Tonari design system integration, responsive structure

### Modified Capabilities
_(none — greenfield project)_

## Impact

- **New codebase**: Entirely new Next.js project — no existing code affected
- **Assets**: 2,775 guitar chord SVGs already in `public/music_src/chords/` organized as `<key>/<chord_type>/var_N.svg`
- **Data**: `chords_clean.json` (612 rows, 12 header rows + 600 chord entries) with fields: Chord Name, Notes (e.g. "C-E-G-Bf"), Steps (e.g. "1-3-5-b7"), Symbols (alias list), Type, Variation Count, Usage Notes
- **Note notation**: Uses `s` for sharp and `f` for flat in note names (e.g. "Ef" = E♭, "Fs" = F♯)
- **Dependencies**: Next.js 14, Tailwind CSS, Vitest (dev), Tonari design system (CDN)
- **Deployment**: Will be hosted at harmony.tonari.ai (deployment config not in v1 scope)

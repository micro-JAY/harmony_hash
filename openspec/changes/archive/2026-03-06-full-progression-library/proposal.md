## Why

The current Progressions tab has only 14 hardcoded presets covering basic Major, Natural Minor, Harmonic Minor, and Modal categories. The full Harmony Hash chord progression library (docs/hh-library.md) contains 65+ progressions across 4 tonality groups with rich subgroup structure. Users need access to the complete library — organized by tonality and subgenre — to make the tool genuinely useful for songwriting and production.

## What Changes

- Replace the inline `PRESET_PROGRESSIONS` array with a new structured data file (`src/data/progressions.ts`) encoding the full library from `docs/hh-library.md`
- Data model: 4 top-level tonality groups → named subgroups → progression arrays, each with `name` and `numerals` fields
- Replace the current category-based grouping selector with a Tonality selector (Major / Minor / Modal / Advanced)
- Render subgroups within each tonality with all-caps section labels and pill buttons for each progression
- Add hover tooltips showing progression names (e.g. "The Axis (Pop Standard)")
- Preserve existing Key selector, chord card rendering, and all other app behavior

## Capabilities

### New Capabilities
- `progression-library`: Full structured progression data covering all 4 tonality groups, their subgroups, and 65+ individual progressions with names and Roman numeral notation
- `progression-browser`: Tonality-based browser UI with subgroup labels, progression pill buttons, tooltips, and single-tonality-at-a-time display

### Modified Capabilities
<!-- No existing specs to modify — this is the first spec-driven change -->

## Impact

- **Files created**: `src/data/progressions.ts` (new data file)
- **Files modified**: `src/lib/types.ts` (new types), `src/components/ProgressionInput.tsx` (UI overhaul of Progressions tab), `src/lib/harmonyBrain.ts` (remove old `PRESET_PROGRESSIONS`, update transposition to handle new data shape)
- **No dependency changes** — no new packages required
- **No breaking changes** — Free Input tab and all chord rendering remain untouched

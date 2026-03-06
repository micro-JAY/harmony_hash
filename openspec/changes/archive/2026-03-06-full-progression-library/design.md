## Context

The Harmony Hash app currently has 14 hardcoded preset progressions in `PRESET_PROGRESSIONS` (defined in `src/lib/harmonyBrain.ts`). The Progressions tab groups these by `category` field (Major, Natural Minor, Harmonic Minor, Modal) and renders pill buttons per progression. The full library in `docs/hh-library.md` has 65+ progressions across 4 tonality groups with rich subgroup structure (e.g., "Jazz & R&B Fundamentals" under Major).

The existing transposition system (`transposeProgression`) takes a `numerals: string[]` array and a `ScaleType` to resolve Roman numerals into concrete chord names for a given key.

## Goals / Non-Goals

**Goals:**
- Encode the complete progression library as structured TypeScript data
- Provide a clear 4-option Tonality selector replacing the implicit category grouping
- Show subgroup labels within each tonality for easy browsing
- Preserve all existing functionality (Key selector, chord cards, Free Input tab)

**Non-Goals:**
- No search/filter within progressions (future work)
- No editing or user-defined progressions
- No changes to chord voicing, rendering, or the Free Input tab
- No minor-blend explanatory UI (hh-minor-blend.md is reference only for now)

## Decisions

### 1. New data file at `src/data/progressions.ts`

**Decision**: Create a standalone data file rather than extending `harmonyBrain.ts`.

**Rationale**: The progression library is pure data (65+ entries). Keeping it in its own file separates data from logic, makes it easy to update, and keeps `harmonyBrain.ts` focused on parsing/transposition. The old `PRESET_PROGRESSIONS` array in `harmonyBrain.ts` will be removed.

**Alternatives**: Keeping data inline in `harmonyBrain.ts` — rejected because it would bloat the logic file.

### 2. Data shape: nested groups → flat numeral strings

**Decision**: Structure as `TonalityGroup[]` where each group has `subgroups: Subgroup[]` and each subgroup has `progressions: Progression[]`. Each progression stores `numerals` as a single string (e.g., `'I – V – vi – IV'`) rather than a pre-split array.

**Rationale**: The markdown source uses en-dash separated notation. Storing as a single string preserves the display format exactly and avoids parsing discrepancies. The transposition function will split on ` – ` at call time. This is simpler and more maintainable.

**Alternatives**: Pre-split arrays — rejected because it duplicates effort and the display format would need reconstruction.

### 3. ScaleType inference from tonality group

**Decision**: Each `TonalityGroup` carries a default `scaleType`. Some subgroups or individual progressions may override with their own `scaleType` when needed (e.g., Harmonic Minor subgroup within Minor tonality, or Dorian/Mixolydian within Modal).

**Rationale**: The transposition engine needs a `ScaleType` to resolve Roman numerals. Major group → `"major"`, Minor group → `"natural_minor"` (with Harmonic Minor subgroup overriding), Modal subgroups each specify their own mode.

### 4. Tonality selector replaces category dropdown

**Decision**: Replace the current inline category grouping with an explicit 4-option selector matching the library's top-level structure: Major, Minor, Modal, Advanced.

**Rationale**: The library has 4 clear tonality groups. A selector lets users switch between them without scrolling through all 65+ progressions at once. Only one tonality's content is visible at a time, reducing cognitive load.

### 5. Tooltip via `title` attribute

**Decision**: Use native HTML `title` attribute for progression name tooltips rather than a custom CSS tooltip.

**Rationale**: Simplest approach — no extra CSS or state management. The `title` attribute provides a native tooltip on hover/long-press. Can be upgraded to a styled tooltip later if needed.

## Risks / Trade-offs

- **Large data file**: 65+ progressions is still manageable as a static TypeScript file. No runtime performance concern. → No mitigation needed.
- **ScaleType coverage**: Some Advanced progressions (chromatic movement, tritone subs) don't map cleanly to a single scale type. → Use `"major"` as default for Advanced group; the transposition engine handles accidentals (b, #) in Roman numerals already.
- **Minor blend complexity**: Minor progressions blend Natural and Harmonic minor. → Use `"natural_minor"` as default, override to `"harmonic_minor"` for the Harmonic/Classical Minor subgroup. The transposition engine's accidental handling covers the V vs v distinction.

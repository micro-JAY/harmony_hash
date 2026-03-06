## Context

Harmony Hash renders guitar chord diagrams as `<img>` tags pointing to prebuilt SVGs at `public/music_src/chords/<root>/<quality>/var_N.svg`. The SVGs use a consistent coordinate system: strings at x=45,75,105,135,165,195 (low E to high E), fret rows at y=56,96,136,176, with `<circle r='13'>` elements for finger dots and `<text>` elements for fingering numbers. Barre chords use `<rect>` elements spanning strings.

## Goals / Non-Goals

**Goals:** Add a 3-way display toggle to guitar cards, inline SVG rendering with label overlays, root dot accent highlighting.

**Non-Goals:** Modifying piano display, changing SVG file contents, adding audio playback.

## Decisions

### D1: Inline SVG via fetch + DOMParser
To overlay labels and recolor dots, the SVG must be inlined. Fetch the SVG text, parse with DOMParser, manipulate DOM nodes, serialize back to HTML string, render via a container div with innerHTML set in a ref callback. Cache parsed SVGs by URL in a useRef map to avoid re-fetching on display mode changes. SVG content is from local static files we control, but we strip any script tags as a precaution.

### D2: String/fret mapping from SVG coordinates
The SVG coordinate system is fixed:
- String X positions: `[45, 75, 105, 135, 165, 195]` — string indices `[5, 4, 3, 2, 1, 0]` (low E to high E)
- Standard tuning pitch classes: `[4, 11, 7, 2, 9, 4]` (high E=4, B=11, G=7, D=2, A=9, low E=4)
- Fret offset: extracted from first `<text x='20' ...>` content (e.g., "1", "2", "5")
- Fret row Y positions: `[56, 96, 136, 176]` — fret positions 0-3 within window
- `pitchClass = (stringPitchClass + fretOffset + fretRow) % 12`

### D3: Label overlay approach
For intervals/notes modes: add `<text>` elements inside the SVG, centered on each circle (`text-anchor="middle"`, `dominant-baseline="central"`). Font size = circle radius * 0.85. Remove existing fingering `<text>` siblings when in intervals/notes mode.

### D4: Root highlighting
Root pitch class derived from the chord's root note. All circles matching root pitch class get `fill="var(--text-accent)"` with label text in `fill="var(--surface-base)"`. Non-root circles get a neutral fill with dark text. Applied in all three modes.

### D5: Barre chord handling
Barre `<rect>` elements represent fretting across multiple strings at the same fret. For each barre rect, determine which strings it covers (from rect x to x+width) and the fret row. Generate virtual dots for each covered string at that fret.

## Risks / Trade-offs

- **SVG parsing fragility:** If SVG structure changes, parser breaks — Mitigation: fallback to plain `<img>` if no circles found
- **Inline SVG safety:** SVGs are local static files, but script tags are stripped as a precaution during parsing
- **Performance:** Fetching SVGs on mount adds latency — Mitigated by caching in ref, showing loading placeholder

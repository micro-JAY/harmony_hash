## Context

TUNE TOOLBOX already shares one root/scale/mood context across Scale Synthesia, Circle of Fifths, and Note Neural Network. Its current document order still privileges Circle, the Circle detail column stops at two adjacent keys, and relationship strength is repeated through decorative dash glyphs that destabilize alignment. HASHER owns its instrument state correctly in `App`, but renders the selector in the global header even though it affects only chord output. The existing Guitar and Piano renderers already know each active pitch class, while FRET FINDER and Scale Synthesia already expose the canonical interval-color function.

The in-flight NOTE NEURAL NETWORK continuation is deliberately isolated in `enhance-tune-toolbox-neural-synthesia`. This change must not alter its graph catalog, canvas, physics, details, or mobile projection.

## Goals / Non-Goals

**Goals:**

- Make Scale Synthesia the first and initially expanded Toolbox learning surface, followed by THE CIRCLE and Note Neural Network.
- Give THE CIRCLE useful mode and modulation guidance without introducing speculative analysis or changing shared network relationships.
- Remove decorative Circle dots/dashes while keeping Strong/Medium/Weak meaning explicit, aligned, localized, and non-color-dependent.
- Relocate the builder instrument selector to the controls it governs and pair it with the same interval vocabulary used across the learning tools.
- Carry shared degree colors into Guitar and Piano chord tones without changing notes, fingerings, voicings, playback, card size, or state ownership.
- Keep header navigation mathematically centered and keep Help/About and language controls accessible at all supported widths.

**Non-Goals:**

- No NOTE NEURAL NETWORK, FRET FINDER, Scale Synthesia playback, progression-agent, Worker/API, timeline, sharing, modifier, or voicing-algorithm change.
- No new global color system, runtime dependency, user preference, or persisted state.
- No removal of visible Help/About copy, locale options, relationship strength text, or non-color musical labels.

## Decisions

### Keep Circle insights pure and Circle-specific

Add immutable helpers alongside `circleOfFifths.ts` that derive a bounded set of three popular same-root modes and three common key-change routes from the selected root. Each item contains a destination, musical mechanism, characteristic tone or pivot, and a short concrete progression. Root spelling uses the existing canonical pitch helpers and all twelve roots are validated. The shared `buildTheoryRelationshipCatalog()` remains unchanged because Note Neural Network consumes it independently.

### Use document order as the primary Toolbox hierarchy

Render sections in Scale Synthesia → THE CIRCLE → Note Neural Network order and initialize Scale Synthesia as the only default expanded section. Update guided-tour targets to follow that same order. Use a dedicated localized product-name key for `THE CIRCLE`; generic explanatory “circle of fifths” strings remain music-theory prose.

### Replace Circle decoration with textual hierarchy

Delete the two SVG modulation arcs. Existing selected and adjacent sector borders retain spatial context. Relationship rows use a two-column grid with wrapping labels and fixed Strong/Medium/Weak badges; no Unicode line or dot swatches remain. Enharmonic display names use balanced parenthetical aliases (`F# (Gb)`) without changing stable circle IDs or canonical selected roots.

### Move, do not duplicate, instrument state

`App` remains the sole owner of `instrument`. It passes one output-tools React slot to `ProgressionInput`, which forwards it through the existing `ChordReferenceGrid.leadingContent` seam. The Browse/Undo toolbar renders Browse → Undo → Guitar/Piano → note-color legend in one wrapping region. Header no longer receives instrument props. The original `data-tour="instrument-switcher"` stays on the relocated control so onboarding retains its target.

### Reuse one interval-color source

The new compact HASHER legend and both chord renderers consume `intervalColor()` from `src/lib/visual/musicVisuals.ts`. Piano uses its existing `colorMode="interval"` path. Guitar maps each played dot’s pitch class relative to the chord root, colors the dot by that interval, and uses contrast-safe inverse text in every Fingering/Intervals/Notes mode. Barre geometry remains structural; generated per-string pitch evidence receives individual degree markers so one barre fill never misrepresents several notes.

### Refine header utilities without changing behavior

Help/About stays a labeled 44px action with the same focus-return ref and onboarding callback. EN/JP becomes an explicitly named two-button group with 44px targets and the same locale state. Scoped header CSS preserves the existing three-column centered navigation at desktop and bounded wrapping at tablet/mobile.

## Risks / Trade-offs

- **[Risk] Circle examples become enharmonically awkward outside C.** → Generate roots through existing canonical spelling helpers and unit-test all twelve roots for valid, balanced display output.
- **[Risk] Added Circle guidance overwhelms the detail column.** → Use two bounded, collapsible-friendly compact sections of exactly three items each, with no new global controls.
- **[Risk] Relocated output controls wrap unevenly on mobile or Japanese.** → Keep every group intrinsic and wrapping, avoid fixed toolbar widths, and assert order/containment at 1500, 820, and 375 pixels in both locales.
- **[Risk] Color becomes the only degree signal.** → Keep visible interval abbreviations in the legend and existing fingering/note/interval labels on diagrams.
- **[Risk] Guitar barres receive a misleading single color.** → Keep the barre neutral and overlay the parser’s per-string virtual dots with their actual interval colors.
- **[Risk] Scope leaks into active neural-network work or FRET FINDER.** → Use disjoint files, compare `git diff --name-only` to the branch base, and run focused network/FRET regressions plus the complete suite.

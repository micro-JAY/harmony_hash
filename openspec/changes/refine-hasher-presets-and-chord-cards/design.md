## Context

PR #75 consolidated HASHER into one progression flow, introduced modal chord modification and voicing comparison, and centralized chord-family classification. The complete attached contract plus the post-PR correction prompt govern this change. The remaining issues cross the header, progression composer, curated library UI, action rail, global chord/degree color semantics, card toolbars, procedural Piano renderer, and IMPROV INSIGHT. The runtime progression catalogue already contains the rows visible in the supplied Major, Minor, Modal, and Advanced screenshots; the original one-subgroup horizontal carousel made much of that catalogue appear missing.

The change must preserve one application-owned timeline, dictionary validation, lock/variant/style state, playback and Hanz invalidation, Japanese localization, reduced-motion behavior, and the established exception that generated chord cards may use more horizontal space than centered tool panels. No provider, Worker, or persistence contract changes are required.

## Goals / Non-Goals

**Goals:**

- Make the four HASHER preset categories complete, scannable, and selection-driven through accessible dialogs.
- Make chord-chip removal obvious without restoring the persistent handles, arrows, and insertion buttons the user rejected.
- Use one tested chord-family classifier and token set across grid headers, chord-card names, and modifier choices while keeping key blues and percentage gradients separate.
- Keep Guitar card controls geometrically centered and Piano cards equal in size with every active key visible.
- Apply family colors to every visible dictionary-chord label, including the composer, Circle, and FRET FINDER overlays.
- Give IMPROV INSIGHT one pale-pink action/surface language, complete vocabulary help, shared named-degree colors, correct typography, compact bounded layout, and origin-local access from Circle.
- Preserve exact visible action labels/icons and keep Hanz out of the progression action rail.
- Preserve exact timeline mutation, focus, keyboard, drag/drop, responsive, and localization behavior.

**Non-Goals:**

- Adding new progressions that are absent from both the supplied references and `docs/hh-library.md`.
- Broadly redesigning chord lookup, Roman-numeral syntax, voicing theory, playback scheduling, Hanz tools, or provider APIs beyond the three shipped ambiguous slash cases.
- Recoloring interval roles, mode identities, match-score gradients, playback focus, or Hanz focus.
- Changing IMPROV scale-ranking math, Circle relationship math, FRET FINDER pitch mapping, or SCALE SYNTHESIA formulas.

## Decisions

### 1. Center the workspace navigation with structural layout, not visual offsets

At desktop widths, the top bar will use a three-region grid (`minmax(0, 1fr) / auto / minmax(0, 1fr)`): brand at the start, workspace navigation in the true center column, and utilities/instrument controls aligned at the end. At responsive breakpoints the existing wrapped full-width navigation remains, centered within its row.

This avoids negative margins or transforms that would center the tabs only for one combination of locale, instrument, and help-label width. A flex-grow spacer approach was considered, but unequal brand and utility widths still shift the perceived and measured center.

### 2. Four category buttons open one reusable preset dialog

The bordered preset surface will contain only four centered category buttons. Activating a button sets the selected `TonalityGroup` and opens `AccessibleDialog`; the dialog renders every subgroup and every progression for that group in normal document flow. Major, Minor, and Modal retain subgroup headings; Advanced renders its single subgroup without a redundant navigation layer. Selecting a progression applies the existing shared timeline transaction, closes the dialog, and restores focus to the originating category button.

The dialog will reuse the established modal primitive for focus containment, Escape/outside dismissal, reduced motion, and mobile scrolling. Keeping the current horizontally clipped subgroup/preset carousels was rejected because it hides catalogue size and recreates the reported missing-data impression.

`PROGRESSION_LIBRARY`, `docs/hh-library.md`, and the supplied references form a three-way audit. Tests will compare source and documentation hierarchy and assert the expected category/subgroup counts and representative complete lists. Existing entries are preserved verbatim unless that audit proves an actual omission.

### 3. Selection reveals removal; a deliberate outside release removes

The composer keeps each chip as the draggable/focusable timeline item. Pointer click or keyboard focus marks one chip selected and reveals a compact `X` attached to that chip; Delete/Backspace remains the keyboard shortcut and the polite live-region announcement remains authoritative. Persistent drag handles, move arrows, insertion `+` controls, and always-visible remove buttons stay removed.

Dropping an existing chip inside calculates the existing exact insertion boundary and reorders. After the drag threshold is crossed, a deliberate touch/pen `pointerup` anywhere outside the composer removes the item through the same `onRemove` timeline transaction. Native mouse drag uses document-level capture only while an existing chip is active: a real `drop` inside the viewport and outside the composer removes; `dragend` alone never removes. Escape, `pointercancel`, lost capture, or a drag that emits no valid drop remains inert. External dictionary-chord drags cannot remove because they do not own an existing composer identity.

An unqualified `dragend`/`dropEffect === none` rule and a separate mandatory removal strip were rejected. The former can delete on cancellation; the latter contradicts the requested direct outside-drop behavior.

### 4. One semantic family classifier, with distinct presentation roles

`src/lib/visual/chordFamily.ts` remains the only chord-family classifier. It will be covered across plain major, major extensions, minor, dominant/altered dominant, suspended, diminished/half-diminished, and augmented aliases. Every rendered dictionary-chord label consumes its presentation helper rather than reimplementing suffix parsing. The canonical family tokens remain:

- Major: pastel green
- Minor: pastel orange
- Dominant: deep red
- Suspended: light yellow near Tonari gold
- Diminished: soft pink
- Augmented: white

The grid quality header uses a lightly tinted family surface and family border/text. Card headings and modifier chord names use the family foreground. Small dominant text must meet the required contrast against its actual surface; where the deep-red hue cannot do so as bare text, the component uses the deep-red fill with a contrast-safe text token rather than silently brightening it into pastel red.

Key/root row blues, interval colors, modal colors, and 0–100 match gradients remain separate layers. Modifier `Top picks` percentages always use the existing match-tier helper; the candidate chord name uses its family color. Visible family labels and chord names ensure color is never the only cue. Composer chips, Circle chords, and FRET FINDER overlay labels use family foreground/tint while retaining their existing selection, strength, and focus semantics.

### 5. Card toolbars use symmetric grid alignment

Guitar card toolbars will use a three-column grid: modifier trigger at the start, the `Fingering / Intervals / Notes` segmented control in the center, and an equal balancing column at the end. When the card is too narrow, the modifier occupies its own row and the segmented control spans a second centered row. This keeps the labels centered independently of modifier-trigger width.

Piano cards render the modifier trigger but no display-label segmented control. Their voicing-style selector derives only from `isVoicingStyleAvailable`; unavailable styles are omitted rather than rendered disabled or reserving layout space. A centered wrapping flex layout replaces fixed grid tracks and fixed two-row height, so three, five, or six applicable choices consume only their real bounded content while sibling-card equal height remains owned by the card grid. The comparison trigger continues to open the existing accessible modal.

### 6. Piano keyboard geometry becomes proportional and fluid

The procedural C3–B5 keyboard will retain the full musical range and the card's full available keyboard surface, but key geometry will be expressed as normalized percentages rather than a fixed 630-pixel strip. Each white key occupies `1 / 21` of the available width, black keys use proportional offsets, and labels/dots adapt at compact widths without changing MIDI mapping. Thus wide voicings remain fully visible while individual keys become narrower inside the same card width.

All Piano cards use the same content-height contract: the filtered style row reserves bounded wrapped space, the keyboard keeps a stable aspect/height range, and note/voicing metadata does not expand one card unpredictably. The comparison dialog may use a separate compact keyboard size but shares the same proportional geometry.

Cropping to the active-note window was rejected because identical chords would lose a stable keyboard reference. Horizontally scrolling the primary card keyboard was rejected because it recreates the hidden-key problem. Shrinking the entire keyboard panel was rejected because the user explicitly wants the card and keyboard surface to stay visually consistent.

### 7. Verification is requirement-shaped

Pure tests cover progression hierarchy parity, family classification, color-token mapping, proportional piano geometry, style availability, and drag/remove boundary decisions. Component tests cover dialog inventory, focus restoration, selected-chip removal, cancelled drag safety, centered toolbar structure, and hidden unavailable piano styles. Playwright covers desktop/tablet/375px and transition widths; pointer and keyboard preset selection/removal; drag-in reorder and drag-out removal; all active piano keys inside the card; equal card bounds; no document overflow; Japanese text; reduced motion; contrast; and regression of locks, variants, playback cancellation, Hanz focus, and stale-agent invalidation.

Visual baselines will be updated only after direct inspection of Major/Minor/Modal/Advanced dialogs, Guitar cards, and representative compact/wide Piano voicings.

### 8. Shipped Roman-slash compatibility is explicit and narrow

The library documents Roman slash tokens as chord-over-bass notation, so `I/III` resolves to the tonic chord over scale degree III and the named Soulful Descent's `V/vii` retains its descending-bass `G/B` intent in C major. The one explicit exception is the Advanced preset named Secondary Pull: its natural uppercase `V/ii` is interpreted conventionally as the dominant of ii, yielding A in C major. An explicit extension remains explicit (`V7/ii` yields A7); the parser does not invent a seventh for bare `V/ii`.

General reinterpretation of every slash target as tonicization was rejected because it would break the two documented inversion presets. Treating every slash as an inversion was rejected because it makes the named Secondary Pull harmonically false. Focused examples plus all-key dictionary resolution lock this compatibility boundary.

### 9. IMPROV INSIGHT owns a dedicated semantic visual layer

All launch actions use one `music-insight` token family: near-white pink for the primary action and restrained translucent pink for selected tabs, all four metadata categories, help, and panel borders. Match percentages/meters remain on the independent low/mid/high score gradient, and named-degree notes remain on the shared interval palette. The per-chord selector uses the IMPROV surface family rather than HASHER gold or Toolbox blue. The vocabulary launcher keeps a 44px transparent hit target around a 20px circular pink glyph so its accessible target never renders as a rectangular highlight.

The shared `intervalColor()` helper remains the single source for SCALE SYNTHESIA, IMPROV INSIGHT, and FRET FINDER. Suggested scale names use the Root degree token and each note uses its formula interval, so examples such as Ab in F Major Blues resolve to the same minor-third purple everywhere. The scale title stays on the display face. Result rows cap the match block at 14rem, reduce inter-note spacing, and remain inside the centered 72rem content rail; generated chord cards remain the only allowed wider exception.

The vocabulary `?` opens an accessible dialog covering Motion (Smooth/Jumpy), Tension (Rises/Static/Falls), Palette (Diatonic/Chromatic), and Style (Tonal/Modal/Blues), including category and option explanations. Circle/Toolbox launch renders the same panel locally without changing workspace, instrument, progression, or shared theory context; closing restores the exact origin trigger.

### 10. The media rail is literal and Hanz remains contextual

The progression action rail exposes exactly `RANDOMIZE (UNLOCKED VOICES)`, icon-backed `PLAY`/`STOP`, icon-backed `SHARE`, and `IMPROV INSIGHT` when valid. Visible text and accessible names remain aligned. Hanz has no standalone media action and is activated only from the progression prompt's dynamic help affordance.

## Risks / Trade-offs

- **[Risk] Drag-out removal can be mistaken for a cancelled drag.** → Remove only after a threshold-qualified pointer release or actual native drop outside the composer; never infer deletion from `dragend` alone.
- **[Risk] Dialog inventory can become dense on mobile.** → Use a vertically scrollable modal body with subgroup headings and wrapped buttons; keep the page itself overflow-free.
- **[Risk] A family alias is classified incorrectly.** → Classify from matched chord quality/display identity, not comma-separated alias catalog text, and add exhaustive representative alias tests.
- **[Risk] Deep dominant red lacks small-text contrast.** → Test contrast on each real surface and use deep-red fill plus contrast-safe foreground where necessary.
- **[Risk] Fluid piano keys make labels crowded.** → Adapt label size/visibility independently from active-key visibility and retain complete accessible note names.
- **[Risk] Outside-drop removal fires for a cancelled native drag.** → Remove only on an actual captured `drop` or threshold-qualified `pointerup`; keep `dragend`, Escape, `pointercancel`, and lost capture reset-only.
- **[Risk] Global family colors overwrite score, focus, or relationship meaning.** → Apply family presentation only to chord-name text/tint layers and retain the existing non-color/semantic state layers.
- **[Risk] Pink IMPROV accents flatten musical colors.** → Keep match gradients and interval/named-degree colors explicitly independent while using pink only for the four descriptive metadata surfaces.
- **[Risk] Header centering regresses Japanese or narrow layouts.** → Keep the desktop grid decision breakpoint-scoped and test English/Japanese geometry at desktop, tablet, and mobile widths.

## Migration Plan

1. Land the OpenSpec artifacts and commit them as the specification boundary on the current PR #75 successor branch.
2. Implement pure catalogue/family/geometry helpers and focused tests.
3. Implement preset and composer interactions, then card/Piano presentation, with milestone commits.
4. Complete global chord colors, the exact action rail, IMPROV INSIGHT, shared degree colors, and origin-local theory access.
5. Run full local gates, responsive Browser/Playwright QA, and independent review; repair all P0–P2 findings.
6. Push and update the review PR without deploying from an unmerged branch.
7. After merge and exact-main CI, deploy the reviewed Worker/static bundle and verify the live HASHER flows.

Rollback is a normal revert of the implementation commits. No persistent user data or external schema migration is involved; URL sharing, provider configuration, and Worker secrets are unchanged.

## Open Questions

None. The supplied screenshots and written requirements resolve the interaction, palette, catalogue, and minimum piano-visibility decisions for this round.

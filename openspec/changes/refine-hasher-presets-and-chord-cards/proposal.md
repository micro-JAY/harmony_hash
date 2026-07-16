## Why

PR #75 established the unified HASHER flow, but the reviewed interface still contradicts the requested behavior in several high-use paths: the workspace tabs are off-center, the preset browser hides much of the curated catalogue, chord removal is not discoverable, chord-family colors are inconsistent, guitar controls are misaligned, and larger piano voicings can clip or distort card sizing. These corrections must land before the remaining tab-by-tab polish so the shared HASHER foundation is trustworthy.

## What Changes

- Center the primary workspace navigation across supported desktop and responsive layouts without displacing utility or instrument controls.
- Replace the inline preset carousel with four centered category buttons—Major, Minor, Modal, and Advanced—inside the existing bordered preset area. Each button opens an accessible category dialog containing every documented subgroup and progression for that category; choosing a progression closes the dialog and loads it into the shared timeline.
- Restore full parity between the curated progression source, documented library, and rendered preset dialogs, including every progression shown in the supplied Major, Minor, Modal, and Advanced references.
- Make Build Your Own removal direct and discoverable: a focused or selected chord chip reveals an `X` removal action, and dragging a chip outside the composer removes it. Persistent move arrows, insertion `+` controls, and visible drag handles remain absent.
- Standardize chord-family presentation across Harmony Hash while preserving separate key-row blues and percentage-match gradients: Major pastel green, Minor pastel orange, Dominant deep red, Suspended light yellow, Diminished soft pink, and Augmented white. Apply the family color to chord-grid quality headers, rendered chord-card titles, and chord names inside the modifier dialog, with non-color labels and sufficient contrast.
- Keep the chord modifier as an accessible popup, retain the `Top picks` name, and show contextual fit percentages using the existing match-score color scale rather than chord-family colors.
- Center and equalize the Guitar `Fingering`, `Intervals`, and `Notes` controls within every card. Piano cards do not render that label selector.
- Keep piano cards at a consistent progression-grid size while ensuring every active key remains visible. Adapt key width/spacing for wide voicings without shrinking the keyboard surface, hide unavailable voicing styles instead of reserving disabled space, and preserve the modal voicing-comparison workflow.
- Add responsive, pointer, keyboard, drag/drop, focus-restoration, color/contrast, catalogue-completeness, and piano-visibility coverage for the corrected behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: Keep the primary workspace tabs geometrically centered while header utilities remain usable at desktop, tablet, and mobile widths.
- `progression-input`: Replace the inline preset strip with category dialogs and add direct chip removal by selected `X` or drag-out while preserving the shared timeline and accessible keyboard behavior.
- `progression-library`: Require complete source/document/rendered parity for every Major, Minor, Modal, and Advanced progression and subgroup.
- `harmony-brain`: Preserve the documented slash-bass intent of `I/III` and the named Soulful Descent while resolving the named Secondary Pull's `V/ii` as a real secondary dominant.
- `chord-grid-suggestions`: Apply the shared chord-family palette to quality headers without replacing key-row blues, suggestion tiers, percentages, or non-color fit evidence.
- `chord-card-display`: Apply chord-family color to card titles, center instrument controls, remove the piano label selector, hide unavailable piano styles, and keep full active voicings visible inside consistently sized cards.
- `guitar-display-mode`: Center and align the three Guitar display-mode options while retaining their existing rendering semantics.
- `quick-chord-modifiers`: Require an accessible popup with family-colored chord names and match-gradient `Top picks` percentages while preserving timeline replacement, search, and focus behavior.

## Impact

The change affects the shared header/navigation, HASHER preset and composer surfaces, narrow compatibility handling for the three shipped ambiguous Roman-slash presets, progression library validation, chord-grid headers, chord-card and piano-keyboard layout, guitar display controls, modifier dialog, design tokens, localization, and their unit/Playwright/visual baselines. It does not change provider APIs, Worker routes, chord-dictionary contents, playback scheduling, Hanz authority, or the intentional interval/mode/score color systems outside the chord-family mapping.

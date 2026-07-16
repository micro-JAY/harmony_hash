## Why

PR #75 established the unified HASHER flow, but the reviewed interface still contradicts the complete screenshot-backed request in several high-use paths: the workspace tabs were off-center, the preset browser hid much of the curated catalogue, chord removal was not discoverable, chord-family colors were inconsistent, guitar controls were misaligned, and larger piano voicings could clip or distort card sizing. The first correction pass repaired those foundations, but a full-contract audit found four remaining mismatches: arbitrary outside-composer drops still cancel, family colors stop short of several chord-name surfaces, Piano selectors reserve fixed empty tracks, and IMPROV INSIGHT still carries old blue launch controls and incomplete degree-color coverage. These corrections must land before the remaining tab-by-tab polish so the shared HASHER foundation is trustworthy.

## What Changes

- Center the primary workspace navigation across supported desktop and responsive layouts without displacing utility or instrument controls.
- Replace the inline preset carousel with four centered category buttons—Major, Minor, Modal, and Advanced—inside the existing bordered preset area. Each button opens an accessible category dialog containing every documented subgroup and progression for that category; choosing a progression closes the dialog and loads it into the shared timeline.
- Restore full parity between the curated progression source, documented library, and rendered preset dialogs, including every progression shown in the supplied Major, Minor, Modal, and Advanced references.
- Make Build Your Own removal direct and discoverable: a focused or selected chord chip reveals an `X` removal action, and dragging a chip outside the composer removes it. Persistent move arrows, insertion `+` controls, and visible drag handles remain absent.
- Standardize chord-family presentation across every visible dictionary-chord surface in Harmony Hash while preserving separate key-row blues and percentage-match gradients: Major pastel green, Minor pastel orange, Dominant deep red, Suspended light yellow, Diminished soft pink, and Augmented white. This includes composer chips, chord-grid quality headers, rendered chord-card titles, modifier choices, Circle chord labels, and FRET FINDER overlays, with non-color labels and sufficient contrast.
- Keep the chord modifier as an accessible popup, retain the `Top picks` name, and show contextual fit percentages using the existing match-score color scale rather than chord-family colors.
- Center and equalize the Guitar `Fingering`, `Intervals`, and `Notes` controls within every card. Piano cards do not render that label selector.
- Keep piano cards at a consistent progression-grid size while ensuring every active key remains visible. Adapt key width/spacing for wide voicings without shrinking the keyboard surface, hide unavailable voicing styles instead of reserving disabled space, and preserve the modal voicing-comparison workflow.
- Keep the action rail exact and compact: `RANDOMIZE (UNLOCKED VOICES)`, icon-backed `PLAY`/`STOP`, icon-backed `SHARE`, and `IMPROV INSIGHT`; Hanz remains reachable only through the progression prompt's contextual help controls.
- Complete the dedicated IMPROV INSIGHT presentation across HASHER and TUNE TOOLBOX: pale pink launch/actions and in-panel accents, neutral Style metadata, a complete four-category vocabulary dialog, display-face scale names, shared named-degree colors for scale names and notes across IMPROV INSIGHT, SCALE SYNTHESIA, and FRET FINDER, bounded centered width, compact notes, and a short aligned match meter.
- Keep IMPROV INSIGHT in the workspace that launched it, including Circle of Fifths, without switching the user to HASHER; close returns focus to the originating control without mutating the timeline.
- Add responsive, pointer, keyboard, drag/drop, focus-restoration, color/contrast, catalogue-completeness, and piano-visibility coverage for the corrected behavior.

## Capabilities

### New Capabilities

- `music-visual-system`: Define the global chord-family and named-degree color contracts used by every chord, scale, and instrument-learning surface.

### Modified Capabilities

- `app-shell`: Keep the primary workspace tabs geometrically centered while header utilities remain usable at desktop, tablet, and mobile widths.
- `progression-input`: Replace the inline preset strip with category dialogs and add direct chip removal by selected `X` or drag-out while preserving the shared timeline and accessible keyboard behavior.
- `progression-library`: Require complete source/document/rendered parity for every Major, Minor, Modal, and Advanced progression and subgroup.
- `harmony-brain`: Preserve the documented slash-bass intent of `I/III` and the named Soulful Descent while resolving the named Secondary Pull's `V/ii` as a real secondary dominant.
- `chord-grid-suggestions`: Apply the shared chord-family palette to quality headers without replacing key-row blues, suggestion tiers, percentages, or non-color fit evidence.
- `chord-card-display`: Apply chord-family color to card titles, center instrument controls, remove the piano label selector, hide unavailable piano styles, and keep full active voicings visible inside consistently sized cards.
- `guitar-display-mode`: Center and align the three Guitar display-mode options while retaining their existing rendering semantics.
- `quick-chord-modifiers`: Require an accessible popup with family-colored chord names and match-gradient `Top picks` percentages while preserving timeline replacement, search, and focus behavior.
- `theory-workspace`: Give every IMPROV INSIGHT entry point and internal learning surface one dedicated pale-pink language, complete vocabulary help, shared degree colors, bounded geometry, and origin-local focus behavior.

## Impact

The change affects the shared header/navigation, HASHER preset/composer/action surfaces, narrow compatibility handling for the three shipped ambiguous Roman-slash presets, progression library validation, global chord labels, chord-grid headers, chord-card and piano-keyboard layout, guitar display controls, modifier/comparison dialogs, IMPROV INSIGHT and Circle handoff presentation, shared interval colors, design tokens, localization, and their unit/Playwright/visual baselines. It does not change provider APIs, Worker routes, chord-dictionary contents, progression or scale ranking math, playback scheduling, or Hanz authority.

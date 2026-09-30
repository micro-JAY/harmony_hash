## Context

The app shares chord identity between browser and Worker, while guitar shapes are static SVG variants. Instrument choice also affects playback, floating previews and MIDI export. Tune Toolbox already keeps collapsible tools mounted so their state survives tab changes.

## Goals / Non-Goals

**Goals:** Reuse the shared chord parser, preserve progression identities across instrument switches, generate bounded ukulele fingering variants, and make optional learning controls visually subordinate.

**Non-Goals:** Alternate ukulele tunings, changing provider authentication, deployment, or revising the guided tour before approval.

## Decisions

- Use standard re-entrant tuning G4 C4 E4 A4, from string 4 to string 1. Absolute pitches drive playback and slash-bass checks; physical string order must not imply ascending pitches.
- Derive ukulele shapes from shared parsed chord tones using a deterministic bounded search and ergonomic ranking. Prefer complete shapes; for more than four unique tones retain defining tones and label omissions. If a shape cannot satisfy the chord, keep the card with an explicit availability message. Never relabel the requested chord as a different chord.
- Keep ukulele variant selection independent from guitar SVG filenames; adapt card rendering, playback and exports through common voicing helpers. Existing guitar and piano paths retain their behavior.
- Embed Fret Finder as the first persistent toolbox disclosure. Its root/scale follow the shared toolbox context, eliminating duplicate root/mode controls. Keep instrument immediately visible; place tuning, orientation, labels, patterns and overlay under a single settings disclosure. Shared mood filtering also becomes optional.
- Align select and segmented controls using the same semantic control height. Keep every layout contained on mobile; the fretboard has its own horizontal scroller.

## Risks / Trade-offs

- Four strings cannot express every extended chord → disclose omitted tones and test that unrelated cards and playback still work.
- Re-entrant tuning complicates bass placement → compare absolute MIDI pitches rather than string index and report unavailable slash bass honestly.
- Instrument types touch voice context and exports → broad type, unit and browser regressions cover all consumers.
- Moving the tool invalidates old navigation selectors → migrate functional tests; defer editorial tour changes, documenting any affected tour route for the approval stage.

## Migration Plan

Deliver on isolated feature branches and verify a combined local preview. Keep main and production unchanged until the user reviews the features. Archive specs only after merge.

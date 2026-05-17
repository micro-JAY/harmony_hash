## ADDED Requirements

### Requirement: Voicing style applicability
The system SHALL expose a predicate that determines whether a given voicing style is applicable to a chord's note set.

#### Scenario: Auto is always applicable
- **WHEN** the chord has at least one note
- **THEN** `isStyleApplicable(notes, "auto")` SHALL return `true`

#### Scenario: Drop 2 / Drop 3 / Rootless require 4+ notes
- **WHEN** the chord has fewer than 4 notes
- **THEN** `isStyleApplicable(notes, "drop2")`, `"drop3"`, and `"rootless"` SHALL each return `false`
- **WHEN** the chord has 4 or more notes
- **THEN** the same three SHALL each return `true`

#### Scenario: Shell requires a true 7th interval
- **WHEN** the chord has 4+ notes and the interval from root to the 4th note is 10 (minor 7) or 11 (major 7) semitones
- **THEN** `isStyleApplicable(notes, "shell")` SHALL return `true`
- **WHEN** the 4th note is not a 7th (e.g. C6 has a major 6 at index 3, Cadd9 has a 9th)
- **THEN** `isStyleApplicable(notes, "shell")` SHALL return `false`

### Requirement: Style-constrained voicing
The system SHALL compute a single voiced chord for a given style. Returns the canonical voicing (lowest inversion at the lowest starting octave that fits C3-B5).

#### Scenario: Drop 2 of Cmaj7
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "drop2")`
- **THEN** the result SHALL be MIDI `[55, 60, 64, 71]` (G3, C4, E4, B4) with `voicingType: "drop2"`

#### Scenario: Drop 3 of Cmaj7
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "drop3")`
- **THEN** the result SHALL be MIDI `[52, 60, 67, 71]` (E3, C4, G4, B4) with `voicingType: "drop3"`

#### Scenario: Rootless of Cmaj7
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "rootless")`
- **THEN** the result SHALL be MIDI `[52, 55, 59]` (E3, G3, B3) with `voicingType: "rootless"`

#### Scenario: Shell of Cmaj7
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "shell")`
- **THEN** the result SHALL be MIDI `[52, 59]` (E3, B3) with `voicingType: "shell"`

#### Scenario: Fallback on non-applicable style
- **WHEN** computing `computeVoicingForStyle(["C","E","G"], "drop2")` (triad + Drop 2)
- **THEN** the result SHALL match `computeVoicing(["C","E","G"])` (closed root position) with `voicingType: "root"`

### Requirement: Voice-leading honors per-chord styles
The system SHALL accept an optional `styles` array on `computeVoiceLedProgression`. When provided, each chord's candidate set is constrained to the named style; voice-leading picks the smoothest inversion within that constraint.

#### Scenario: All-shell ii-V-I
- **WHEN** computing `computeVoiceLedProgression([Dm7, G7, Cmaj7], ["shell","shell","shell"])`
- **THEN** the result SHALL be voicings: Dm7 = `[F3, C4]`, G7 = `[F3, B3]`, Cmaj7 = `[E3, B3]`
- **AND** every voicing SHALL have `voicingType: "shell"`

#### Scenario: Auto styles reproduce v2 behavior
- **WHEN** the provided styles are all `"auto"`
- **THEN** the result SHALL be identical to calling `computeVoiceLedProgression` without the `styles` argument

#### Scenario: Mid-progression fallback
- **WHEN** a style is not applicable to a specific chord (e.g. shell on a triad)
- **THEN** that chord SHALL fall back to `computeVoicing`'s output and voice-leading SHALL continue from the fallback voicing

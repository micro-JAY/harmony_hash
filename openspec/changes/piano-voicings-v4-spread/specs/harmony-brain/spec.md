## ADDED Requirements

### Requirement: Spread voicing
The system SHALL compute a 10th-interval "spread" voicing: the root sits in the left hand at the chosen starting octave; every subsequent chord tone sits in the right hand starting at least one octave above the root and ascending. The 3rd lands at the next available octave above the root (a 10th interval — major 10th = 16 semitones; minor 10th = 15).

#### Scenario: Cmaj7 spread
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "spread")`
- **THEN** the result SHALL be MIDI `[48, 64, 67, 71]` (C3 LH, E4 G4 B4 RH) with `voicingType: "spread"`

#### Scenario: Dm7 spread
- **WHEN** computing `computeVoicingForStyle(["D","F","A","C"], "spread")`
- **THEN** the result SHALL be MIDI `[50, 65, 69, 72]` (D3 LH, F4 A4 C5 RH) with `voicingType: "spread"`

#### Scenario: G7 spread
- **WHEN** computing `computeVoicingForStyle(["G","B","D","F"], "spread")`
- **THEN** the result SHALL be MIDI `[55, 71, 74, 77]` with `voicingType: "spread"`

#### Scenario: High-root spread (Bmaj7) pushes RH into oct 5
- **WHEN** computing `computeVoicingForStyle(["B","Ds","Fs","As"], "spread")`
- **THEN** the result SHALL be MIDI `[59, 75, 78, 82]` (B3 LH, D#5 F#5 A#5 RH) — the RH skips oct 4 to stay above B3+12=71

#### Scenario: Triad spread retains 3-note voicing
- **WHEN** computing `computeVoicingForStyle(["C","E","G"], "spread")`
- **THEN** the result SHALL be MIDI `[48, 64, 67]` with `voicingType: "spread"`

#### Scenario: Root is left hand, rest is right hand
- **WHEN** any spread voicing is computed
- **THEN** the first note (root) SHALL have `hand: "left"` and every subsequent note SHALL have `hand: "right"`

#### Scenario: Applicability
- **WHEN** `isStyleApplicable(notes, "spread")` is called on a chord with 3+ notes
- **THEN** it SHALL return `true`
- **WHEN** called on an empty chord
- **THEN** it SHALL return `false`

### Requirement: Two-hand voicing
The system SHALL compute a "two-hand spread" voicing: the left hand plays root + 5th (or root only for triads); the right hand plays the remaining chord tones (3rd + 7th + extensions) starting one octave above the LH root.

#### Scenario: Cmaj7 two-hand
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B"], "two-hand")`
- **THEN** the result SHALL be MIDI `[48, 55, 64, 71]` (LH C3-G3, RH E4-B4) with `voicingType: "two-hand"`

#### Scenario: G7 two-hand
- **WHEN** computing `computeVoicingForStyle(["G","B","D","F"], "two-hand")`
- **THEN** the result SHALL be MIDI `[55, 62, 71, 77]` (LH G3-D4, RH B4-F5) with `voicingType: "two-hand"`

#### Scenario: Triad two-hand simplifies to LH=root, RH=3rd+5th
- **WHEN** computing `computeVoicingForStyle(["C","E","G"], "two-hand")`
- **THEN** the result SHALL be MIDI `[48, 64, 67]` with LH = C3 and RH = E4 + G4

#### Scenario: 5-note chord (Cmaj9) two-hand
- **WHEN** computing `computeVoicingForStyle(["C","E","G","B","D"], "two-hand")`
- **THEN** the result SHALL be MIDI `[48, 55, 64, 71, 74]` (LH C3-G3, RH E4-B4-D5)

#### Scenario: Hands are visually separated
- **WHEN** any two-hand voicing is computed for a 4+ note chord
- **THEN** at least one note SHALL have `hand: "left"` and at least one SHALL have `hand: "right"`

#### Scenario: Applicability
- **WHEN** `isStyleApplicable(notes, "two-hand")` is called on a chord with 3+ notes
- **THEN** it SHALL return `true`
- **WHEN** called on an empty chord
- **THEN** it SHALL return `false`

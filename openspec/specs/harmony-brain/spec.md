## ADDED Requirements

### Requirement: Chord symbol parsing
The system SHALL parse a space-separated string of chord symbols into an ordered list of resolved chord entries.

#### Scenario: Simple chord string
- **WHEN** the user inputs "Cmaj7 Dm7 G7 C"
- **THEN** the parser SHALL return an array of 4 resolved chord entries in order

#### Scenario: Unrecognized chord
- **WHEN** the user inputs a chord symbol that does not match any entry in the catalog (e.g. "Xaug99")
- **THEN** the parser SHALL return an error object for that position identifying the unrecognized symbol, while still parsing the remaining chords

#### Scenario: Empty input
- **WHEN** the user inputs an empty string or whitespace only
- **THEN** the parser SHALL return an empty array

### Requirement: Chord symbol normalization
The system SHALL normalize user-typed chord symbols to match catalog entries using the Symbols alias field. Equivalent notations MUST resolve to the same chord entry.

#### Scenario: Minor seventh aliases
- **WHEN** the user types "Cm7", "Cmin7", or "C-7"
- **THEN** all three SHALL resolve to the same chord entry (C Minor Seventh)

#### Scenario: Parenthetical notation
- **WHEN** the user types "E7(#9)" or "E7#9"
- **THEN** both SHALL resolve to the same chord entry (E Dominant 7th Sharp 9)

#### Scenario: Suspended chord notation
- **WHEN** the user types "G13sus4" or "G13(sus4)"
- **THEN** both SHALL resolve to the same chord entry

#### Scenario: Sharp/flat input normalization
- **WHEN** the user types "Eb", "E♭", or "Ef" as a root note
- **THEN** all three SHALL normalize to the internal "Ef" representation for lookup

#### Scenario: Major chord shorthand
- **WHEN** the user types just a root note like "C" with no quality suffix
- **THEN** it SHALL resolve to the major chord entry (C Major)

### Requirement: Roman numeral transposition
The system SHALL convert roman numeral progressions (e.g. "I V vi IV") into concrete chord names given a selected key.

#### Scenario: Major key transposition
- **WHEN** the progression is "I V vi IV" and the selected key is "C"
- **THEN** the result SHALL be ["C", "G", "Am", "F"]

#### Scenario: Key of D transposition
- **WHEN** the progression is "ii V I" and the selected key is "D"
- **THEN** the result SHALL be ["Em", "A", "D"]

#### Scenario: Harmonic minor transposition
- **WHEN** the progression is "i V" and the selected key is "A" (minor)
- **THEN** the result SHALL be ["Am", "E"]

#### Scenario: Accidental modifiers
- **WHEN** a numeral has a flat modifier like "bVII" in key of C
- **THEN** the result SHALL be "Bb"

#### Scenario: Diminished modifier
- **WHEN** a numeral has a diminished modifier like "ii°" in key of C
- **THEN** the result SHALL be "Ddim"

#### Scenario: All 12 keys supported
- **WHEN** any progression is transposed through all 12 keys
- **THEN** each key SHALL produce valid chord names using the correct enharmonic spelling

### Requirement: Drop 2 voicing calculation
The system SHALL compute Drop 2 voicings for chords with 4 or more notes by taking the closed-position voicing and dropping the second-highest note down one octave.

#### Scenario: Cmaj7 Drop 2
- **WHEN** computing the voicing for Cmaj7 (C-E-G-B in closed position)
- **THEN** the Drop 2 voicing SHALL be G3-C4-E4-B4 (G dropped down an octave)

#### Scenario: Triad remains root position
- **WHEN** computing the voicing for a triad like C major (C-E-G)
- **THEN** the voicing SHALL remain root position: C4-E4-G4

#### Scenario: Extended chord voicing
- **WHEN** computing the voicing for a chord with more than 4 notes (e.g. Cmaj9: C-E-G-B-D)
- **THEN** the system SHALL apply Drop 2 to the first 4 notes and include remaining notes as upper extensions

### Requirement: Note-to-MIDI mapping
The system SHALL map note names from the catalog format (e.g. "C", "Ef", "Gs") to numeric pitch values for octave assignment in piano rendering.

#### Scenario: Standard note mapping
- **WHEN** given the note "C"
- **THEN** the system SHALL map it to pitch class 0

#### Scenario: Flat note mapping
- **WHEN** given the note "Ef" (E-flat)
- **THEN** the system SHALL map it to pitch class 3

#### Scenario: Sharp note mapping
- **WHEN** given the note "Gs" (G-sharp)
- **THEN** the system SHALL map it to pitch class 8

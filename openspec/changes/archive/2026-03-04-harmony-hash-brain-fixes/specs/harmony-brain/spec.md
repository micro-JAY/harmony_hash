## MODIFIED Requirements

### Requirement: Roman numeral transposition
The system SHALL convert roman numeral progressions (e.g. "I V vi IV") into concrete chord names given a selected key, while normalizing minor-quality suffixes and tolerating slash-numeral tokens used by the progression library.

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

#### Scenario: Lowercase numeral with minor extension
- **WHEN** the progression includes lowercase minor numerals with suffixes such as "im", "im7", or "iim9"
- **THEN** the resolved chord symbol SHALL include a single minor quality marker (e.g. "Am", "Am7", "Bm9") and SHALL NOT contain duplicated "mm" quality text

#### Scenario: Lowercase numeral with major extension text
- **WHEN** the progression includes lowercase minor numerals with suffixes beginning "maj" (e.g. "iimaj7")
- **THEN** the extension text SHALL be preserved and SHALL NOT be stripped as minor-quality normalization

#### Scenario: Slash numerals from progression library
- **WHEN** a roman token contains a slash bass segment (e.g. "V/ii", "I/III")
- **THEN** the parser SHALL resolve the chord from the segment before `/` and SHALL NOT raise a parse error

#### Scenario: All 12 keys supported
- **WHEN** any progression is transposed through all 12 keys
- **THEN** each key SHALL produce valid chord names using the correct enharmonic spelling

### Requirement: Drop 2 voicing calculation
The system SHALL compute root-position or Drop 2 voicings and choose a starting octave that maximizes full-note visibility inside the rendered keyboard MIDI range C3-B5 (48-83).

#### Scenario: Cmaj7 Drop 2
- **WHEN** computing the voicing for Cmaj7 (C-E-G-B in closed position)
- **THEN** the Drop 2 voicing SHALL be G3-C4-E4-B4 when all notes remain within MIDI 48-83

#### Scenario: Triad remains root position
- **WHEN** computing the voicing for a triad like C major (C-E-G)
- **THEN** the voicing SHALL remain root position with all chord tones visible in the keyboard window

#### Scenario: Extended chord voicing
- **WHEN** computing the voicing for a chord with more than 4 notes (e.g. Cmaj9: C-E-G-B-D)
- **THEN** the system SHALL apply Drop 2 to the first 4 notes and include remaining notes as upper extensions when they fit the visible range

#### Scenario: Lowest fully visible octave is preferred
- **WHEN** a voiced chord can fully fit in both octave-3 and octave-4 starts
- **THEN** the system SHALL choose the lower starting octave

#### Scenario: Drop 2 underflow protection
- **WHEN** applying Drop 2 would move the dropped note below C3 (MIDI 48)
- **THEN** the system SHALL skip the drop for that chord and keep root-position ordering

#### Scenario: High-root chords remain fully visible
- **WHEN** computing voicings for chords such as Bb major, B major, or F# major
- **THEN** all chord tones SHALL be assigned MIDI notes within 48-83 so every tone can render on the 3-octave keyboard

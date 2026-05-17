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

### Requirement: Voice-leading across a progression
When given an ordered list of chord note-sets representing a progression of two or more chords, the system SHALL compute a sequence of voiced chords such that each chord after the first minimizes total voice movement from the prior chord while keeping every note within the existing C3-B5 MIDI range invariant.

#### Scenario: Empty progression
- **WHEN** the input is an empty list of chord note-sets
- **THEN** the system SHALL return an empty list

#### Scenario: Single-chord progression
- **WHEN** the input is a list with exactly one chord
- **THEN** the system SHALL return a one-element list whose voicing is identical to `computeVoicing(input[0])`

#### Scenario: First-chord equivalence
- **WHEN** the input has two or more chords
- **THEN** `result[0]` SHALL be identical to `computeVoicing(input[0])` — the first chord anchors the progression with the existing default voicing

#### Scenario: ii-V-I voice-leading in C major
- **WHEN** the input is `[["D","F","A","C"], ["G","B","D","F"], ["C","E","G","B"]]`
- **THEN** the system SHALL return voicings: Dm7 = `[D3, F3, A3, C4]`, G7 = `[D3, F3, G3, B3]`, Cmaj7 = `[E3, G3, B3, C4]`
- **AND** the cumulative voicing-distance across the three chords SHALL be strictly less than the cumulative distance produced by calling `computeVoicing` independently on each chord

#### Scenario: Repeated-chord vamp stabilizes
- **WHEN** the input is `[Dm7, G7, Dm7, G7]` (note-set arrays for each chord)
- **THEN** the voicings at positions 0 and 2 SHALL be identical
- **AND** the voicings at positions 1 and 3 SHALL be identical

#### Scenario: MIDI range invariant preserved
- **WHEN** the input is any valid progression
- **THEN** every note in every returned voicing SHALL have MIDI in the inclusive range [48, 83]

#### Scenario: Common tones preferred
- **WHEN** two chords share one or more pitch classes (e.g. C major to A minor, sharing C and E)
- **THEN** the chosen voicing of the second chord SHALL retain shared pitches at the same MIDI position as the first chord wherever the MIDI range invariant allows

#### Scenario: Voicing candidate set generalizes existing behavior
- **WHEN** the candidate set is enumerated for any chord
- **THEN** the output of `computeVoicing(noteNames)` SHALL be one of the candidates, ensuring the worst-case voice-leading choice is no worse than the existing default

### Requirement: Voicing-distance metric
The system SHALL define a deterministic voicing-distance metric that scores how smoothly one voicing transitions to another. Lower scores indicate smoother voice leading.

#### Scenario: Identical voicings
- **WHEN** the prior and candidate voicings contain the same MIDI notes
- **THEN** the distance SHALL be 0

#### Scenario: Common-tone retention
- **WHEN** a candidate note shares a MIDI position with any prior note
- **THEN** that candidate note SHALL contribute 0 to the total distance

#### Scenario: Semitone steps
- **WHEN** a candidate note's nearest prior note is exactly one semitone away
- **THEN** that candidate note SHALL contribute 1 to the total distance

#### Scenario: Empty prior or candidate
- **WHEN** either the prior or candidate voicing is empty
- **THEN** the distance SHALL be 0

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

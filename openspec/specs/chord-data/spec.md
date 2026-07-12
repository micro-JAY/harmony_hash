## Purpose
Define the canonical chord dictionary and lookup behavior shared by the browser and Worker.

## Requirements

### Requirement: Chord catalog loading
The system SHALL load `chords_clean.json` at build time and expose all 600 chord entries (excluding 12 header rows) as a typed array.

#### Scenario: Successful load
- **WHEN** the application initializes
- **THEN** 600 chord entries are available in memory, each with fields: Chord Name, Notes, Steps, Symbols, Type, Variation Count, Usage Notes

#### Scenario: Header rows filtered
- **WHEN** the JSON is loaded
- **THEN** entries with empty Notes field (header/separator rows like "C Chords") SHALL be excluded from the chord index

### Requirement: Multi-key index for chord lookup
The system SHALL build a lookup index keyed by `<root><symbol>` combinations (e.g. "Cmaj7", "Cm7", "C-7") derived from each entry's Symbols field, providing O(1) lookup for any recognized chord symbol.

#### Scenario: Alias resolution
- **WHEN** a chord entry has Symbols "m7, min7, -7" and root "C"
- **THEN** the index SHALL contain entries for "Cm7", "Cmin7", and "C-7" all pointing to the same chord entry

#### Scenario: All 12 keys indexed
- **WHEN** the index is built
- **THEN** every root note (C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B) SHALL have entries for all chord types available for that root

#### Scenario: Case-insensitive root matching
- **WHEN** a user queries "cmaj7" or "CMAJ7"
- **THEN** the lookup SHALL resolve to the same entry as "Cmaj7"

### Requirement: SVG path resolution
The system SHALL map each chord entry to its guitar SVG filesystem path using the pattern `public/music_src/chords/<key_folder>/<chord_type_folder>/var_N.svg`.

#### Scenario: Standard key mapping
- **WHEN** the chord root is "C"
- **THEN** the key folder SHALL be "c"

#### Scenario: Sharp/flat key mapping
- **WHEN** the chord root is "C#" or "Db"
- **THEN** the key folder SHALL be "c_sharp-d_flat"

#### Scenario: Chord type folder mapping
- **WHEN** the chord type symbol is "maj7"
- **THEN** the chord type folder SHALL be "maj7"

#### Scenario: Modified chord type folder mapping
- **WHEN** the chord type symbol contains sharps or flats (e.g. "7#9", "m7b5")
- **THEN** the folder name SHALL use underscore notation (e.g. "7_sharp_9", "m7_flat_5")

#### Scenario: Variant count
- **WHEN** a chord entry has Variation Count of 5
- **THEN** the system SHALL expose paths for var_1.svg through var_5.svg

### Requirement: User-facing note-name formatting
The system SHALL convert internal catalog note encoding (`s` for sharp, `f` for flat) into user-facing musical notation before any note text is shown in the UI.

#### Scenario: Sharp encoding conversion
- **WHEN** an internal note name is "Cs", "Ds", "Fs", "Gs", or "As"
- **THEN** the displayed note SHALL be "C#", "D#", "F#", "G#", or "A#" respectively

#### Scenario: Flat encoding conversion
- **WHEN** an internal note name is "Ef", "Af", "Bf", "Cf", "Df", or "Gf"
- **THEN** the displayed note SHALL be "Eb", "Ab", "Bb", "Cb", "Db", or "Gb" respectively

#### Scenario: Natural note passthrough
- **WHEN** an internal note name is a natural note (e.g. "C", "D", "E")
- **THEN** the displayed note SHALL remain unchanged

#### Scenario: Flat-context enharmonic preference
- **WHEN** a chord display root indicates flat notation preference (e.g. Bb, Eb, Ab, Db, Gb)
- **THEN** enharmonic display conversion SHALL prefer flat spellings for note labels in that chord context

#### Scenario: Sharp-context enharmonic preference
- **WHEN** a chord display root indicates sharp or natural notation preference (e.g. F#, C, G)
- **THEN** enharmonic display conversion SHALL prefer sharp spellings for note labels in that chord context

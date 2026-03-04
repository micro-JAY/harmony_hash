## ADDED Requirements

### Requirement: Structured progression data file
The system SHALL provide a TypeScript data file at `src/data/progressions.ts` that encodes the full chord progression library from `docs/hh-library.md`.

#### Scenario: Data file exports typed progression data
- **WHEN** the data file is imported
- **THEN** it SHALL export a `PROGRESSION_LIBRARY` constant of type `TonalityGroup[]`

### Requirement: Four tonality groups
The data SHALL contain exactly 4 top-level tonality groups matching the library document:
1. Major Key Progressions
2. Minor Tonality Progressions
3. Modal & "Vibe" Progressions
4. Advanced "Crash Out" & Passing Progressions

#### Scenario: All four groups present
- **WHEN** the `PROGRESSION_LIBRARY` array is accessed
- **THEN** it SHALL contain exactly 4 `TonalityGroup` entries with IDs `major`, `minor`, `modal`, `advanced`

### Requirement: Subgroup structure within each tonality
Each `TonalityGroup` SHALL contain a `subgroups` array of named subgroups matching the H2/H3 structure in the library markdown.

#### Scenario: Major tonality subgroups
- **WHEN** the Major tonality group is accessed
- **THEN** it SHALL contain subgroups: "The Foundations (Rock, Pop, Folk)", "Jazz & R&B Fundamentals", "Gospel & Soul Movement"

#### Scenario: Minor tonality subgroups
- **WHEN** the Minor tonality group is accessed
- **THEN** it SHALL contain subgroups: "The Essentials (Pop & Rock)", "R&B & Soul Minor Loops", "Harmonic/Classical Minor (Strong Pull)", "Jazz Minor (Sophisticated)"

#### Scenario: Modal tonality subgroups
- **WHEN** the Modal tonality group is accessed
- **THEN** it SHALL contain subgroups: "Dorian (The \"Cool\" Funk)", "Mixolydian (The \"Greasy\" Rock/Soul)", "Lydian (The \"Ethereal\" Dream)", "Phrygian (The \"Aggressive\" Dark)", "Locrian (The \"Forbidden\" / Unstable)"

#### Scenario: Advanced tonality has a single flat list
- **WHEN** the Advanced tonality group is accessed
- **THEN** it SHALL contain one subgroup with all advanced progressions

### Requirement: Progression object shape
Each progression SHALL be an object with `name: string` and `numerals: string` fields.

#### Scenario: Progression fields
- **WHEN** a progression object is accessed
- **THEN** `name` SHALL contain the progression's descriptive name (e.g., "The Axis (Pop Standard)")
- **AND** `numerals` SHALL contain the Roman numeral notation exactly as written in the markdown (e.g., "I – V – vi – IV")

### Requirement: Preserve special notation
All flats (b), diminished (°), slash chords (/), and extensions (maj7, 7, 9, 11, 13) SHALL be preserved exactly as written in the source markdown.

#### Scenario: Flat notation preserved
- **WHEN** accessing the "Classic Rocker" progression
- **THEN** `numerals` SHALL be "I – bVII – IV"

#### Scenario: Diminished notation preserved
- **WHEN** accessing the "Tense Resolution" progression
- **THEN** `numerals` SHALL be "ii° – V – i"

#### Scenario: Slash chord notation preserved
- **WHEN** accessing the "Sunday Morning Walk" progression
- **THEN** `numerals` SHALL be "I – I/III – IV – V"

#### Scenario: Extension notation preserved
- **WHEN** accessing the "Neo-Soul Minor" progression
- **THEN** `numerals` SHALL be "i9 – iv11 – bVII13 – bIIImaj9"

### Requirement: ScaleType per group and subgroup
Each `TonalityGroup` SHALL have a default `scaleType`. Subgroups MAY override with their own `scaleType` when their harmonic context differs from the group default.

#### Scenario: Major group default scale
- **WHEN** the Major tonality group is accessed
- **THEN** its `scaleType` SHALL be `"major"`

#### Scenario: Minor subgroup scale overrides
- **WHEN** the "Harmonic/Classical Minor" subgroup is accessed
- **THEN** its `scaleType` SHALL be `"harmonic_minor"`, overriding the group default of `"natural_minor"`

#### Scenario: Modal subgroup scale types
- **WHEN** the "Dorian" subgroup is accessed
- **THEN** its `scaleType` SHALL be `"dorian"`

### Requirement: TypeScript strict compliance
The data file and all associated types SHALL compile under TypeScript strict mode with no `any` types.

#### Scenario: Build passes
- **WHEN** `npm run build` is executed
- **THEN** there SHALL be zero type errors related to progression data

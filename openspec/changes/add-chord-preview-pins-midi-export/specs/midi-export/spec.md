## ADDED Requirements

### Requirement: MIDI export in the Share panel
The existing Share panel SHALL retain its progression link and copy interaction and SHALL additionally provide a MIDI download action for every non-empty rendered progression.

#### Scenario: Share panel exposes both paths
- **WHEN** the user opens Share for a rendered progression
- **THEN** the existing share link and Copy link control SHALL remain visible and a clearly labeled MIDI file download section SHALL appear beneath them

#### Scenario: Standard extension
- **WHEN** MIDI export succeeds
- **THEN** the browser SHALL download a valid Standard MIDI File with a `.mid` filename

#### Scenario: URL sharing is unchanged
- **WHEN** the user copies or opens the progression link after MIDI export is added
- **THEN** the existing chord-symbol and instrument URL snapshot behavior SHALL remain unchanged

### Requirement: Selected chord voicings are exported
MIDI export SHALL use the ordered application timeline only. Each Piano chord SHALL use its currently selected rendered Piano voicing, and each Guitar chord SHALL use the playable MIDI notes from its currently selected diagram variation.

#### Scenario: Piano styles
- **WHEN** the progression is in Piano mode with explicit styles selected on one or more cards
- **THEN** the exported notes SHALL match the MIDI notes shown by those selected Piano voicings in timeline order

#### Scenario: Guitar variations
- **WHEN** the progression is in Guitar mode with non-default variations selected
- **THEN** the exported notes SHALL match the playable strings of those selected diagram variations in timeline order

#### Scenario: Pins are excluded
- **WHEN** one or more floating chord pins exist during export
- **THEN** no pinned chord or pin-only modification SHALL appear in the MIDI file

### Requirement: One tempo-free bar per chord
The exported file SHALL use 480 pulses per quarter note and 4/4 meter. Every chord's notes SHALL start simultaneously, sustain for exactly 1,920 ticks, end together, and be followed immediately by the next timeline chord. The file SHALL NOT contain a Set Tempo meta event.

#### Scenario: Sequential chord bars
- **WHEN** a three-chord progression is exported
- **THEN** chord starts SHALL occur at ticks 0, 1,920, and 3,840 and all notes in each chord SHALL have a duration of 1,920 ticks

#### Scenario: Tempo remains assignable
- **WHEN** the exported MIDI track is inspected
- **THEN** it SHALL contain no `FF 51` Set Tempo event while retaining a 4/4 Time Signature event

#### Scenario: Simultaneous notes
- **WHEN** a selected chord voicing contains four notes
- **THEN** all four Note On events SHALL share the same start tick and all four Note Off events SHALL share the same end tick

### Requirement: MIDI export validation and failure visibility
The system SHALL reject missing, empty, non-integer, or out-of-range chord voicings before download and SHALL surface an actionable state in the Share panel rather than creating a malformed file.

#### Scenario: Guitar voicing still loading
- **WHEN** one selected Guitar variation has not yet reported its current playable notes
- **THEN** MIDI download SHALL remain disabled with a truthful preparing message until the voicing is ready

#### Scenario: Invalid note data
- **WHEN** MIDI generation receives a note outside 0–127 or a chord with no playable notes
- **THEN** generation SHALL fail explicitly and no download SHALL be initiated

#### Scenario: Duplicate pitch in one chord
- **WHEN** one selected voicing reports the same MIDI pitch more than once
- **THEN** the exported chord SHALL contain one Note On and one Note Off for that pitch

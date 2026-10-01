## ADDED Requirements

### Requirement: Piano octave controls
Every timeline Piano chord SHALL expose accessible down/up controls above its keyboard that transpose only that rendered voicing by one octave per activation. Hasher SHALL also expose down/up controls that transpose the complete current Piano progression atomically. Per-card offsets SHALL follow stable timeline items through reorder and insertion, SHALL be bounded to two octaves below or above the computed voicing, and SHALL reset with a replaced progression.

The shifted voicings SHALL drive the visible three-octave keyboard window, Hasher playback, MIDI export, Harmony's current-voicing read path, and the immutable Discovery accompaniment snapshot.

#### Scenario: Shift one chord
- **WHEN** the user raises the second Piano chord by one octave
- **THEN** only that card's displayed MIDI notes rise by 12 and the corresponding Hasher/Discovery playback slot and MIDI export use those raised notes

#### Scenario: Shift the progression
- **WHEN** the user raises the whole Piano progression by one octave
- **THEN** every card's existing octave offset increases by one and every rendered and played MIDI note rises by 12

#### Scenario: Timeline reorder
- **WHEN** a shifted chord is moved to another timeline position
- **THEN** its octave offset moves with that chord's stable timeline item instead of remaining at the old index

#### Scenario: Octave boundary
- **WHEN** a card is already two octaves above its computed voicing
- **THEN** its up control is disabled and the whole-progression up control is disabled until every card can move together

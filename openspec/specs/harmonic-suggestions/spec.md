# harmonic-suggestions Specification

## Purpose
TBD - created by archiving change free-input-harmonic-suggestions. Update Purpose after archive.
## Requirements
### Requirement: Deterministic key-fit scoring
The system SHALL assign every dictionary-valid candidate chord an integer key-fit score from 0 through 100 equal to the percentage of its unique chord tones contained in the selected key and mode.

#### Scenario: Fully diatonic seventh chord
- **WHEN** Dm7 is scored in C major
- **THEN** the key-fit score SHALL be 100 because D, F, A, and C belong to the scale

#### Scenario: Chord with one outside tone
- **WHEN** C7 is scored in C major
- **THEN** the key-fit score SHALL be 75 because B-flat is outside the scale while C, E, and G are inside

#### Scenario: Enharmonic inputs
- **WHEN** enharmonically equivalent sharp or flat spellings are scored in the same pitch context
- **THEN** they SHALL produce the same pitch-class membership result

### Requirement: Explainable next-chord scoring
The system SHALL score a candidate after a previous chord using fixed key-fit, voice-leading, and root-motion weights and SHALL return the component scores plus concise reasons.

#### Scenario: Weighted transition score
- **WHEN** a previous chord and candidate chord are available
- **THEN** the final score SHALL use 55 percent key fit, 30 percent voice-leading fit, and 15 percent root-motion fit, rounded and clamped to 0 through 100

#### Scenario: Dominant resolution
- **WHEN** a catalog Dominant chord moves by ascending fourth or descending fifth to a candidate
- **THEN** the result SHALL identify dominant resolution as a reason and SHALL award the highest root-motion component score

#### Scenario: No previous valid chord
- **WHEN** Next mode is active but the input contains no dictionary-valid chord
- **THEN** the system SHALL fall back to key-fit scoring and SHALL state that a chord is needed for transition ranking

### Requirement: Stable score tiers
The system SHALL map scores to stable named tiers so UI and assistive descriptions use the same semantics.

#### Scenario: Tier boundaries
- **WHEN** scores are calculated
- **THEN** 85 through 100 SHALL be `strong`, 70 through 84 SHALL be `good`, 50 through 69 SHALL be `color`, and 0 through 49 SHALL be `outside`

### Requirement: Pure reusable implementation
The scoring module SHALL have no React, DOM, network, provider, random, clock, or storage dependencies.

#### Scenario: Repeat calculation
- **WHEN** the same chords and harmony context are scored repeatedly
- **THEN** every returned score, tier, component, and reason SHALL be identical


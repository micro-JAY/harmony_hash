## ADDED Requirements

### Requirement: Chord-family quality-header palette
The chord reference grid SHALL identify every visible quality column with the shared chord-family palette while retaining the independent key-row and suggestion-score presentation systems.

#### Scenario: Family mapping
- **WHEN** quality headers render
- **THEN** major qualities SHALL use pastel green, minor qualities pastel orange, dominant and altered-dominant qualities deep red, suspended qualities light yellow, diminished and half-diminished qualities soft pink, and augmented qualities white

#### Scenario: Root rows remain blue
- **WHEN** chord-family colors appear in the quality header row
- **THEN** root/key row labels SHALL retain their existing blue family and SHALL NOT inherit chord-quality colors

#### Scenario: Suggestion scoring remains independent
- **WHEN** Key, Next, Jazz, or Modal scoring is active
- **THEN** cell percentages, tiers, borders, and glow SHALL continue to use the existing match-score system while the quality header keeps its chord-family identity

#### Scenario: Non-color and contrast access
- **WHEN** any quality header is presented
- **THEN** its visible text SHALL identify the quality without color and the foreground/surface combination SHALL meet the tested contrast requirement


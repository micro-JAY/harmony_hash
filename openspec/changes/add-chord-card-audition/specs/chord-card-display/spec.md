## ADDED Requirements

### Requirement: Repeatable chord-card audition

Each playable Hasher chord card SHALL expose its heading as a keyboard-accessible control that auditions the card's current instrument-specific voicing.

#### Scenario: Pointer audition

- **WHEN** the user clicks a playable chord card's heading
- **THEN** the system SHALL play that card's current voicing with the active instrument timbre
- **AND** the card SHALL receive the active playback treatment while it sounds

#### Scenario: Keyboard audition

- **WHEN** keyboard focus is on a playable chord card's heading and the user presses Enter or Space
- **THEN** the system SHALL play the same chord audition as pointer activation

#### Scenario: Repeated audition

- **WHEN** the user activates the same chord-card heading multiple times
- **THEN** each activation SHALL stop the prior audition and retrigger the chord from its beginning

#### Scenario: Progression and card playback remain exclusive

- **WHEN** a card audition starts while progression playback is active, or progression playback starts while a card audition is active
- **THEN** the prior playback SHALL stop before the requested playback begins

#### Scenario: Unavailable instrument voicing

- **WHEN** the current card has no playable voicing for the selected instrument
- **THEN** its heading SHALL remain non-interactive and SHALL NOT claim that the chord can be played

## ADDED Requirements

### Requirement: Existing timeline modification
The system SHALL provide a Modify action for a non-empty, agent-supported timeline that sends the user's prompt and the timeline's ordered chord names to the progression endpoint. The returned validated progression SHALL replace the displayed timeline only when the request remains current.

#### Scenario: Targeted edit succeeds
- **WHEN** the timeline is `Em9 Cmaj7 Gadd9 Dsus2/F# A7sus4`, the user enters "change the voicing of the second chord", and selects Modify
- **THEN** the system SHALL send the complete ordered timeline as edit context
- **AND** SHALL replace the timeline with the complete validated edited response

#### Scenario: Modify has no timeline
- **WHEN** no chords are present in the timeline
- **THEN** the Modify action SHALL be disabled and SHALL NOT dispatch a request

#### Scenario: Edit context is validated by the Worker
- **WHEN** `/api/progression` receives an `existingChords` value with a non-string, empty, unsupported, or out-of-range chord sequence
- **THEN** the Worker SHALL respond with HTTP 400 before invoking the provider

#### Scenario: Edit response preserves supported timeline length
- **WHEN** the Worker receives a valid `existingChords` sequence
- **THEN** it SHALL instruct the agent to return a complete edited progression with the same number of chord names
- **AND** SHALL reject a response whose chord count differs from the supplied sequence

### Requirement: Explicit new-progression generation
The system SHALL provide a Re-run action that submits the prompt without existing-timeline context and generates a fresh progression through the existing endpoint.

#### Scenario: Re-run discards current timeline context
- **WHEN** the timeline contains chords and the user selects Re-run
- **THEN** the system SHALL omit `existingChords` from the request
- **AND** SHALL replace the timeline with the validated newly generated progression

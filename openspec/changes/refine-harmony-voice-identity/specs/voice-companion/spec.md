## ADDED Requirements

### Requirement: Harmony companion identity and concise turn behavior
The voice companion SHALL identify itself as Harmony. It MAY give one short initial greeting; after that greeting it SHALL answer only the user's explicit question or requested action, without unsolicited capability explanations, adjacent suggestions, offers of further actions, or follow-up questions unless a clarification is necessary to complete the requested action.

#### Scenario: Initial greeting
- **WHEN** a user starts a new voice session
- **THEN** Harmony SHALL give at most one brief greeting that establishes it can help with the progression

#### Scenario: Direct theory question
- **WHEN** the user asks a specific theory question
- **THEN** Harmony SHALL answer that question at the requested depth
- **AND** SHALL NOT end by offering additional analyses, generation, playback, or unrelated topics

#### Scenario: Requested action
- **WHEN** the user asks Harmony to change or play the progression
- **THEN** Harmony SHALL perform the supported requested action and report its outcome concisely
- **AND** SHALL NOT introduce unrequested actions or alternatives

#### Scenario: Visible identity
- **WHEN** the voice panel, fallback, transcript, or associated accessible controls render
- **THEN** they SHALL identify the companion as Harmony rather than Hanz Hasher or Hanz

## ADDED Requirements

### Requirement: Minor blend contextual help
The system SHALL provide contextual minor-harmony guidance directly in the progression input controls.

#### Scenario: Help trigger appears only for Minor tonality
- **WHEN** the active tonality is `minor`
- **THEN** a `?` help trigger SHALL appear adjacent to the Tonality selector

#### Scenario: Help trigger hidden for other tonalities
- **WHEN** the active tonality is `major`, `modal`, or `advanced`
- **THEN** the `?` help trigger SHALL NOT be rendered

#### Scenario: Help modal opens with static guide content
- **WHEN** the user clicks the `?` trigger in Minor tonality
- **THEN** a modal SHALL open with the full "Minor Blend" educational guide content, including headings, lists, summary, and pro-tip blockquote

#### Scenario: Modal dismissal interactions
- **WHEN** the modal is open and the user clicks the close button, presses `Escape`, or clicks outside the modal panel
- **THEN** the modal SHALL close

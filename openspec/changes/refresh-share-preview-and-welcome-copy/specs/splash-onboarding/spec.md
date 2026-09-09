## ADDED Requirements

### Requirement: Rotating localized welcome subtext
The onboarding dialog SHALL select its subtext from a varied set of concise Harmony Hash messages, and every selectable message SHALL have complete English and Japanese localization.

#### Scenario: Welcome copy selection
- **WHEN** the onboarding dialog opens or reopens
- **THEN** it SHALL show one complete message from the configured welcome subtext set
- **AND** the set SHALL contain more than the three previously shipped messages

#### Scenario: Japanese welcome copy
- **WHEN** the active locale is Japanese and any welcome subtext is selected
- **THEN** the dialog SHALL show the corresponding Japanese translation rather than the English key or a fallback placeholder

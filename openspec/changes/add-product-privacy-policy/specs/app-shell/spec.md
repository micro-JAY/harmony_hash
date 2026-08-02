## ADDED Requirements

### Requirement: Global privacy notice

The application SHALL expose a privacy-policy control from every workspace and SHALL present a localized notice in an accessible modal.

#### Scenario: Open and close the notice

- **WHEN** a user activates the privacy-policy control
- **THEN** the application presents the policy in the active language
- **AND** moves focus into the dialog
- **AND** returns focus to the control after closing

#### Scenario: Review on a narrow viewport

- **WHEN** the policy is opened on a mobile-size viewport
- **THEN** the dialog remains within the viewport
- **AND** its content can scroll without causing document-level horizontal overflow

### Requirement: Regional and product-specific disclosure

The notice SHALL identify Jana Jennings as the individual operator behind the Tonari Labs trade name, along with the contact channel, processed categories, purposes, legal bases, recipients, retention, international transfers, regional rights, security, children, and automated-decision practices.

#### Scenario: Review AI data flows

- **WHEN** a user reviews the notice
- **THEN** it separately explains local musical data, progression-builder prompts, and Hanz live audio processing

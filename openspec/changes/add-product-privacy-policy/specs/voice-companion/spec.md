## ADDED Requirements

### Requirement: Privacy-minimized Hanz conversations

Source-controlled Hanz provisioning SHALL disable voice recording and SHALL configure zero-day retention and deletion of transcript, PII, and audio for new conversations.

#### Scenario: Create or update the agent

- **WHEN** the provisioning workflow creates or updates Hanz
- **THEN** the payload sets `record_voice` to false
- **AND** sets `retention_days` to zero
- **AND** enables transcript/PII and audio deletion

#### Scenario: Preserve historical records

- **WHEN** the privacy settings are applied
- **THEN** the workflow SHALL NOT request retroactive deletion of existing conversations

#### Scenario: Audit the live configuration

- **WHEN** the agent configuration is read back
- **THEN** the audit snapshot exposes the four privacy fields
- **AND** verification fails if they drift from source control

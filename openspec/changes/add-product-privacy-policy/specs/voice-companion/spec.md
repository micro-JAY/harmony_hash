## ADDED Requirements

### Requirement: Privacy-minimized Hanz conversations

Source-controlled Hanz provisioning SHALL disable voice recording and SHALL configure zero-day retention and deletion of transcript, PII, and audio for new conversations.

The browser SHALL keep no more than 20 recent transcript messages in memory for the active conversation UI and SHALL clear them whenever a conversation starts or disconnects.

#### Scenario: Create or update the agent

- **WHEN** the provisioning workflow creates or updates Hanz
- **THEN** the payload sets `record_voice` to false
- **AND** sets `retention_days` to zero
- **AND** enables transcript/PII and audio deletion

#### Scenario: Preserve historical records

- **WHEN** the privacy settings are applied
- **THEN** the workflow SHALL NOT request retroactive deletion of existing conversations

#### Scenario: Clear temporary browser transcript

- **WHEN** a Hanz conversation starts or disconnects
- **THEN** the in-memory browser transcript SHALL be cleared
- **AND** no transcript SHALL be persisted by Tonari in browser storage or an application database

#### Scenario: Audit the live configuration

- **WHEN** the agent configuration is read back
- **THEN** the audit snapshot exposes the four privacy fields
- **AND** verification fails if they drift from source control

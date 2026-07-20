## MODIFIED Requirements

### Requirement: Voice companion panel
The app SHALL keep the voice companion runtime and client tools mounted within the progression builder, while presenting a compact collapsed control by default. The full orb, transcript, errors, and session controls SHALL expand only on explicit user action, microphone access SHALL never be requested before the user starts a session, and every started Hanz session SHALL use the ElevenLabs voice path with audible output enabled.

#### Scenario: Idle panel
- **WHEN** the builder loads
- **THEN** the companion SHALL show a compact offline status and expand control without reserving a large card-sized gap
- **AND** no microphone permission SHALL be requested

#### Scenario: Expand companion
- **WHEN** the user activates the companion expand control
- **THEN** the full companion content and connect control SHALL become available without losing progression state

#### Scenario: Start spoken session
- **WHEN** the user activates the connect control
- **THEN** the app SHALL request a signed URL from the Worker and start an authenticated session with `textOnly` explicitly false
- **AND** the SDK SHALL own the only microphone stream and request it only after this explicit user action
- **AND** the panel status SHALL move through connecting to live
- **AND** the SDK output volume SHALL be set to full normal volume

#### Scenario: Provisioned voice
- **WHEN** a spoken session starts
- **THEN** it SHALL use the voice ID persisted and verified by server-side provisioning
- **AND** SHALL NOT expose a browser-side voice override

#### Scenario: Agent text without audio
- **WHEN** a live voice session receives a completed agent reply but no agent audio packet within the bounded output window
- **THEN** the panel SHALL show a specific retryable voice-output error
- **AND** SHALL NOT treat transcript text alone as proof of spoken output

#### Scenario: Collapse during a live session
- **WHEN** the user collapses the companion while connected or switches input modes
- **THEN** the provider, session, and nine client tools SHALL remain mounted and operational

### Requirement: Live agent configuration matches the signed-URL client
The provisioned ElevenLabs agent SHALL have signed-URL authentication enabled, SHALL expose exactly the nine client-tool contracts defined by the app through the modern toolbox and `tool_ids` API, and SHALL request the exact client-event inventory needed for spoken output and transcripts. Updating the source-owned prompt, tools, event inventory, or auth SHALL preserve live identity and the complete TTS configuration except that an explicitly supplied `HH_VOICE_ID` SHALL replace only the persisted voice ID.

#### Scenario: Auth configuration verified
- **WHEN** the agent is provisioned or updated
- **THEN** a follow-up read SHALL report `enable_auth: true`, an explicit empty allowlist, and the expected agent id

#### Scenario: Spoken client events verified
- **WHEN** the live agent configuration is read
- **THEN** its client events SHALL be exactly `audio`, `user_transcript`, `agent_response`, `agent_response_complete`, and `interruption`
- **AND** a narrow update SHALL preserve every other conversation setting

#### Scenario: Effective tool set verified
- **WHEN** the live agent configuration is read
- **THEN** every linked tool id SHALL resolve to exactly one client contract matching `toolSchemas.ts` by name, description, parameters, response behavior, execution mode, and source-owned tool behavior settings
- **AND** assignments, dynamic-variable placeholders, response mocks, task-execution authority, duplicate or unresolved ids, built-in tools, MCP attachments, nested tool overrides, workflow nodes, edges, or opaque fields, non-client legacy tools, and unknown capability fields SHALL be absent

#### Scenario: Modern toolbox provisioning
- **WHEN** an expected linked client contract is missing or has drifted
- **THEN** provisioning SHALL create a source-owned toolbox record, re-read and verify the persisted record, and replace the agent's `tool_ids` with exactly the nine verified ids
- **AND** SHALL NOT mutate or delete an existing toolbox record that may be shared with another agent

#### Scenario: Ambiguous provider authority blocks an update
- **WHEN** the current agent has a built-in tool, MCP attachment, workflow, legacy non-client tool, or unknown capability field whose removal semantics are not source-owned
- **THEN** provisioning SHALL fail before updating the agent and SHALL require explicit operator removal

#### Scenario: Existing identity preserved
- **WHEN** an existing agent is updated in place without `HH_VOICE_ID`
- **THEN** the update SHALL NOT overwrite its live name, voice id, TTS model, or any other TTS setting

#### Scenario: Explicit existing voice update
- **WHEN** an existing agent is updated with `HH_VOICE_ID`
- **THEN** readback SHALL match the requested voice ID
- **AND** the live name, TTS model, and every other TTS setting SHALL remain unchanged

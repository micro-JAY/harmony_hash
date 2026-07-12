## ADDED Requirements

### Requirement: Live agent configuration matches the signed-URL client
The provisioned ElevenLabs agent SHALL have signed-URL authentication enabled and SHALL expose exactly the nine client-tool contracts defined by the app through the modern toolbox and `tool_ids` API. Updating the source-owned prompt, tools, or auth SHALL preserve live identity and the complete TTS configuration.

#### Scenario: Auth configuration verified
- **WHEN** the agent is provisioned or updated
- **THEN** a follow-up read SHALL report `enable_auth: true`, an explicit empty allowlist, and the expected agent id

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
- **WHEN** an existing agent is updated in place
- **THEN** the update SHALL NOT overwrite its live name, voice id, or TTS model unless those fields were explicitly requested

## MODIFIED Requirements

### Requirement: Voice companion panel
The app SHALL keep the voice companion runtime and client tools mounted within the progression builder, while presenting a compact collapsed control by default. The full orb, transcript, errors, and session controls SHALL expand only on explicit user action, and microphone access SHALL never be requested before the user starts a session.

#### Scenario: Idle panel
- **WHEN** the builder loads
- **THEN** the companion SHALL show a compact offline status and expand control without reserving a large card-sized gap
- **AND** no microphone permission SHALL be requested

#### Scenario: Expand companion
- **WHEN** the user activates the companion expand control
- **THEN** the full companion content and connect control SHALL become available without losing progression state

#### Scenario: Start session
- **WHEN** the user activates the connect control
- **THEN** the app SHALL request a signed URL from the Worker and open an authenticated voice session
- **AND** the panel status SHALL move through connecting to live

#### Scenario: Collapse during a live session
- **WHEN** the user collapses the companion while connected or switches input modes
- **THEN** the provider, session, and nine client tools SHALL remain mounted and operational

### Requirement: Server-minted signed URL
The Worker SHALL expose `POST /api/voice/signed-url` that mints a short-lived ElevenLabs signed URL using a server-held API key and configured non-secret agent id. The Worker SHALL never expose the API key to the client. The route SHALL reuse the existing origin allowlist and distinguish local configuration failure from upstream rejection.

#### Scenario: Success
- **WHEN** a permitted origin POSTs to `/api/voice/signed-url` and the API key, agent id, and live agent auth mode are valid
- **THEN** the Worker SHALL return HTTP 200 with `{ "signedUrl": "wss://…" }`

#### Scenario: Misconfiguration
- **WHEN** the API key or agent id is missing
- **THEN** the Worker SHALL return HTTP 500 with an `{ "error": … }` body
- **AND** SHALL NOT return a success-shaped response

#### Scenario: ElevenLabs rejects the request
- **WHEN** ElevenLabs rejects the key, agent, auth mode, or signed-URL request
- **THEN** the Worker SHALL return HTTP 502, log sanitized upstream detail server-side, and show a retryable client message

#### Scenario: Disallowed origin
- **WHEN** the request Origin is not permitted by the allowlist
- **THEN** the Worker SHALL return HTTP 403

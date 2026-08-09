## ADDED Requirements

### Requirement: Privacy-minimized Hanz conversations

The source-configured Hanz session SHALL use OpenAI Realtime to process live microphone audio and conversation text for transcription and response generation.

The browser SHALL keep no more than 20 recent transcript messages in memory for the active conversation UI and SHALL clear them whenever a session starts or disconnects.

Tonari SHALL NOT persist Hanz audio or transcript messages in browser storage or an application database. The notice SHALL disclose that provider security, abuse-monitoring, or legally required processing and logs may apply, and SHALL NOT promise provider-side retention or deletion controls.

This requirement originally covered source-controlled ElevenLabs recording, retention, and deletion flags. The OpenAI Realtime migration removed provider-agent provisioning; the privacy objective now rests on app-owned data minimization and accurate provider disclosure.

#### Scenario: Process a live Hanz session

- **WHEN** a user explicitly starts Hanz and grants microphone access
- **THEN** live audio and conversation text SHALL be processed through OpenAI Realtime
- **AND** the application SHALL retain at most 20 recent transcript messages in memory for the active UI

#### Scenario: Clear temporary browser transcript

- **WHEN** a Hanz session starts or disconnects
- **THEN** the in-memory browser transcript SHALL be cleared
- **AND** no transcript SHALL be persisted by Tonari in browser storage or an application database

#### Scenario: Disclose the provider boundary

- **WHEN** a user reviews the privacy notice
- **THEN** it SHALL identify OpenAI Realtime as the processor of Hanz live audio and conversation text
- **AND** it SHALL acknowledge possible provider security, abuse-monitoring, or legally required processing and logs without asserting provider-side retention or deletion guarantees

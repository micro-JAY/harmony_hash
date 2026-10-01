## ADDED Requirements

### Requirement: Input choice before conversation
The Harmony panel SHALL offer mutually exclusive Voice and Type input modes before the user activates “Harmony, Help!”. Voice SHALL remain the default. The selected mode SHALL remain fixed while connecting or connected, with an explanation that users can end the conversation to change modes.

#### Scenario: Select typed input
- **WHEN** the user opens Harmony and selects Type
- **THEN** the panel SHALL explain that Harmony replies aloud and does not need microphone access
- **AND** starting the conversation SHALL NOT request, acquire, or transmit microphone input

#### Scenario: Select voice input
- **WHEN** the user starts a conversation with Voice selected
- **THEN** the existing microphone permission and spoken conversation behavior SHALL remain available
- **AND** a typed-message composer SHALL NOT be offered during that conversation

#### Scenario: Change mode after conversation
- **WHEN** the user ends a conversation
- **THEN** the input choice SHALL become available for the next session

### Requirement: Typed requests receive spoken answers
Type mode SHALL send user-authored text into the authenticated Realtime conversation and request spoken responses. It SHALL retain the same nine progression tools, audio-health checks, and fixed five-minute session deadline as Voice mode.

#### Scenario: Send a typed request
- **WHEN** a Type session is ready and the user sends a non-empty message of at most 2000 characters
- **THEN** the request SHALL enter the conversation once and appear as a user entry in its transcript
- **AND** Harmony SHALL answer aloud and expose its response transcript
- **AND** tool-backed progression edits SHALL affect the live builder through the existing bridge

#### Scenario: Prevent overlapping submissions
- **WHEN** Harmony is connecting, awaiting acknowledgement of a typed message, generating a response, playing its spoken audio, or waiting for a tool result
- **THEN** the panel SHALL make message-send availability clear and prevent concurrent typed requests

#### Scenario: Generation finishes before spoken playback
- **WHEN** response generation completes while its spoken audio is still playing
- **THEN** Type sending SHALL remain unavailable until the audio buffer for that response stops or is cleared
- **AND** completion of an earlier response's audio SHALL NOT unlock a later response or pending tool continuation

#### Scenario: Invalid or failed submission
- **WHEN** a request is empty, exceeds the message limit, or cannot be sent through the active connection
- **THEN** the app SHALL NOT claim it was delivered
- **AND** the draft SHALL remain available with a useful explanation when the submission fails

#### Scenario: Connection fails before message acknowledgement
- **WHEN** local sending succeeds but the provider rejects or disconnects before acknowledging that exact typed message
- **THEN** the draft SHALL remain available for a new conversation
- **AND** the composer SHALL clear the sent draft only after a matching message acknowledgement

#### Scenario: Collapse and reopen
- **WHEN** the user closes and reopens the popup during a Type session
- **THEN** the selected input mode, conversation, composer draft, and progression tools SHALL remain available

#### Scenario: End or expire a typed session
- **WHEN** a Type conversation is ended, its fixed deadline expires, or the page is closed
- **THEN** its audio playback, connection, timers, and pending tool continuations SHALL be cleaned up through the same lifecycle as Voice mode

## ADDED Requirements

### Requirement: Server-minted Realtime client secret
The Worker SHALL expose `POST /api/voice/client-secret` that mints a short-lived OpenAI Realtime client secret using only the server-held `OPENAI_API_KEY`. The route SHALL require a permitted browser Origin, use the dedicated hashed-caller voice rate limiter before the provider call, reject request bodies, validate the provider response, and never expose the standard API key, provider request, or sanitized-away provider detail to the browser.

#### Scenario: Client secret success
- **WHEN** a permitted browser origin POSTs an empty request to `/api/voice/client-secret` and the OpenAI key, limiter, and provider are available
- **THEN** the Worker SHALL return HTTP 200 with a non-empty short-lived `clientSecret`, numeric `expiresAt`, a numeric `serverNow` reference, and a source-owned `sessionEndsAt` no more than 300 seconds after `serverNow`
- **AND** the response SHALL NOT contain the standard API key or complete server session configuration

#### Scenario: Missing server key
- **WHEN** `OPENAI_API_KEY` is unavailable
- **THEN** the Worker SHALL return HTTP 500 with a failure-shaped response
- **AND** SHALL NOT call OpenAI

#### Scenario: Admission rejected
- **WHEN** the browser Origin is absent or disallowed, the rate-limit binding or caller identity is unavailable, or the caller is over limit
- **THEN** the Worker SHALL reject the request with the existing fail-closed 403, 503, or 429 contract before calling OpenAI

#### Scenario: Unexpected request body
- **WHEN** a client includes a non-empty request body
- **THEN** the Worker SHALL return HTTP 400 and SHALL NOT call OpenAI

#### Scenario: OpenAI rejects or malforms the mint
- **WHEN** OpenAI times out, rejects the request, returns non-JSON, or omits a valid client secret or expiry
- **THEN** the Worker SHALL return a generic retryable 502 or 504 response
- **AND** server logs SHALL redact credentials, authorization values, client secrets, SDP, and provider detail that could grant access

### Requirement: Source-owned Realtime session configuration
The Worker SHALL mint every Hanz session for `gpt-realtime-2.1` with audio output, the source-owned Hanz instructions, the fixed `marin` voice, near-field input noise reduction, input transcription, low-eagerness semantic VAD with automatic responses and interruption, automatic tool choice, bounded output tokens, a 60-second client-secret TTL, and exactly the nine source-owned progression function schemas. The Worker SHALL derive a 300-second application deadline from its server clock. The mint endpoint SHALL accept no browser configuration, and the shipped browser runtime SHALL send no model, prompt, voice, VAD, tool, tool-policy, expiry, or other `session.update` override.

#### Scenario: Fixed configuration sent upstream
- **WHEN** the Worker mints a Hanz client secret
- **THEN** the OpenAI request SHALL contain the complete fixed Hanz session configuration
- **AND** every function parameters object SHALL reject additional properties

#### Scenario: Shipped browser retains minted configuration
- **WHEN** the shipped browser connects with the client secret
- **THEN** it SHALL use the minted session without sending a `session.update` event
- **AND** user-controlled data SHALL NOT be interpreted as session configuration

#### Scenario: No provider-side agent provisioning
- **WHEN** the app builds, starts locally, or prepares a deployment
- **THEN** no ElevenLabs agent id, key, SDK, provisioning script, provider-side prompt, or provider-side tool record SHALL be required
- **AND** `OPENAI_API_KEY` SHALL be the only required provider secret

### Requirement: Realtime WebRTC transport and lifecycle
The browser SHALL use WebRTC for Hanz input and output: it SHALL attach one explicitly requested microphone track, exchange SDP with OpenAI using the short-lived client secret, play the remote audio track, and use the Realtime data channel for lifecycle, transcript, and tool events. The browser SHALL NOT expose or persist secrets, rebuild provider audio deltas, or manually truncate WebRTC conversation items.

#### Scenario: Explicit start establishes voice transport
- **WHEN** the user starts Hanz and client-secret minting succeeds
- **THEN** the browser SHALL request microphone permission, create the peer connection and data channel, exchange SDP, attach remote audio playback, and move the existing panel from connecting to listening

#### Scenario: Opening greeting occurs once
- **WHEN** a newly created Realtime session first reaches ready state
- **THEN** the browser SHALL request one opening response using the current source-owned first-message wording
- **AND** closing and reopening the panel during that session SHALL NOT request another opening response

#### Scenario: Mint fails before microphone access
- **WHEN** client-secret minting fails or the panel closes while minting is pending
- **THEN** the browser SHALL show the existing retryable error state
- **AND** SHALL NOT request microphone permission

#### Scenario: Partial connection fails
- **WHEN** microphone, SDP, peer, data-channel, or remote-media setup fails after any resource is acquired
- **THEN** the browser SHALL stop every acquired media track, close every channel and peer, clear timers and listeners, detach remote media, clear Hanz focus, and expose a retryable error

#### Scenario: Interruption
- **WHEN** the user begins speaking while Hanz is producing audio
- **THEN** semantic VAD SHALL interrupt the response and remote WebRTC playback SHALL follow the provider's interruption state
- **AND** the client SHALL NOT manually truncate the conversation item

#### Scenario: Explicit stop or deadline
- **WHEN** the user ends the conversation or the monotonic browser deadline is reached
- **THEN** the browser SHALL cancel active output when possible, clear buffered output when possible, stop every microphone track, close the data channel and peer connection, detach remote media, clear the deadline, and return the panel to offline

#### Scenario: Transcript completion order
- **WHEN** user or assistant transcript completions arrive out of event order
- **THEN** the runtime SHALL associate final text by conversation `item_id` and preserve conversation order
- **AND** failed or empty transcription events SHALL NOT create fabricated transcript rows

#### Scenario: Remote audio health
- **WHEN** an assistant transcript completes during a live voice session
- **THEN** the runtime SHALL compare inbound audio RTP progress with the turn baseline
- **AND** the existing delayed no-audio warning SHALL appear only if no remote audio packets arrive

#### Scenario: Remote playback is blocked
- **WHEN** remote audio packets arrive but the browser rejects playback
- **THEN** the existing panel SHALL expose a retryable output-audio error
- **AND** SHALL NOT report audio health solely from packet receipt

## MODIFIED Requirements

### Requirement: Voice companion panel
The app SHALL keep the voice companion runtime and client tools mounted within the progression builder after first request, while presenting the same popup content only on explicit user action. Microphone access SHALL never be requested before the user starts a session, and changing the provider SHALL NOT change the panel's labels, structure, styling, accessibility, focus restoration, short-viewport reachability, or lazy-load/permanent-mount behavior.

#### Scenario: Idle panel
- **WHEN** the builder loads
- **THEN** the existing help control SHALL remain available without loading the voice runtime or requesting microphone permission

#### Scenario: Expand companion
- **WHEN** the user activates the companion help control
- **THEN** the existing full orb, transcript, errors, and connect control SHALL become available without losing progression state

#### Scenario: Start session
- **WHEN** the user activates the connect control
- **THEN** the app SHALL request a Realtime client secret and open an authenticated WebRTC voice session
- **AND** the panel status SHALL move through connecting to live

#### Scenario: Close during a live session
- **WHEN** the user closes the companion while connected
- **THEN** the provider runtime, session, and nine client tools SHALL remain mounted and operational
- **AND** reopening the companion SHALL show the same live status and transcript

#### Scenario: Close during connection
- **WHEN** the user closes the companion while client-secret minting or media setup is pending
- **THEN** the pending start SHALL be aborted and any partial media resources SHALL be cleaned up
- **AND** focus SHALL return to the existing Hanz help control

### Requirement: Agent tool surface scoped to shipped capabilities
The voice agent SHALL be limited to browser tools the app genuinely backs: `get_progression`, `analyze_progression`, `add_chords`, `replace_progression`, `remove_chord`, `clear_progression`, `play_progression`, `randomize_progression`, and `highlight_chord`. It SHALL NOT expose key-setting, suggestion-mode, or next-chord-suggestion tools. `toolSchemas.ts`, the browser dispatcher, the Worker Realtime configuration, and the Hanz system prompt SHALL agree on exactly this tool set.

#### Scenario: Analysis honesty
- **WHEN** the agent calls `analyze_progression`
- **THEN** it SHALL receive only app-computed facts: chord symbols, each chord's tones, and the voice-led piano voicing
- **AND** it SHALL NOT receive a fabricated detected key, roman numerals, or compatible-scale ranking

#### Scenario: Randomize semantics
- **WHEN** the agent calls `randomize_progression`
- **THEN** the app SHALL reshuffle the existing chords' guitar variants or piano voicings
- **AND** SHALL NOT generate new chords

#### Scenario: Valid tool call
- **WHEN** OpenAI completes a call to one of the exact nine tools with valid JSON arguments
- **THEN** the browser SHALL invoke only the matching bridge method, send an explicit serialized `function_call_output`, and request the next response

#### Scenario: Invalid or unknown tool call
- **WHEN** a function name is unknown, arguments are not valid JSON, the argument object has unknown or invalid fields, or chord bounds are exceeded
- **THEN** the browser SHALL NOT mutate application state
- **AND** SHALL return an explicit serialized failure through the matching `call_id`

#### Scenario: Duplicate tool call
- **WHEN** an already completed `call_id` is delivered again
- **THEN** the browser SHALL NOT execute its bridge mutation again
- **AND** SHALL return the previously serialized output for that call

#### Scenario: Conflicting call id reuse
- **WHEN** a previously observed `call_id` is reused with a different tool name or argument payload
- **THEN** the browser SHALL fail closed without another bridge mutation or function output
- **AND** SHALL surface the provider protocol error through sanitized session diagnostics

### Requirement: Voice edits drive the live builder
Voice tool calls SHALL read and mutate the same progression state as manual input, through a bridge that always observes the current timeline. An unresolved chord name SHALL surface a clear error to the agent rather than being silently dropped.

#### Scenario: Build by voice
- **WHEN** the agent calls `replace_progression` with chord names that resolve in the dictionary
- **THEN** the timeline SHALL update to those chords
- **AND** the chord cards SHALL render identically to manually entered chords

#### Scenario: Unresolvable chord
- **WHEN** a chord name passed to `add_chords` or `replace_progression` does not resolve
- **THEN** the tool SHALL return a clear error naming the offending chord
- **AND** the timeline SHALL be unchanged

#### Scenario: Playback uses the active instrument
- **WHEN** the agent calls `play_progression` with chords on the timeline while playback is idle
- **THEN** playback SHALL start once using the guitar or piano instrument currently active in the app
- **AND** the tool SHALL return a `started` status

#### Scenario: Empty timeline
- **WHEN** the agent calls `play_progression` with no timeline chords
- **THEN** playback SHALL NOT start
- **AND** the tool SHALL return an `empty` status

#### Scenario: Playback is already active
- **WHEN** the agent calls `play_progression` while progression playback is starting or already running
- **THEN** playback SHALL NOT restart or overlap
- **AND** the tool SHALL return an `already_playing` status

#### Scenario: Audio cannot start
- **WHEN** the browser cannot create, resume, or schedule a running audio context
- **THEN** the tool SHALL return an `unavailable` status
- **AND** SHALL NOT claim playback started

#### Scenario: Pending playback is cancelled
- **WHEN** a user action or timeline mutation cancels playback while audio is still starting
- **THEN** the tool SHALL return a `cancelled` status
- **AND** SHALL NOT describe the browser as incapable of audio playback

## REMOVED Requirements

### Requirement: Server-minted signed URL
**Reason**: OpenAI Realtime WebRTC authenticates the browser with a short-lived client secret rather than an ElevenLabs signed WebSocket URL and public agent id.

**Migration**: Use `POST /api/voice/client-secret` and the server-owned Realtime session configuration.

### Requirement: Live agent configuration matches the signed-URL client
**Reason**: Hanz prompt, model, voice, VAD, and tools are now supplied from source on every OpenAI Realtime client-secret mint, so there is no mutable provisioned provider agent to reconcile.

**Migration**: Treat the Worker's fixed Realtime session request and shared tool schemas as the effective configuration; verify them in Worker tests and the live WebRTC smoke.

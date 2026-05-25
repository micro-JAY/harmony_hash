# voice-companion

## ADDED Requirements

### Requirement: Voice companion panel
The app SHALL present a voice companion panel within the progression builder that opens a real-time
voice session only on explicit user action, and SHALL NOT request microphone access before the user
starts a session.

#### Scenario: Idle panel
- **WHEN** the builder loads
- **THEN** the panel SHALL show an offline status and a connect control
- **AND** no microphone permission SHALL be requested

#### Scenario: Start session
- **WHEN** the user activates the connect control
- **THEN** the app SHALL request a signed URL from the Worker and open an authenticated voice session
- **AND** the panel status SHALL move through connecting to live

### Requirement: Server-minted signed URL
The Worker SHALL expose `POST /api/voice/signed-url` that mints a short-lived ElevenLabs signed URL
using a server-held API key, and SHALL never expose that key to the client. The route SHALL reuse
the existing origin allowlist and error contract.

#### Scenario: Success
- **WHEN** a permitted origin POSTs to `/api/voice/signed-url` and the API key and agent id are configured
- **THEN** the Worker SHALL return HTTP 200 with `{ "signedUrl": "wss://…" }`

#### Scenario: Misconfiguration
- **WHEN** the API key or agent id is missing, or ElevenLabs returns a non-OK response
- **THEN** the Worker SHALL return a 5xx response with an `{ "error": … }` body and log server-side
- **AND** SHALL NOT return a success-shaped response

#### Scenario: Disallowed origin
- **WHEN** the request Origin is not permitted by the allowlist
- **THEN** the Worker SHALL return HTTP 403

### Requirement: Agent tool surface scoped to shipped capabilities
The voice agent SHALL be limited to client tools the app genuinely backs: `get_progression`,
`analyze_progression`, `add_chords`, `replace_progression`, `remove_chord`, `clear_progression`,
`play_progression`, `randomize_progression`, `highlight_chord`. It SHALL NOT expose key-setting,
suggestion-mode, or next-chord-suggestion tools. `toolSchemas.ts`, the browser tool-handler hook,
and the agent system prompt SHALL agree on exactly this tool set.

#### Scenario: Analysis honesty
- **WHEN** the agent calls `analyze_progression`
- **THEN** it SHALL receive only app-computed facts: chord symbols, each chord's tones, and the voice-led piano voicing
- **AND** it SHALL NOT receive a fabricated detected key, roman numerals, or compatible-scale ranking

#### Scenario: Randomize semantics
- **WHEN** the agent calls `randomize_progression`
- **THEN** the app SHALL reshuffle the existing chords' guitar variants or piano voicings
- **AND** SHALL NOT generate new chords

### Requirement: Voice edits drive the live builder
Voice tool calls SHALL read and mutate the same progression state as manual input, through a bridge
that always observes the current timeline. An unresolved chord name SHALL surface a clear error to
the agent rather than being silently dropped.

#### Scenario: Build by voice
- **WHEN** the agent calls `replace_progression` with chord names that resolve in the dictionary
- **THEN** the timeline SHALL update to those chords
- **AND** the chord cards SHALL render identically to manually entered chords

#### Scenario: Unresolvable chord
- **WHEN** a chord name passed to `add_chords` or `replace_progression` does not resolve
- **THEN** the tool SHALL return a clear error naming the offending chord
- **AND** the timeline SHALL be unchanged

#### Scenario: Playback constraint
- **WHEN** the agent calls `play_progression` while the guitar view is active
- **THEN** playback SHALL NOT start
- **AND** the agent SHALL be told that playback requires the piano view

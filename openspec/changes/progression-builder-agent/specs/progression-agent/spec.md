## ADDED Requirements

### Requirement: Natural-language progression input
The system SHALL provide a textarea on the Progressions tab where users describe the feel/genre/mood of a progression in their own words and submit it with a "Build progression" button.

#### Scenario: User describes a mood
- **WHEN** the user types "something melancholic in minor with a jazz feel" and clicks "Build progression"
- **THEN** the system SHALL send the prompt to the agent endpoint and render a loading state until the response returns

#### Scenario: Empty input ignored
- **WHEN** the user clicks "Build progression" with an empty or whitespace-only textarea
- **THEN** the system SHALL NOT dispatch a request and SHALL keep focus on the textarea

#### Scenario: Prompt length capped at 500 characters
- **WHEN** the user submits a prompt longer than 500 characters
- **THEN** the system SHALL reject the input before dispatch and surface a client-side validation message

### Requirement: Cloudflare Worker endpoint for progression generation
The system SHALL expose an HTTP POST endpoint at `/api/progression` implemented as a Cloudflare Worker that accepts `{ "prompt": string }` and returns `{ "chords": string[4], "key": string, "rationale": string }`.

#### Scenario: Valid prompt produces a progression
- **WHEN** the Worker receives a POST with a non-empty prompt under 500 characters
- **THEN** the Worker SHALL run the agent tool loop and respond with HTTP 200 and a validated JSON body

#### Scenario: Empty prompt rejected
- **WHEN** the Worker receives a POST with an empty or whitespace-only prompt
- **THEN** the Worker SHALL respond with HTTP 400 and an error message

#### Scenario: Over-length prompt rejected
- **WHEN** the Worker receives a POST whose prompt exceeds 500 characters
- **THEN** the Worker SHALL respond with HTTP 400 and an error message

#### Scenario: Malformed JSON body rejected
- **WHEN** the Worker receives a request whose body is not valid JSON or does not contain a `prompt` string
- **THEN** the Worker SHALL respond with HTTP 400 and an error message

### Requirement: Agent tool loop with chord verification
The Worker SHALL run an Anthropic Messages API tool loop in which Claude MUST call the `lookup_chord` tool to verify every chord before finalizing the progression, and the Worker SHALL execute each tool call by consulting the harmony_hash chord dictionary.

#### Scenario: Tool verifies known chord
- **WHEN** Claude issues a `lookup_chord` tool call for a chord that exists in the dictionary (e.g. "Cmaj7")
- **THEN** the Worker SHALL respond with `{ valid: true, chord_name: "Cmaj7" }`

#### Scenario: Tool suggests alternative for unknown chord
- **WHEN** Claude issues a `lookup_chord` tool call for a chord not in the dictionary (e.g. "Caug7")
- **THEN** the Worker SHALL respond with `{ valid: false, chord_name: "Caug7", suggestion: <closest valid chord> }` and Claude SHALL substitute the suggested chord before finalizing

#### Scenario: Loop terminates on end_turn
- **WHEN** the Anthropic API response has `stop_reason: "end_turn"`
- **THEN** the Worker SHALL parse the first text block as JSON and validate the progression shape

### Requirement: Iteration cap and non-convergence handling
The Worker SHALL cap the tool loop at 8 iterations and return HTTP 504 when exceeded.

#### Scenario: Loop converges within cap
- **WHEN** the agent reaches `stop_reason: "end_turn"` in ≤ 8 iterations
- **THEN** the Worker SHALL return the validated progression with HTTP 200

#### Scenario: Loop exceeds 8 iterations
- **WHEN** the agent has not reached `end_turn` after 8 iterations
- **THEN** the Worker SHALL respond with HTTP 504 and error body `{ "error": "Agent did not converge" }`

### Requirement: Output validation
The Worker SHALL validate the final JSON output before returning it to the client.

#### Scenario: Valid JSON shape passes
- **WHEN** the parsed response is an object with exactly 4 string chords, a non-empty `key` string, and a non-empty `rationale` string
- **THEN** the Worker SHALL return HTTP 200 with the JSON body

#### Scenario: Chord count wrong
- **WHEN** the parsed response contains fewer than or more than 4 chords
- **THEN** the Worker SHALL return HTTP 500 and an error message describing the validation failure

#### Scenario: Non-JSON assistant text
- **WHEN** the final assistant message is not parseable as JSON
- **THEN** the Worker SHALL return HTTP 500 and log the raw text for observability

### Requirement: CORS support for development and production origins
The Worker SHALL return CORS headers that allow the Vite dev origin (`http://localhost:5173`) during development and the harmony_hash production origin in production.

#### Scenario: Dev origin allowed
- **WHEN** the Worker is run locally via `wrangler dev` without `ALLOWED_ORIGIN` configured
- **THEN** responses SHALL include `Access-Control-Allow-Origin: *`

#### Scenario: Production origin restricted
- **WHEN** the Worker runs in production with `ALLOWED_ORIGIN` set to the production host
- **THEN** responses SHALL include `Access-Control-Allow-Origin: <production host>` and reject other origins

#### Scenario: Preflight handled
- **WHEN** the Worker receives an OPTIONS request to `/api/progression`
- **THEN** it SHALL respond with HTTP 204 and appropriate CORS headers

### Requirement: Shared chord lookup source of truth
The Worker SHALL use the same chord dictionary as the React app, imported from a shared module (`src/lib/chordLookup.ts`).

#### Scenario: Shared module usable from Worker
- **WHEN** the Worker imports `lookupChordForAgent`
- **THEN** the build SHALL succeed and lookups at runtime SHALL return the same results as the app's `lookupChord`

#### Scenario: Suggestion fallback strips quality
- **WHEN** the requested chord is unknown (e.g. "Caug7") and a simpler variant exists (e.g. "C7" or "Caug" or "C")
- **THEN** the suggestion returned by `lookupChordForAgent` SHALL be the first successful simplification

### Requirement: Rationale display
The UI SHALL render the agent's `rationale` string as a subtitle above the chord cards.

#### Scenario: Rationale rendered with successful response
- **WHEN** the agent returns a 200 response containing a `rationale`
- **THEN** the UI SHALL display the rationale as a subtitle (e.g. "Claude chose these because: <rationale>") above the chord cards

#### Scenario: Rationale cleared between prompts
- **WHEN** the user submits a new prompt after a previous result
- **THEN** the previous rationale SHALL be cleared during the loading state and replaced once the new result arrives

### Requirement: Loading, error, and success states
The UI SHALL render distinct loading, error, and success states for the agent flow.

#### Scenario: Loading state during fetch
- **WHEN** a request is in flight
- **THEN** the submit button SHALL be disabled and a spinner or shimmer indicator SHALL be visible

#### Scenario: Error state on failure
- **WHEN** the Worker responds with a non-2xx status
- **THEN** the UI SHALL display an error message with a retry option and SHALL NOT mutate the chord cards from a prior successful response

#### Scenario: Success state populates chord cards
- **WHEN** the Worker returns a valid progression
- **THEN** each chord SHALL be resolved via the shared lookup and passed to the same `onResult` callback that the Free Input flow uses

### Requirement: Secret management
The `ANTHROPIC_API_KEY` SHALL be stored as a Cloudflare Worker secret in production and as a gitignored `.dev.vars` file in local development.

#### Scenario: Production secret
- **WHEN** the Worker is deployed
- **THEN** `ANTHROPIC_API_KEY` SHALL be sourced from the Cloudflare secret store via `env.ANTHROPIC_API_KEY`

#### Scenario: Local development secret
- **WHEN** the Worker runs via `wrangler dev`
- **THEN** `ANTHROPIC_API_KEY` SHALL be sourced from a `.dev.vars` file that is gitignored and never committed

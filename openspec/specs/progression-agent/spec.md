## Purpose
Define natural-language progression generation, provider orchestration, validation, and client-facing error behavior.
## Requirements
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
The system SHALL expose an HTTP POST endpoint at `/api/progression` implemented as a Cloudflare Worker that accepts `{ "prompt": string }` and returns `{ "chords": string[3..8], "key": string, "rationale": string }`.

#### Scenario: Valid prompt produces a progression
- **WHEN** the Worker receives a POST with a non-empty prompt under 500 characters
- **THEN** the Worker SHALL run the OpenAI agent tool loop and respond with HTTP 200 and a validated JSON body containing 3–8 chords

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
The Worker SHALL run an OpenAI Responses API loop with a strict `lookup_chord` function backed by the Harmony Hash chord dictionary. Function outputs SHALL be matched to their call ids, and every final chord SHALL be revalidated server-side before returning to the browser.

#### Scenario: Tool verifies known chord
- **WHEN** OpenAI issues a `lookup_chord` function call for a chord that exists in the dictionary, such as `Cmaj7`
- **THEN** the Worker SHALL submit `{ "valid": true, "chord_name": "Cmaj7" }` as a `function_call_output` with the matching call id

#### Scenario: Tool suggests alternative for unknown chord
- **WHEN** OpenAI issues a `lookup_chord` function call for an unknown chord, such as `Caug7`
- **THEN** the Worker SHALL submit `{ "valid": false, "chord_name": "Caug7", "suggestion": <closest valid chord> }` and allow the model to correct the candidate

#### Scenario: Loop terminates on end_turn
- **WHEN** OpenAI returns no function calls and supplies structured final text
- **THEN** the Worker SHALL parse and validate the final progression before ending the loop

#### Scenario: Multiple tool calls in one response
- **WHEN** OpenAI returns multiple chord lookups in parallel
- **THEN** the Worker SHALL execute and return one call-id-matched output for every valid function call before continuing

#### Scenario: Reasoning and tool items preserved
- **WHEN** a Responses turn contains reasoning or other output items alongside function calls
- **THEN** the Worker SHALL preserve those output items in the next request together with the function outputs

#### Scenario: Final response is authoritative only after validation
- **WHEN** OpenAI returns structured final text
- **THEN** the Worker SHALL parse its JSON schema and re-check every final chord against the shared dictionary before returning HTTP 200

### Requirement: Iteration cap and non-convergence handling
The Worker SHALL cap the OpenAI Responses tool loop at 8 iterations and return HTTP 504 when it does not produce a valid final progression within that cap.

#### Scenario: Loop converges within cap
- **WHEN** the agent returns a valid final progression in 8 or fewer Responses turns
- **THEN** the Worker SHALL return the validated progression with HTTP 200

#### Scenario: Loop exceeds 8 iterations
- **WHEN** the agent has not returned a valid final progression after 8 turns
- **THEN** the Worker SHALL respond with HTTP 504 and error body `{ "error": "Agent did not converge" }`

### Requirement: Output validation
The Worker SHALL validate the OpenAI structured output and shared-dictionary membership before returning it to the client.

#### Scenario: Valid JSON shape passes
- **WHEN** the parsed response is an object with 3–8 string chords, a non-empty `key` string, and a non-empty `rationale` string
- **THEN** the Worker SHALL return HTTP 200 with the JSON body

#### Scenario: Chord count wrong
- **WHEN** the parsed response contains fewer than 3 or more than 8 chords
- **THEN** the Worker SHALL return HTTP 500 and an error describing the validation failure

#### Scenario: Non-JSON assistant text
- **WHEN** the final assistant message is not parseable as JSON
- **THEN** the Worker SHALL return HTTP 500 and log sanitized validation detail for observability

#### Scenario: Unknown final chord
- **WHEN** a final chord does not resolve through the shared lookup
- **THEN** the Worker SHALL reject the entire response and SHALL NOT send a partial progression to the browser

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
The UI SHALL render distinct, bounded loading, error, and success states for the OpenAI progression flow while preserving previously rendered results on failure.

#### Scenario: Loading state during fetch
- **WHEN** a request is in flight
- **THEN** the submit button SHALL be disabled, a progress indicator SHALL be visible, and the prior rationale SHALL be cleared

#### Scenario: Error state on failure
- **WHEN** the Worker responds with a non-2xx status or the request deadline expires
- **THEN** the UI SHALL display an actionable retry message and SHALL NOT mutate chord cards from a prior successful response

#### Scenario: Success state populates chord cards
- **WHEN** the Worker returns a valid progression
- **THEN** each chord SHALL be resolved via the shared lookup and passed to the same `onResult` callback that the Free Input flow uses

### Requirement: Secret management
The `OPENAI_API_KEY` SHALL be stored as a Cloudflare Worker secret in production and as a gitignored `.dev.vars` entry in local development. It SHALL never be exposed to the Vite client or committed source.

#### Scenario: Production secret
- **WHEN** the Worker is deployed
- **THEN** `OPENAI_API_KEY` SHALL be sourced from the Cloudflare secret store via `env.OPENAI_API_KEY`

#### Scenario: Local development secret
- **WHEN** the Worker runs via `wrangler dev`
- **THEN** `OPENAI_API_KEY` SHALL be sourced from the repo-root `.dev.vars` file that is gitignored and never committed

#### Scenario: Browser bundle has no provider key
- **WHEN** the production SPA is built
- **THEN** no `VITE_` variable or compiled client asset SHALL contain the OpenAI key

### Requirement: Progression service health reporting
The Worker SHALL expose progression readiness through `/api/health` using an OpenAI-aware response shape that the browser validates before enabling generation.

#### Scenario: OpenAI is configured
- **WHEN** `OPENAI_API_KEY` is present
- **THEN** `/api/health` SHALL report the progression service as ready

#### Scenario: OpenAI is not configured
- **WHEN** `OPENAI_API_KEY` is absent
- **THEN** `/api/health` SHALL return HTTP 200 but report the progression service as unavailable

#### Scenario: Client and Worker schema agree
- **WHEN** the browser checks health
- **THEN** it SHALL validate the OpenAI readiness field and SHALL NOT depend on an Anthropic-named field

### Requirement: Bounded provider requests
The progression request SHALL have a 30-second deadline in both the browser and Worker/provider path, and failures SHALL preserve previously rendered chord cards.

#### Scenario: Provider request times out
- **WHEN** OpenAI does not complete within the deadline
- **THEN** the Worker SHALL return HTTP 504 with a retryable error and SHALL NOT expose provider internals

#### Scenario: Browser request times out
- **WHEN** the browser deadline expires before a response arrives
- **THEN** the UI SHALL leave loading state, display a retry action, and keep the previous progression unchanged

#### Scenario: Upstream provider rejects a request
- **WHEN** OpenAI returns a non-success response
- **THEN** the Worker SHALL log sanitized provider detail and return HTTP 502 with a client-safe error


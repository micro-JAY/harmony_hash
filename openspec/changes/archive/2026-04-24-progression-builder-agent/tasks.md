## 1. Shared chord lookup module

- [x] 1.1 Create `src/lib/chordLookup.ts` exporting `lookupChordForAgent(chordName: string): ChordLookupResult` and the `ChordLookupResult` interface
- [x] 1.2 Implement suggestion fallback: strip quality suffix one token at a time until a match is found (e.g. `Caug7` → `C7` → `Caug` → `C`)
- [x] 1.3 Verify the new module imports cleanly in both the Vite app and the Worker bundle (no DOM/browser-only deps)
- [x] 1.4 Run `npm run build` — zero TypeScript errors

## 2. Cloudflare Worker scaffold

- [x] 2.1 Install `@anthropic-ai/sdk` as a workspace dependency
- [x] 2.2 Create `worker/index.ts` with fetch handler routing `POST /api/progression` and `OPTIONS /api/progression`
- [x] 2.3 Create `worker/tsconfig.json` extending the project's base config, targeting the Worker runtime
- [x] 2.4 Update `wrangler.jsonc` to set `main: "worker/index.ts"`, keep the existing assets block, and pin `compatibility_date`
- [x] 2.5 Create `.dev.vars.example` at repo root with `ANTHROPIC_API_KEY=` placeholder; confirm `.dev.vars*` is gitignored
- [x] 2.6 Create `worker/README.md` documenting local dev (`wrangler dev`), production secret (`wrangler secret put ANTHROPIC_API_KEY`), and CORS config

## 3. Worker request validation

- [x] 3.1 Parse JSON body; return HTTP 400 on malformed JSON or missing `prompt`
- [x] 3.2 Reject empty / whitespace-only prompts with HTTP 400
- [x] 3.3 Reject prompts longer than 500 characters with HTTP 400
- [x] 3.4 Return HTTP 204 for OPTIONS preflight with appropriate CORS headers

## 4. Worker agent tool loop

- [x] 4.1 Embed the exact Workbench system prompt as a string constant
- [x] 4.2 Embed the exact `lookup_chord` tool definition as a constant
- [x] 4.3 Initialize `messages` with the user prompt and call `anthropic.messages.create` with model `claude-opus-4-7`, `max_tokens: 1024`, system prompt, and tool registered
- [x] 4.4 When `stop_reason === "tool_use"`, append the assistant message, execute each `tool_use` via `lookupChordForAgent`, append `tool_result` blocks, and continue
- [x] 4.5 When `stop_reason === "end_turn"`, find the first text block and parse it as JSON
- [x] 4.6 Any other `stop_reason` throws an unexpected-state error
- [x] 4.7 Hard-cap at 8 iterations; return HTTP 504 with `{ "error": "Agent did not converge" }` on exceeded cap

## 5. Worker output validation and response shaping

- [x] 5.1 Validate parsed JSON: object with exactly 4 string chords, non-empty `key`, non-empty `rationale`
- [x] 5.2 Return HTTP 500 with error details if validation fails
- [x] 5.3 Return HTTP 200 with the validated JSON on success, including CORS headers
- [x] 5.4 Never surface the raw Anthropic API key or internal stack traces to the client

## 6. Worker CORS

- [x] 6.1 Read `env.ALLOWED_ORIGIN`, defaulting to `*` when missing
- [x] 6.2 Add CORS headers to every response (200, 400, 500, 504)
- [x] 6.3 Verify `wrangler dev` serves requests from `http://localhost:5173` successfully

## 7. Local verification

- [x] 7.1 User populated `.dev.vars` at repo root with a real `ANTHROPIC_API_KEY`; wrangler bound it as a hidden env var
- [x] 7.2 `curl -d '{"prompt":"something melancholic in minor with jazz feel"}'` → `{"chords":["Am9","Dm9","Bm7b5","E7"],"key":"A minor","rationale":"..."}` HTTP 200 in 6.0s
- [x] 7.3 `curl -d '{"prompt":"altered dominants and quartal voicings in F minor"}'` → `{"chords":["Fm11","Bbm11","Dbmaj9","C7b9"],"key":"F minor","rationale":"..."}` HTTP 200 in 7.8s
- [x] 7.4 Run curl with `{"prompt":""}` — expect HTTP 400 (verified with placeholder key)
- [x] 7.5 Run curl with a 501+ character prompt — expect HTTP 400 (verified with placeholder key)

## 8. Client fetch wrapper

- [x] 8.1 Create `src/lib/progressionClient.ts` exporting `ProgressionResponse` interface and `generateProgression(prompt)` function
- [x] 8.2 Switch endpoint between `localhost:8787` (dev) and `/api/progression` (prod) via `import.meta.env.DEV`
- [x] 8.3 Surface Worker error bodies as `Error` messages with HTTP status

## 9. ProgressionAgent component

- [x] 9.1 Create `src/components/ProgressionAgent.tsx` with `ProgressionAgentProps { onResult }`
- [x] 9.2 Render a textarea (2–3 rows) + "Build progression" button using design-system tokens (no hardcoded hex/px/rem)
- [x] 9.3 Implement loading state (disabled button, spinner or shimmer)
- [x] 9.4 Implement error state (message + retry button) that leaves any previous chord cards intact
- [x] 9.5 On success, resolve each returned chord name via `lookupChord` (from `chordData.ts`) into `DisplayChord` and call `onResult`
- [x] 9.6 Render the `rationale` as a subtitle above the cards area (cleared during loading)
- [x] 9.7 Clear rationale when a new request starts

## 10. Wire ProgressionAgent into Progressions tab

- [x] 10.1 Read `src/components/ProgressionInput.tsx` to confirm the `onResult` signature and shape
- [x] 10.2 Add `ProgressionAgent` as the primary content of the Progressions tab
- [x] 10.3 Preserve the existing preset browser inside an "Or pick a preset" collapsible section below the agent input
- [x] 10.4 Ensure Free Input tab behavior is byte-for-byte unchanged
- [x] 10.5 Ensure Chord Reference Grid still hides when chords render regardless of generating source

## 11. Styling + design system compliance

- [x] 11.1 Confirm no hardcoded hex/px/rem in `ProgressionAgent.tsx` or any edits to `ProgressionInput.tsx`
- [x] 11.2 Use `--surface-overlay`, `--border-subtle`, `--text-primary`, `--interactive-accent-*`, etc. consistent with existing components
- [x] 11.3 Match the textarea styling to the existing Free Input text field (same fontFamily, padding, radius)

## 12. Build + test + deploy prep

- [x] 12.1 `npm run build` — zero TypeScript errors
- [x] 12.2 `npm run test` — all existing Vitest suites pass
- [x] 12.3 Manual smoke: Progressions tab renders agent textarea, character counter, disclosure collapsible, and preset browser when expanded. Preset I–IV–V resolves to C/F/G chord cards. Agent end-to-end verified with live key: "dreamy lo-fi vibes with smooth changes" → Fmaj7, Em7, Dm9, Cmaj9 with rationale rendered above the cards.
- [x] 12.4 Manual smoke: Free Input tab unchanged; chord cards persist across tab switches
- [x] 12.5 Confirm `.dev.vars` is gitignored (`git check-ignore` verified) and no secret present in any committed file (`.dev.vars.example` committed with empty placeholder only)
- [x] 12.6 Commit each stage per the stage boundaries in the feature prompt

## 13. Openspec archive

- [x] 13.1 After all stages merged, run `/opsx:archive progression-builder-agent`

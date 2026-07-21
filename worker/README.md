# harmony_hash Worker

Backend for the Progression Builder and Harmony Companion. It runs a bounded OpenAI Responses API tool loop against the shared Harmony Hash chord dictionary, mints ElevenLabs signed URLs, reports service readiness, and serves the built SPA through the assets binding.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Returns OpenAI binding readiness without exposing the key. |
| POST | `/api/progression` | Body: `{ "prompt": string }`. Returns `{ chords: string[3..8], key, rationale }`. |
| POST | `/api/voice/signed-url` | Returns a short-lived ElevenLabs `{ signedUrl }`. |
| OPTIONS | `/api/*` | CORS preflight for the API routes. |

Validation:

- Empty or whitespace-only prompt → 400
- Prompt longer than 500 characters → 400
- Malformed JSON body → 400
- Non-JSON final assistant text → 500
- Progression shape invalid → 500
- OpenAI upstream/failed/incomplete response → 502
- OpenAI or Worker deadline expires → 504
- Tool loop exceeds 8 iterations → 504

## Secrets

The progression route requires `OPENAI_API_KEY`. The voice signed-URL route requires `ELEVENLABS_API_KEY` and `HH_VOICE_AGENT_ID`. Never commit either API key and never expose them through `VITE_` variables.

`wrangler.jsonc` declares both provider keys under `secrets.required`. Wrangler uploads and deployments must fail before release when either encrypted binding is unavailable; do not remove or bypass that guard to make a build pass.

### Local development

Both files live at the **repo root** (alongside `wrangler.jsonc`), not inside `worker/`.

1. Copy `.dev.vars.example` → `.dev.vars` (at the repo root).
2. Paste your key into `.dev.vars`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Run `npx wrangler dev` from the repo root. Wrangler picks up `.dev.vars` automatically.

`.dev.vars*` is gitignored.

### Production

```sh
npx wrangler versions secret put OPENAI_API_KEY
npx wrangler versions secret put ELEVENLABS_API_KEY
```

Wrangler prompts for each value and creates a new Worker version carrying the encrypted secret. Deploy that exact version after verification. `HH_VOICE_AGENT_ID` is non-secret and belongs in `wrangler.jsonc`.

If both provider routes return configuration errors while the SPA and `/api/health` remain reachable, inspect secret **names only** with `wrangler versions view <version-id>`. Restore only the missing provider bindings, verify the replacement version lists both required names, and deploy that exact version. Never print, log, or commit the values.

## CORS

The Worker **fails closed** for cross-origin browser requests. `https://harmony.tonari.ai` is always allowed; `env.ALLOWED_ORIGIN` can add staging or other explicit origins.

- **Local Worker:** localhost and `127.0.0.1` browser origins are accepted only when the Worker URL is itself local.
- **Deployed Worker:** the canonical production origin plus entries in the comma-separated allowlist are accepted. `*` is supported as an explicit opt-in.
- **No `Origin` header:** same-origin requests and non-browser callers are accepted; CORS is not request authentication.

Add an extra origin only when needed:

```sh
npx wrangler versions secret put ALLOWED_ORIGIN
# example: https://staging.harmony.tonari.ai
```

Leaving `ALLOWED_ORIGIN` unset keeps the surface to the built-in production origin.

## Running locally

From the repo root:

```sh
# Build the SPA once so the assets binding has something to serve.
npm run build

# Start the Worker + asset server.
npx wrangler dev
```

The Worker listens on `http://localhost:8787` by default.

## Voice agent maintenance

The updater reads the prompt and canonical nine-tool schema, resolves the modern toolbox records behind `prompt.tool_ids`, and reuses only exact contracts. A missing or drifted contract gets a new toolbox record that is re-read before attachment; shared records are never patched or deleted. Before any agent write, the updater fails closed on built-ins, MCP attachments, workflows, nested tool overrides, legacy non-client tools, task-execution authority, and unknown provider capability fields. It then patches only the source-owned prompt/tool ids plus signed auth and proves the live name and complete TTS configuration were preserved. `--verify` performs read-only checks.

```sh
node --env-file=.dev.vars --import tsx scripts/provision-voice-agent.ts
node --env-file=.dev.vars --import tsx scripts/provision-voice-agent.ts --verify
```

With the full Worker running, the live smoke uses Chromium's silent synthetic media device, establishes a real signed ElevenLabs session, asks the real agent to call `replace_progression`, verifies the visible timeline mutation, and disconnects:

```sh
npx tsx scripts/smoke-voice-agent.ts
```

The synthetic device prevents an automated run from capturing ambient microphone audio. A user can still verify their physical microphone through the normal **Talk to the companion** action.

## Quick curl tests

```sh
# Happy path
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d '{"prompt":"something melancholic in minor with jazz feel"}'

# Health (prints booleans only; never a secret value)
curl http://localhost:8787/api/health

# Harder prompt (more tool-loop iterations)
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d '{"prompt":"five chords in F minor with altered dominants, extensions, and one slash chord"}'

# 400 — empty prompt
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d '{"prompt":""}'

# 400 — over-length prompt
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d "$(printf '{"prompt":"%.0s' && printf 'x%.0s' {1..550} && printf '"}')"
```

## Deploy

```sh
npm run deploy
```

The script uses the name, assets binding, routes, and compatibility date from `wrangler.jsonc` so deploy configuration cannot drift between two command lines.

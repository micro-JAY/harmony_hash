# harmony_hash Worker

Backend for the Progression Builder and Hanz voice companion. It runs a bounded OpenAI Responses API tool loop against the shared Harmony Hash chord dictionary, mints server-configured OpenAI Realtime client secrets, reports service readiness, and serves the built SPA through the assets binding.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Returns OpenAI binding readiness without exposing the key. |
| POST | `/api/progression` | Body: `{ "prompt": string }`. Returns `{ chords: string[3..8], key, rationale }`. |
| POST | `/api/voice/client-secret` | Empty body. Returns short-lived `{ clientSecret, expiresAt, sessionEndsAt }` values for one fixed Hanz Realtime session. |
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

Both provider routes require the same server-held `OPENAI_API_KEY`. Never commit it and never expose it through a `VITE_` variable. The Realtime route returns only an ephemeral client secret and expiry metadata; it never returns the standard key or the full fixed session configuration.

`wrangler.jsonc` declares `OPENAI_API_KEY` under `secrets.required`. Wrangler uploads and deployments must fail before release when the encrypted binding is unavailable; do not remove or bypass that guard to make a build pass.

### Local development

Both files live at the **repo root** (alongside `wrangler.jsonc`), not inside `worker/`.

1. Copy `.dev.vars.example` → `.dev.vars` (at the repo root).
2. Paste your key into `.dev.vars`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Run `npm run dev:worker` from the repo root. The launcher lets Wrangler load
   the required provider secret and forwards optional `ALLOWED_ORIGIN` from
   `.dev.vars` as a supported `--var` override.

`.dev.vars*` is gitignored.

### Production

```sh
npx wrangler versions secret put OPENAI_API_KEY
```

Wrangler prompts for the value and creates a new Worker version carrying the encrypted secret. Deploy that exact version after verification.

If both provider routes return configuration errors while the SPA and `/api/health` remain reachable, inspect secret **names only** with `wrangler versions view <version-id>`. Restore the missing OpenAI binding, verify the replacement version lists the required name, and deploy that exact version. Never print, log, or commit the value.

## CORS

The Worker **fails closed** for cross-origin browser requests. `https://harmony.tonari.ai` is always allowed; `env.ALLOWED_ORIGIN` can add staging or other explicit origins.

- **Local Worker:** localhost and `127.0.0.1` browser origins are accepted only when the Worker URL is itself local.
- **Deployed Worker:** the canonical production origin plus entries in the comma-separated allowlist are accepted. `*` is supported as an explicit opt-in.
- **No `Origin` header:** the paid voice client-secret route rejects the request. Other same-origin routes keep their documented behavior; CORS is not general request authentication.

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

# Start the Worker + asset server. This preserves optional local bindings while
# keeping Wrangler's required-secret validation enabled.
npm run dev:worker
```

The Worker listens on `http://localhost:8787` by default.

## Voice verification

With the full Worker running, the live smoke uses Chromium's silent synthetic media device, establishes a real OpenAI WebRTC session, asks Hanz to call `replace_progression`, verifies received remote audio and the visible timeline mutation, and disconnects:

```sh
npx tsx scripts/smoke-voice-agent.ts
```

The synthetic device prevents an automated run from capturing ambient microphone audio. A user can still verify their physical microphone through the normal Hanz start action.

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

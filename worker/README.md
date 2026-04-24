# harmony_hash Worker

Backend for the Progression Builder agent. Handles `POST /api/progression`, runs an Anthropic tool loop against the harmony_hash chord dictionary, and returns a validated 4-chord progression. All other paths fall through to static assets served from `./dist`.

## Endpoints

| Method | Path                 | Description                                                             |
| ------ | -------------------- | ----------------------------------------------------------------------- |
| POST   | `/api/progression`   | Body: `{ "prompt": string }`. Returns `{ chords: string[4], key, rationale }`. |
| OPTIONS | `/api/progression`  | CORS preflight — returns 204.                                           |

Validation:

- Empty or whitespace-only prompt → 400
- Prompt longer than 500 characters → 400
- Malformed JSON body → 400
- Non-JSON final assistant text → 500
- Progression shape invalid → 500
- Tool loop exceeds 8 iterations → 504

## Secrets

The Worker requires `ANTHROPIC_API_KEY`. Never commit it.

### Local development

Both files live at the **repo root** (alongside `wrangler.jsonc`), not inside `worker/`.

1. Copy `.dev.vars.example` → `.dev.vars` (at the repo root).
2. Paste your key into `.dev.vars`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Run `npx wrangler dev` from the repo root. Wrangler picks up `.dev.vars` automatically.

`.dev.vars*` is gitignored.

### Production

```sh
npx wrangler secret put ANTHROPIC_API_KEY
```

Wrangler prompts for the value; Cloudflare stores it as an encrypted secret available to the Worker via `env.ANTHROPIC_API_KEY`.

## CORS

The Worker **fails closed** for cross-origin browser requests and reads `env.ALLOWED_ORIGIN` to decide what to allow.

- **`ALLOWED_ORIGIN` unset (dev fallback):** the Worker permits `http://localhost:*` and `http://127.0.0.1:*` only. Every other cross-origin request gets no `Access-Control-Allow-Origin` header back, so browsers reject the response. Preflight requests from disallowed origins receive `403`. Same-origin requests and non-browser callers (curl, etc.) are unaffected since they don't send `Origin`.
- **`ALLOWED_ORIGIN` set (production):** value is a comma-separated allowlist. Only origins in the list receive CORS headers back. `*` is supported as an explicit opt-in for public endpoints.

Set the production allowlist before deploying:

```sh
npx wrangler secret put ALLOWED_ORIGIN
# enter: https://harmony.tonari.ai
# or a comma-separated list: https://harmony.tonari.ai,https://staging.harmony.tonari.ai
```

Leaving `ALLOWED_ORIGIN` unset on a deployed Worker means only localhost browsers can talk to it — which is almost certainly not what you want in production.

## Running locally

From the repo root:

```sh
# Build the SPA once so the assets binding has something to serve.
npm run build

# Start the Worker + asset server.
npx wrangler dev
```

The Worker listens on `http://localhost:8787` by default.

## Quick curl tests

```sh
# Happy path
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d '{"prompt":"something melancholic in minor with jazz feel"}'

# Harder prompt (more tool-loop iterations)
curl -X POST http://localhost:8787/api/progression \
  -H "Content-Type: application/json" \
  -d '{"prompt":"altered dominants and quartal voicings in F minor"}'

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

See `package.json` for the exact wrangler command.

## Context

The production Worker stayed reachable but its 2026-07-20 branch-build version contained no secret bindings. `/api/health` therefore reported OpenAI unavailable and both `/api/progression` and `/api/voice/signed-url` returned HTTP 500. The prior known-good version proved the provider configuration itself was valid and contained both bindings; restoring those same values to the current code returned all three live probes to HTTP 200.

Wrangler 4.110 supports a checked-in `secrets.required` declaration. Upload and deploy commands validate those names against the Worker before a version can proceed, making the configuration file the fail-closed release boundary that was missing.

## Goals / Non-Goals

**Goals:**

- Reject Worker uploads or deployments that cannot resolve `OPENAI_API_KEY` and `ELEVENLABS_API_KEY`.
- Keep the provider values encrypted and outside git, client bundles, test output, and logs.
- Verify the required-name contract directly and keep the current runtime fail-closed behavior.
- Restore the existing production bindings to the current Worker code and prove both provider routes succeed.

**Non-Goals:**

- Changing provider models, prompts, agents, credentials, rate limits, origins, routes, or UI behavior.
- Restoring unused historical secrets.
- Merging or deploying unrelated feature branches.

## Decisions

1. **Use Wrangler's native required-secret declaration.** Add exactly `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` under `secrets.required`. This is enforced by the same CLI used by local releases and Workers Builds, unlike a documentation-only checklist.
2. **Test the checked-in release contract directly.** A focused Node/Vitest test parses `wrangler.jsonc` and requires the exact two-name set, catching deletion, renaming, or accidental expansion during CI.
3. **Restore values operationally, not in source.** Read the already gitignored `.dev.vars` values into `wrangler versions secret put`, verify the resulting version reports both secret names, and route traffic only after that readback.
4. **Retain runtime diagnostics.** `/api/health` continues to report only a boolean, and both provider routes keep their generic fail-closed 500/502 responses. No secret content becomes observable.

## Risks / Trade-offs

- **[Risk] A developer intentionally runs only one provider locally.** → Both are production-critical and the repository's integrated Worker serves both, so the deploy contract intentionally requires both; local warnings identify the missing name.
- **[Risk] A future provider removal leaves a stale requirement.** → Removing a provider must update its canonical capability spec and this focused configuration test in the same reviewed change.
- **[Risk] A build bypasses Wrangler.** → The current Cloudflare pipeline and documented release command both use Wrangler; live deployment metadata is checked after restoration.

## Migration Plan

1. Create a new Worker version from the current production code with the existing OpenAI secret.
2. Create the next version with the existing ElevenLabs secret and verify both names are attached.
3. Deploy that exact version to 100% traffic and prove health, progression generation, and signed-URL minting return HTTP 200.
4. Add the required-secret declaration and focused test on a separate fix branch; run build, lint, unit, Worker dry-run, strict OpenSpec, and production browser checks.
5. Publish a draft PR only. Do not merge or perform another runtime deployment without explicit approval.

## Open Questions

None.

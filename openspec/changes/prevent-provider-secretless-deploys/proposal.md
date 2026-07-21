## Why

A non-production Workers Build promoted a new Harmony Worker version without `OPENAI_API_KEY` or `ELEVENLABS_API_KEY`, taking both provider-backed experiences offline while the static app remained healthy. The deployment contract must reject any Worker upload that omits either required runtime secret.

## What Changes

- Declare the OpenAI and ElevenLabs Worker secrets as required deployment bindings in the checked-in Wrangler configuration.
- Preserve the existing fail-closed runtime responses while preventing a secretless version from being uploaded or promoted.
- Add focused configuration validation and release checks for both provider bindings.
- Restore the two existing production bindings without changing their values, route behavior, provider configuration, or any product UI.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `progression-agent`: Require deployment validation to reject a Worker release missing `OPENAI_API_KEY`.
- `voice-companion`: Require deployment validation to reject a Worker release missing `ELEVENLABS_API_KEY`.

## Impact

The source change is limited to `wrangler.jsonc`, focused configuration tests, and release documentation/OpenSpec artifacts. The production operation restores only the two existing provider secrets to the current Worker version. No browser component, provider prompt, tool schema, public route, or music-theory behavior changes.

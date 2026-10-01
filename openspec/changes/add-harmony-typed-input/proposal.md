## Why

Harmony currently requires a microphone to start a conversation. Musicians who cannot or prefer not to speak need to type requests while still hearing Harmony's answers and using the same progression tools.

## What Changes

- Offer a mutually exclusive Voice or Type choice inside the panel before starting a session.
- Connect Type sessions without requesting microphone access and keep spoken output enabled.
- Add a bounded message composer and transcript entries for typed requests, with clear availability and failure states.
- Preserve the existing nine tools, fixed session deadline, collapse behavior, authentication route, and voice-input defaults.
- Align spoken agent guidance with typed requests and the v4 ukulele instrument option, without changing tool contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voice-companion`: Choose input mode before connecting and support typed input with spoken replies.

## Impact

The source-owned Realtime browser transport, provider, panel, transcript coordinator, English/Japanese copy, and voice tests change. The server credential endpoint, its security contract, the tool surface, app routing, and onboarding tour remain unchanged. No dependencies are added.

## Context

Hanz currently receives ElevenLabs agent text and renders it in the transcript, but the client has no explicit voice-session contract and no audio-health evidence. The decisive live protocol trace showed the server sending `agent_response` events while producing zero TTS seconds and no `audio` events. The source provisioner had configured only `agent_response_complete`, omitting the required WebSocket `audio` client event. Separately, `HH_VOICE_ID` is used only when creating an agent; updates intentionally omit all TTS fields. The live agent audit also found drift from the source contract: voice output is configured, but signed authentication is disabled and a hostname allowlist remains.

The existing nine browser client tools are a better low-latency integration point than a new MCP server for app-local facts. An MCP hop would add another service, authentication surface, round trip, and serialized context without making the browser's progression state more authoritative.

## Goals / Non-Goals

**Goals:**

- Guarantee that Hanz starts a voice conversation and explicitly uses normal output volume.
- Provision the exact voice client-event inventory required for audio, transcript, correction, and completion handling.
- Make an explicitly supplied voice ID authoritative for both live agent provisioning and optional session override.
- Distinguish agent text, generated audio packets, and browser output health in tests and user-facing diagnostics.
- Restore the live agent to signed authentication and verify the persisted voice configuration.
- Define the cheapest path to deeper progression/theory answers using deterministic local facts plus small retrieved teaching cards.

**Non-Goals:**

- No new LLM provider, MCP server, vector database, or RAG runtime in this repair.
- No change to HASHER progression generation, its nine mutation/playback tools, Tune Toolbox, Fret Finder, or the user's timeline model.
- No client exposure of the ElevenLabs API key.
- No automatic overwrite of a live voice unless `HH_VOICE_ID` is explicitly supplied.

## Decisions

### Explicit voice session at both provider and start boundary

Set `textOnly: false` and `overrides.conversation.textOnly: false` on the provider/start options. The duplication is intentional defense in depth across the current SDK's two supported configuration paths. The installed SDK owns the single microphone stream and requests it only after the user's explicit start action. When connected the panel explicitly sets output volume to `1`.

Alternatives considered: relying on provider defaults leaves dashboard/session drift invisible; synthesizing transcript text with a second TTS request duplicates cost and bypasses ElevenLabs conversational interruption/alignment.

### Voice ID is explicit and server-managed

In provisioning, `HH_VOICE_ID` on an existing agent patches only `conversation_config.tts.voice_id`. Readback must prove that voice changed to the requested value while the TTS model and every other TTS field remain identical. The browser uses this persisted voice and does not expose a `VITE_` override; the live agent deliberately blocks client voice overrides, and weakening that security setting is unnecessary.

Alternatives considered: hard-coding the current dashboard voice would make future voice changes require a code release; always patching the default voice would silently overwrite operator-owned configuration; enabling browser voice overrides would let an untrusted client replace the operator-verified voice.

### Audio must be requested from the provider

Provision `audio`, `user_transcript`, `agent_response`, `agent_response_complete`, and `interruption` as the exact client-event inventory. The `audio` event carries base64 output for WebSocket sessions; omitting it produced successful text turns with zero TTS output and nothing for the browser to play. Existing-agent updates patch only this event list and readback proves every other conversation setting is preserved.

### Audio health is observable, not inferred from transcript text

Record the created conversation kind and count `onAudio` packets in the provider context. An agent response starts a bounded audio watchdog. If the response completes while the session is voice-mode but no audio packet arrives, the panel reports a specific output-audio problem rather than claiming the conversation is healthy. Tests assert voice session options, non-zero audio packet evidence, and output volume initialization.

### Prefer local deterministic context over MCP for the next intelligence step

The next Hanz intelligence increment should add one compact browser client tool, `get_harmony_context`, backed by the existing timeline and explicit HASHER key/mode refs. It should return only requested facts: chord symbols and tones, explicit key/mode, local roman-numeral/function labels, shared-tone/voice-leading motion, secondary-dominant targets, and at most three continuation candidates. A small curated teaching-card index can retrieve one to three short explanations for concepts such as secondary dominants, modal interchange, guide tones, and chord-scale choices.

This hybrid keeps user/timeline truth local, reduces repeated prompt reasoning, and sends tens or hundreds of tokens rather than a full knowledge base. MCP becomes worthwhile only if the same harmony service must serve multiple products or remote agents; a vector database becomes worthwhile only after the curated card set outgrows deterministic tags and exact topic lookup.

## Risks / Trade-offs

- **[Risk] Browser media or autoplay policy blocks output despite valid TTS.** -> Keep one SDK-owned media stream, force volume, expose separate session/audio diagnostics, and run a real headless browser with fake media plus agent audio-packet assertions.
- **[Risk] Partial PATCH semantics erase TTS settings.** -> Send only `voice_id`, then compare canonicalized before/after TTS objects with only that field allowed to differ.
- **[Risk] The intended and persisted voice IDs drift.** -> Log the safe persisted voice ID during provisioning verification and require explicit `HH_VOICE_ID` for a change.
- **[Risk] An audio watchdog fires during a slow first response.** -> Arm it only after a final agent message and cancel immediately on the first audio packet, disconnect, or new session.
- **[Risk] A future theory-context tool bloats every turn.** -> Make depth/topic explicit, cap candidates and retrieved cards, and return stable compact fields rather than prose dumps.

## Migration Plan

1. Deploy the client with explicit voice options and audio diagnostics.
2. Run provisioning with the current agent ID; supply `HH_VOICE_ID` only when that voice is intended to change.
3. Re-read and verify signed auth, empty allowlist, voice ID, TTS preservation, prompt, and tool contracts.
4. Roll back the client commit if browser audio regresses; the live agent voice patch is independently reversible by rerunning provisioning with the previous voice ID.

## Open Questions

- The deterministic `get_harmony_context` tool and curated teaching cards should be a follow-up OpenSpec change after spoken output is stable and measured.

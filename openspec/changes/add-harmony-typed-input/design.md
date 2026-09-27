## Context

The existing OpenAI Realtime browser transport owns a peer, data channel, remote audio element, fixed monotonic deadline, and cleanup. The provider's coordinator validates completed tool calls and maintains an ordered transcript ledger. The panel remains mounted when hidden. See proposal.md for motivation. The canonical voice spec contains older ElevenLabs details; this additive change follows the shipped OpenAI transport and leaves the separate migration artifacts untouched.

## Goals / Non-Goals

**Goals:** Preserve the existing voice path and nine-tool bridge while adding a microphone-free input mode. Make the selected mode and send availability unambiguous. Keep input mode separate from output modality so audio-health checks still require spoken answers.

**Non-Goals:** New credential routes, auth configuration changes, silent text replies, in-session mode switching, tool-contract changes, new state libraries, and tour edits.

## Decisions

- Use a compact, accessible two-option input control before connecting. Disable it during the session; users end a conversation before switching modes. This avoids accidental microphone acquisition or mixed inputs mid-conversation.
- For Type mode, negotiate a receive-only audio transceiver without calling getUserMedia. Reuse the exact client-secret endpoint and remote-audio readiness checks. Keep the source-owned audio output configuration; no new backend configuration is needed.
- Send `conversation.item.create` with a user `input_text` item followed by an audio `response.create`. This uses the existing WebRTC data channel and tool flow. A separate HTTP text agent would diverge from the current conversation and tool semantics.
- Track response availability in the coordinator, including the opening greeting and async tool continuation. A bounded 2000-character composer sends one request at a time. Failures preserve the draft and surface a clear error; a partially sent exchange ends the session to avoid uncertain retries.
- Ingest typed user-message acknowledgements into the existing transcript ledger using provider item ordering. This avoids duplicating local and server-acknowledged entries.
- Gate Type sending on both response/tool completion and per-response output-audio buffer completion. Track started, stopped, and cleared events separately so a delayed or duplicate playback event cannot unlock another response.
- Retain the sent draft in the provider until its exact message ID and text are acknowledged. Keep the composer read-only during this short acknowledgement wait, and clear the draft through the acknowledgement callback. A failed local send, asynchronous provider error, or disconnection leaves it intact for retry.
- Keep `sessionKind` describing spoken output; add distinct input-mode state. Voice-health warnings remain valid for Type mode because its responses still contain audio.
- Keep source-owned agent wording consistent with typed requests and v4 ukulele support. The playback prompt, randomization description, and bridge comments include ukulele; tool names and parameters stay unchanged.

## Risks / Trade-offs

- Receive-only SDP must negotiate remote audio even with no local device. Mitigate with transport tests, browser coverage without media permissions, and a real browser negotiation smoke where practical.
- A server acknowledgement and response events can arrive asynchronously. Mitigate with coordinator guards and ordered-ledger tests for typed items and tool continuations.
- Browser autoplay can block sound without microphone activation. Retain explicit start/send gestures and surface existing audio-playback errors; verify browser behavior.
- Paid, live provider behavior is separate from deterministic fixtures. Report any unrun live smoke explicitly.

## Validation and References

- Transport tests for microphone exclusion, receive-only audio, lifecycle cleanup, deadline, and existing Voice behavior.
- Coordinator tests for typed messages, response gating, transcript ordering, and failed sends.
- Browser tests for mode selection, compose/send, progression edits, popup persistence, and mobile fit.
- Build, lint, full unit suite, focused voice browser suite, and strict OpenSpec validation.
- Official API contract: https://developers.openai.com/api/docs/guides/realtime-conversations

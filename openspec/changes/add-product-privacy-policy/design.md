# Design

## Decisions

- Reuse the shared `AccessibleDialog` so focus trapping, Escape handling, background isolation, reduced motion, and mobile-safe scrolling follow existing behavior.
- Keep the policy in the existing translation system and expose it from a quiet footer control available in every workspace.
- State the boundary precisely: Tonari stores musical state in the browser and does not create a voice recording, while ElevenLabs processes live audio and transcript data during a conversation.
- Set `record_voice: false`, `retention_days: 0`, `delete_transcript_and_pii: true`, and `delete_audio: true` for future conversations. Do not retroactively delete existing provider records.
- Keep the OpenAI progression request at `store: false` and disclose that standard abuse-monitoring logs may still apply.

## Verification

- Translation and component tests cover both locales and the regulatory sections.
- Voice provisioning tests prove create/update payloads contain the privacy block and configuration reads expose it.
- Playwright verifies keyboard-close, focus return, desktop layout, and mobile scrolling.

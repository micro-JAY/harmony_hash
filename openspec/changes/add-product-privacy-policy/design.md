# Design

## Decisions

- Reuse the shared `AccessibleDialog` so focus trapping, Escape handling, background isolation, reduced motion, and mobile-safe scrolling follow existing behavior.
- Keep the policy in the existing translation system and expose it from a quiet footer control available in every workspace.
- State the boundary precisely: Tonari keeps up to 20 recent transcript messages temporarily in browser memory for the active Hanz UI and clears them at conversation boundaries, does not create an audio recording, and relies on ElevenLabs to process live audio and transcript data during a conversation.
- Set `record_voice: false`, `retention_days: 0`, `delete_transcript_and_pii: true`, and `delete_audio: true` for future conversations. Do not retroactively delete existing provider records.
- Keep the OpenAI progression request at `store: false` and disclose that standard abuse-monitoring logs may still apply.

## Verification

- Translation and component tests cover both locales and the regulatory sections.
- Voice provisioning tests prove create/update payloads contain the privacy block and configuration reads expose it.
- Playwright verifies keyboard-close, focus return, desktop layout, and mobile scrolling.
- Focused content and provider tests verify the temporary browser transcript disclosure, transcript clearing, self-hosted-font recipient list, and operator requirement.

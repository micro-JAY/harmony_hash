# Design

## Decisions

- Reuse the shared `AccessibleDialog` so focus trapping, Escape handling, background isolation, reduced motion, and mobile-safe scrolling follow existing behavior.
- Keep the policy in the existing translation system and expose it from a quiet footer control available in every workspace.
- State the boundary precisely: Tonari keeps up to 20 recent transcript messages temporarily in application memory for the active Hanz UI, clears them whenever a session starts or disconnects, and does not persist Hanz audio or transcripts in browser storage or an application database.
- Disclose that OpenAI Realtime processes live audio and conversation text, and that provider security, abuse-monitoring, or legally required processing and logs may apply under OpenAI's controls and policies.
- Preserve the historical rationale for the retired ElevenLabs privacy flags (`record_voice: false`, `retention_days: 0`, `delete_transcript_and_pii: true`, and `delete_audio: true`) without retaining them as current requirements. The OpenAI Realtime migration removed provider-agent provisioning, so the policy promises only app-owned behavior and accurately describes provider processing.
- Keep the OpenAI progression request at `store: false` and disclose that standard abuse-monitoring logs may still apply.

## Verification

- Translation and component tests cover both locales and the regulatory sections.
- Playwright verifies keyboard-close, focus return, desktop layout, and mobile scrolling.
- Focused content and Realtime coordinator tests verify the provider disclosure, bounded temporary transcript, clearing on session start/restart and disconnect, self-hosted-font recipient list, and operator requirement.

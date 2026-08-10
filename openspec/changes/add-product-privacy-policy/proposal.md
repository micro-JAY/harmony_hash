# Change: Add product privacy policy and minimize Hanz data persistence

## Why

Harmony Hash needs an in-product privacy notice because the progression builder and Hanz voice companion use external AI providers. The original ElevenLabs-backed Hanz implementation also permitted provider-side voice recording and indefinite conversation retention, which conflicted with the intended product behavior. Hanz has since migrated to OpenAI Realtime and no longer has a mutable provider-side agent to provision; this reconciliation preserves the original data-minimization objective without promising provider controls the app does not set.

## What Changes

- Add an accessible English/Japanese privacy-policy control and modal to the global app shell.
- Describe the distinct data flows for local musical state, AI progression prompts, and OpenAI Realtime Hanz conversations.
- Cover GDPR/UK GDPR, California and other U.S. privacy rights, Japan APPI, international transfers, retention, children, security, and automated decision-making.
- Keep no more than 20 recent Hanz transcript messages in application memory and clear them whenever a session starts or disconnects.
- Disclose that Tonari does not persist Hanz audio or transcripts in browser storage or an application database, while OpenAI processing and provider security, abuse-monitoring, or legally required logs may still apply.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: Add a localized, globally available privacy notice that identifies the operator and accurately describes each product data flow.
- `voice-companion`: Minimize app-side persistence, clear the browser-held Hanz transcript at session boundaries, and accurately disclose OpenAI Realtime processing.

## Impact

- Affected specs: `app-shell`, `voice-companion`
- Affected code: app shell, translations, privacy UI, Realtime session lifecycle, unit tests, and browser tests
- External configuration: none; the retired ElevenLabs provisioning controls remain part of the change history but are superseded by the OpenAI Realtime migration

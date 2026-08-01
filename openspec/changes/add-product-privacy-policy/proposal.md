# Change: Add product privacy policy and minimize Hanz retention

## Why

Harmony Hash currently has no in-product privacy notice even though the progression builder and Hanz voice companion use external AI providers. The live Hanz agent also permits provider-side voice recording and indefinite conversation retention, which conflicts with the intended product behavior.

## What Changes

- Add an accessible English/Japanese privacy-policy control and modal to the global app shell.
- Describe the distinct data flows for local musical state, AI progression prompts, and live Hanz conversations.
- Cover GDPR/UK GDPR, California and other U.S. privacy rights, Japan APPI, international transfers, retention, children, security, and automated decision-making.
- Provision Hanz with voice recording disabled and new-conversation retention set to zero.
- Verify the source-owned privacy configuration in provisioning tests and live-agent audits.

## Impact

- Affected specs: `app-shell`, `voice-companion`
- Affected code: app shell, translations, privacy UI, voice-agent provisioning, unit and browser tests
- External configuration: future Hanz conversations use the source-controlled privacy settings; existing conversation records are not deleted by this change

## ADDED Requirements

### Requirement: Voice deployment requires its provider secret
The checked-in Worker deployment configuration SHALL declare `ELEVENLABS_API_KEY` as required so Wrangler rejects a Worker upload or deployment that cannot resolve the voice provider secret.

#### Scenario: Secret is configured
- **WHEN** a Worker release runs with `ELEVENLABS_API_KEY` configured in Cloudflare
- **THEN** Wrangler SHALL admit the voice provider binding without exposing its value

#### Scenario: Secret is missing
- **WHEN** a Worker release runs without `ELEVENLABS_API_KEY` configured
- **THEN** Wrangler SHALL fail the release before the secretless version can be promoted

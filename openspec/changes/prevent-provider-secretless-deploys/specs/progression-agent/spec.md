## ADDED Requirements

### Requirement: Progression deployment requires its provider secret
The checked-in Worker deployment configuration SHALL declare `OPENAI_API_KEY` as required so Wrangler rejects a Worker upload or deployment that cannot resolve the progression provider secret.

#### Scenario: Secret is configured
- **WHEN** a Worker release runs with `OPENAI_API_KEY` configured in Cloudflare
- **THEN** Wrangler SHALL admit the progression provider binding without exposing its value

#### Scenario: Secret is missing
- **WHEN** a Worker release runs without `OPENAI_API_KEY` configured
- **THEN** Wrangler SHALL fail the release before the secretless version can be promoted

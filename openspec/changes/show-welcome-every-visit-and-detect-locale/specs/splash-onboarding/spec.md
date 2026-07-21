## MODIFIED Requirements

### Requirement: Visit onboarding
The application SHALL show the concise Tonari-styled onboarding dialog whenever a normal app visit mounts, regardless of a prior versioned dismissal record.

#### Scenario: Returning visitor
- **WHEN** the application loads with the current versioned dismissal record
- **THEN** onboarding SHALL open and SHALL explain Hasher, Tune Toolbox, Fret Finder, instrument switching, playback, and cross-tool handoff

#### Scenario: Automated returning-visitor fixture
- **WHEN** the application is built with `VITE_HH_E2E=true` and the current dismissal record is present
- **THEN** onboarding MAY remain closed so existing end-to-end flows can enter their target surface directly

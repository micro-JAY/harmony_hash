## ADDED Requirements

### Requirement: Distinct Progression Builder actions
The Progressions prompt surface SHALL expose adjacent Modify and Re-run actions. Modify SHALL use the academy-blue status color scheme, while Re-run SHALL retain the established generation accent styling. Both controls SHALL share loading, error, cancellation, and responsive layout behavior.

#### Scenario: Builder controls on desktop
- **WHEN** the Progressions prompt surface has usable input space on a desktop viewport
- **THEN** Modify and Re-run SHALL be visible beside the textarea with distinct accessible names

#### Scenario: Builder controls on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the textarea, Modify action, and Re-run action SHALL reflow without horizontal document overflow

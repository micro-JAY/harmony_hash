## ADDED Requirements

### Requirement: Distinct Progression Builder actions
The Progressions prompt surface SHALL expose adjacent Modify and stateful Run/Re-run actions. Modify SHALL use the academy-blue status color scheme, while the Run/Re-run action SHALL retain the established generation accent styling. Both controls SHALL share loading, error, cancellation, and responsive layout behavior.

#### Scenario: Builder controls on desktop
- **WHEN** the Progressions prompt surface has usable input space on a desktop viewport
- **THEN** Modify and the stateful Run/Re-run action SHALL be visible beside the textarea with distinct accessible names

#### Scenario: Builder controls on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the textarea, Modify action, and stateful Run/Re-run action SHALL reflow without horizontal document overflow

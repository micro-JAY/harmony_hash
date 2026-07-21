## ADDED Requirements

### Requirement: Immersive canonical welcome identity
The onboarding dialog SHALL use the current canonical Harmony Hash mark in a full-coverage visual surface on desktop, with the mark filling the visual column without clipping or displacing the copy panel. The same source asset SHALL provide the shipped favicon and Apple touch icon at their respective fixed dimensions.

#### Scenario: Desktop welcome identity
- **WHEN** a first-time visitor opens onboarding at desktop width
- **THEN** the left welcome visual surface SHALL be fully covered by the canonical artwork and the title, description, and actions SHALL remain fully visible in the adjacent copy panel

#### Scenario: Browser icon derivatives
- **WHEN** the application document loads
- **THEN** its favicon and Apple touch icon links SHALL resolve to PNG derivatives of the canonical asset at the required icon dimensions

### Requirement: Welcome copy and destination presentation
The onboarding dialog SHALL present the approved `HARMONIOUS HARMONY` title, the user-approved branded tagline, a `TAKE A TOUR` secondary action, and visually meaningful decorative destination symbols for Tune Toolbox and Fret Finder while preserving each destination's text label.

#### Scenario: Guided tour action remains available
- **WHEN** a visitor activates `TAKE A TOUR` from onboarding
- **THEN** onboarding SHALL close and the existing guided tour SHALL open at its first workspace-selection step

#### Scenario: Reopened welcome presentation
- **WHEN** a returning user opens Help/About
- **THEN** the refreshed identity, approved copy, and destination symbols SHALL render without corrupting the stored dismissal record

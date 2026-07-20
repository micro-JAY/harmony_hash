## MODIFIED Requirements

### Requirement: Application header
The application SHALL display a branded header with the app name `Harmony Hash`, the Tonari Labs identity, accessible `Hasher` / `Tune Toolbox` / `Fret Finder` workspace navigation, a persistent labeled Help/About action, and a labeled EN/JP locale group. Builder-only instrument selection SHALL NOT render in the global header and SHALL instead live with the HASHER output controls it governs.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display Harmony Hash, Hasher, Tune Toolbox, and Fret Finder workspace controls, the locale group, and the Help/About action
- **AND** no Guitar/Piano instrument selector SHALL render in the header

#### Scenario: Default workspace
- **WHEN** the application loads without a prior in-session workspace selection
- **THEN** Hasher SHALL be the active workspace

#### Scenario: Theory replaces separate learning destinations
- **WHEN** the header renders
- **THEN** THE CIRCLE, Scale Synthesia, Note Neural Network, and Improv Insight SHALL NOT appear as separate top-level workspace controls

#### Scenario: Keyboard workspace selection
- **WHEN** a workspace, Help/About, or locale control receives keyboard focus
- **THEN** it SHALL expose visible focus and activate with standard button keyboard behavior

#### Scenario: Responsive navigation
- **WHEN** the header renders at desktop, tablet, or 375px mobile width
- **THEN** workspace navigation SHALL remain centered and every locale and Help/About control SHALL remain reachable with a 44px minimum target and no horizontal document overflow

#### Scenario: Header utility continuity
- **WHEN** Help/About opens and closes or EN/JP changes locale
- **THEN** existing onboarding focus restoration and locale state SHALL remain unchanged

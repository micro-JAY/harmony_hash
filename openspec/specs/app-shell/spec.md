## Purpose
Define the responsive application shell, design-system integration, and page structure shared across Harmony Hash.
## Requirements
### Requirement: Tonari Labs design system integration
The application SHALL import and use the Tonari Labs design system CSS tokens from the CDN.

#### Scenario: Design tokens loaded
- **WHEN** the application loads
- **THEN** the Tonari Labs design system stylesheet SHALL be loaded from `https://cdn.jsdelivr.net/gh/micro-JAY/tonari-design-system@main/tokens.css`

#### Scenario: Dark navy background
- **WHEN** any page is rendered
- **THEN** the page background SHALL use the design system's dark navy color

#### Scenario: Glow accent for interactive elements
- **WHEN** interactive elements (buttons, toggles, active states) are rendered
- **THEN** they SHALL use `--glow-accent` from the design token system

#### Scenario: Typography
- **WHEN** text is rendered
- **THEN** it SHALL use the Zalando Sans font family from the design system

### Requirement: Responsive single-page layout
The application SHALL be a single-page app with a responsive layout that works on desktop, tablet, and mobile viewports without horizontal document overflow.

#### Scenario: Desktop layout
- **WHEN** the viewport is 1024px or wider
- **THEN** chord cards SHALL be displayed in a horizontal wrapping row or multi-column grid and action controls SHALL share a compact toolbar

#### Scenario: Tablet layout
- **WHEN** the viewport is between 768px and 1023px
- **THEN** chord cards SHALL reflow to a 2-column grid and the action toolbar SHALL wrap without clipping

#### Scenario: Mobile layout
- **WHEN** the viewport is less than 768px
- **THEN** header, input, action, and chord-card controls SHALL stack or wrap within the viewport and chord cards SHALL form a single column

#### Scenario: Mobile width invariant
- **WHEN** the app renders at 375px width
- **THEN** the document SHALL have no unintended horizontal scrolling

### Requirement: Application header
The application SHALL display a branded header with the app name "Harmony Hash" and the Tonari Labs identity.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display "Harmony Hash" as the title with the instrument toggle control

### Requirement: Page structure
The application SHALL follow a top-to-bottom layout of Header → Input Area (including its mode-specific reference or preset fallback) → Compact Action Toolbar → Chord Cards Output. Optional expanded companion content SHALL appear only after explicit user action.

#### Scenario: Input area placement
- **WHEN** the page loads
- **THEN** the active progression input controls SHALL appear below the header and above the action toolbar

#### Scenario: Compact action toolbar
- **WHEN** the builder is idle or has rendered chords
- **THEN** applicable Randomize, Play/Stop, and Harmony Companion controls SHALL occupy one responsive toolbar without a card-sized idle gap

#### Scenario: Output area
- **WHEN** a progression is submitted
- **THEN** chord cards SHALL render in a dedicated output area immediately after the compact action toolbar

#### Scenario: Companion expansion
- **WHEN** the user explicitly expands Harmony Companion
- **THEN** its full session content MAY occupy additional space while preserving the surrounding progression state


## MODIFIED Requirements

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

### Requirement: Page structure
The application SHALL follow a top-to-bottom layout of Header → Input Area → Compact Action Toolbar → Chord Cards Output → Reference Content. Optional expanded companion content SHALL appear only after explicit user action.

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

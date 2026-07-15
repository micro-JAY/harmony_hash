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
The application SHALL display a branded header with the app name "Harmony Hash", the Tonari Labs identity, accessible `Hasher` / `Tune Toolbox` / `Fret Finder` workspace navigation, and a persistent onboarding Help/About action.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display "Harmony Hash", Hasher, Tune Toolbox, and Fret Finder workspace controls, the builder instrument toggle where relevant, locale control, and the Help/About action

#### Scenario: Default workspace
- **WHEN** the application loads without a prior in-session workspace selection
- **THEN** Hasher SHALL be the active workspace

#### Scenario: Theory replaces separate learning destinations
- **WHEN** the header renders
- **THEN** Circle of Fifths, Scale Synthesia, Note Neural Network, and Improv Insight SHALL NOT appear as separate top-level workspace controls

#### Scenario: Keyboard workspace selection
- **WHEN** a workspace control receives keyboard focus
- **THEN** it SHALL expose visible focus and activate with standard button keyboard behavior

#### Scenario: Responsive navigation
- **WHEN** the header renders at tablet or 375px mobile width
- **THEN** all workspace, instrument, locale, and Help/About controls SHALL remain reachable with 44px minimum targets and without horizontal document overflow

### Requirement: Page structure
The application SHALL present Hasher, the unified Tune Toolbox workspace, or the Fret Finder explorer below the shared header according to the active workspace. Hasher SHALL retain Context/Input → Compact Action Toolbar → Chord Cards ordering, with optional expanded companion or insight content shown only after explicit user action.

#### Scenario: Input area placement
- **WHEN** Hasher loads
- **THEN** the mode controls, Browse Chords control, harmony context, and active progression input controls SHALL appear below the header and above the action toolbar

#### Scenario: Compact action toolbar
- **WHEN** Hasher is idle or has rendered chords
- **THEN** applicable Randomize, Play/Stop, Share, Improv Insight, and Harmony Companion controls SHALL occupy one responsive toolbar without a card-sized idle gap

#### Scenario: Output area
- **WHEN** a progression is submitted
- **THEN** chord cards SHALL render in a dedicated output area immediately after the compact action toolbar

#### Scenario: Companion or insight expansion
- **WHEN** the user explicitly expands Harmony Companion or Improv Insight
- **THEN** its full content MAY occupy additional space while preserving the surrounding progression state and containing itself within the workspace

#### Scenario: Hasher structure
- **WHEN** Hasher is active
- **THEN** the progression input controls SHALL appear below the header and above the chord-card output area

#### Scenario: Tune Toolbox structure
- **WHEN** Tune Toolbox is active
- **THEN** the shared context rail and collapsible Circle, Scale, and Network tools SHALL replace the visible Hasher below the header

#### Scenario: Fret Finder structure
- **WHEN** Fret Finder is active
- **THEN** the independent explorer controls and horizontal instrument board SHALL replace the visible Hasher below the header

#### Scenario: Hasher state preservation
- **WHEN** the user creates a progression, visits Tune Toolbox or Fret Finder, and returns to Hasher
- **THEN** the same progression, Hasher mode contexts, builder instrument, chord variants, locks, and compatible display state SHALL remain available

#### Scenario: Active companion continuity
- **WHEN** the user changes workspaces while the Harmony Companion provider is mounted
- **THEN** the provider SHALL remain mounted instead of ending the session as a navigation side effect
- **AND** leaving Hasher SHALL close the visible panel and clear Hanz focus without merging it with the playback cursor
- **AND** the companion action SHALL remain available when the user returns to Hasher

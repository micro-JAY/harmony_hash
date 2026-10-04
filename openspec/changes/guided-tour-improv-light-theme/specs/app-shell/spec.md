## MODIFIED Requirements

### Requirement: Tonari Labs design system integration
The application SHALL load its source-controlled Tonari Labs semantic design tokens and SHALL map them to the active dark or light appearance without replacing music-specific interaction semantics.

#### Scenario: Design tokens loaded
- **WHEN** the application loads
- **THEN** the source-controlled `/tokens.css` stylesheet SHALL be loaded before application styles

#### Scenario: Theme-aware page background
- **WHEN** any page is rendered
- **THEN** its background, surfaces, text, borders, controls, shadows, and semantic music labels SHALL use the active appearance's semantic tokens

#### Scenario: Dark navy background
- **WHEN** Dark is the active appearance
- **THEN** the page background SHALL use the design system's dark navy semantic surface

#### Scenario: Glow accent for interactive elements
- **WHEN** interactive elements such as buttons, toggles, and active states are rendered
- **THEN** they SHALL use the active theme's semantic accent tokens with readable contrast

#### Scenario: Typography
- **WHEN** text is rendered
- **THEN** it SHALL use the Zalando Sans font family from the design system

### Requirement: Application header
The application SHALL display a branded header with the Harmony Hash and Tonari Labs identity, accessible `Hasher` / `Tune Toolbox` / `Discovery` workspace navigation, locale control, and a persistent Help / About action.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display Harmony Hash branding, Hasher, Tune Toolbox, and Discovery workspace controls, locale control, and the Help / About action

#### Scenario: Default workspace
- **WHEN** the application loads without a prior in-session workspace selection
- **THEN** Hasher SHALL be the active workspace

#### Scenario: Theory replaces separate learning destinations
- **WHEN** the header renders
- **THEN** Fret Finder, Circle of Fifths, Scale Synthesia, Note Neural Network, and Improv Insight SHALL NOT appear as separate top-level workspace controls

#### Scenario: Keyboard workspace selection
- **WHEN** a workspace control receives keyboard focus
- **THEN** it SHALL expose visible focus and activate with standard button keyboard behavior

#### Scenario: Responsive navigation
- **WHEN** the header renders at tablet or 375px mobile width
- **THEN** all workspace, locale, and Help / About controls SHALL remain reachable with 44px minimum targets and without horizontal document overflow

### Requirement: Page structure
The application SHALL present Hasher, the unified Tune Toolbox workspace, or Discovery below the shared header according to the active workspace. Hasher SHALL retain Context/Input then Compact Action Toolbar then Chord Cards ordering, with optional expanded companion or insight content shown only after explicit user action.

#### Scenario: Input area placement
- **WHEN** Hasher loads
- **THEN** the input-mode controls, Browse Chords control, harmony context, and active progression input controls SHALL appear below the header and above the action toolbar

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
- **THEN** Fret Finder followed by the shared context rail and collapsible Scale, Circle, and Network tools SHALL replace the visible Hasher below the header

#### Scenario: Fret Finder structure
- **WHEN** Tune Toolbox is active and its Fret Finder section is expanded
- **THEN** the independent explorer controls and horizontal instrument board SHALL appear inside Tune Toolbox rather than as a top-level workspace

#### Scenario: Discovery structure
- **WHEN** Discovery is active
- **THEN** its note-first instrument, chord-identification feedback, Improv Insight scale guidance, and read-only Hasher progression loop SHALL replace the visible Hasher below the header

#### Scenario: Hasher state preservation
- **WHEN** the user creates a progression, visits Tune Toolbox or Discovery, and returns to Hasher
- **THEN** the same progression, Hasher mode contexts, builder instrument, chord variants, locks, and compatible display state SHALL remain available

#### Scenario: Active companion continuity
- **WHEN** the user changes workspaces while the Harmony Companion provider is mounted
- **THEN** the provider SHALL remain mounted instead of ending the session as a navigation side effect
- **AND** leaving Hasher SHALL close the visible panel and clear Hanz focus without merging it with the playback cursor
- **AND** the companion action SHALL remain available when the user returns to Hasher

## ADDED Requirements

### Requirement: Persisted appearance selection
The application SHALL provide explicit Dark and Light appearance options inside Help / About, default to Dark when no valid preference exists, and apply the selected appearance throughout every workspace.

#### Scenario: Change appearance in Help / About
- **WHEN** the user selects Light or Dark inside Help / About
- **THEN** the application SHALL update immediately without closing the dialog or moving focus away from the chosen control
- **AND** the active choice SHALL be exposed without relying on its icon or color alone

#### Scenario: Restore a stored appearance
- **WHEN** the application starts with a valid stored appearance preference
- **THEN** that appearance SHALL be applied before the first meaningful paint and SHALL update the document color scheme and browser theme color

#### Scenario: Invalid or unavailable storage
- **WHEN** the stored value is invalid or preference storage throws or is unavailable
- **THEN** the application SHALL fall back to Dark, remain fully usable, and avoid an uncaught error

#### Scenario: Theme-complete content
- **WHEN** either appearance is active or changes while a workspace is mounted
- **THEN** standard controls, piano and guitar instruments, overlays, modal content, and canvas-based learning visualizations SHALL redraw with readable theme-appropriate contrast

#### Scenario: Theme-appropriate welcome mark
- **WHEN** the welcome or Help / About dialog is visible
- **THEN** Dark SHALL show the existing Harmony Hash mark and Light SHALL show the supplied light Harmony Hash mark from a shipped public asset
- **AND** the runtime light mark SHALL NOT depend on a file under `initial_data/`

#### Scenario: Appearance disclosure
- **WHEN** the privacy policy describes locally stored preferences
- **THEN** it SHALL include the appearance preference and explain that it remains on the user's device

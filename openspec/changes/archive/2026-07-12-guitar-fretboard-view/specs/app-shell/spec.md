## MODIFIED Requirements

### Requirement: Application header
The application SHALL display a branded header with the app name "Harmony Hash", the Tonari Labs identity, and accessible Builder/Fretboard workspace navigation.

#### Scenario: Header content
- **WHEN** the page loads
- **THEN** the header SHALL display "Harmony Hash", Builder and Fretboard workspace controls, and the builder instrument toggle while Builder is active

#### Scenario: Default workspace
- **WHEN** the application loads without a prior in-session workspace selection
- **THEN** Builder SHALL be the active workspace

#### Scenario: Keyboard workspace selection
- **WHEN** a workspace control receives keyboard focus
- **THEN** it SHALL expose visible focus and activate with standard button keyboard behavior

### Requirement: Page structure
The application SHALL present either the progression Builder or the Fretboard explorer below the shared header according to the active workspace. The Builder SHALL retain its Input Area → Compact Action Toolbar → Chord Cards ordering, with optional expanded companion content shown only after explicit user action.

#### Scenario: Input area placement
- **WHEN** the Builder workspace loads
- **THEN** the active progression input controls SHALL appear below the header and above the action toolbar

#### Scenario: Compact action toolbar
- **WHEN** the Builder is idle or has rendered chords
- **THEN** applicable Randomize, Play/Stop, and Harmony Companion controls SHALL occupy one responsive toolbar without a card-sized idle gap

#### Scenario: Output area
- **WHEN** a progression is submitted
- **THEN** chord cards SHALL render in a dedicated output area immediately after the compact action toolbar

#### Scenario: Companion expansion
- **WHEN** the user explicitly expands Harmony Companion
- **THEN** its full session content MAY occupy additional space while preserving the surrounding progression state

#### Scenario: Builder structure
- **WHEN** Builder is active
- **THEN** the progression input controls SHALL appear below the header and above the chord-card output area

#### Scenario: Fretboard structure
- **WHEN** Fretboard is active
- **THEN** the independent explorer controls and horizontal instrument board SHALL replace the visible builder workspace below the header

#### Scenario: Builder state preservation
- **WHEN** the user creates a progression, visits Fretboard, and returns to Builder
- **THEN** the same progression, builder instrument, chord variants, locks, and compatible display state SHALL remain available

#### Scenario: Active companion continuity
- **WHEN** the user changes workspaces while the Harmony Companion provider is mounted
- **THEN** the provider SHALL remain mounted instead of ending the session as a navigation side effect
- **AND** a reachable companion panel SHALL remain available in either workspace

## MODIFIED Requirements

### Requirement: Fast per-card modifier interaction
Every rendered chord card SHALL provide a compact `Modify` trigger that opens an accessible modal dialog. The dialog SHALL present ranked `Top picks` with contextual fit evidence when available and a searchable full same-root alternative set without changing the card until the user selects an option.

#### Scenario: Pointer quick change
- **WHEN** a user opens the modifier dialog on a `C` card and selects `Cmaj7`
- **THEN** that card SHALL immediately display and render `Cmaj7` and the dialog SHALL close

#### Scenario: Top picks naming and scoring
- **WHEN** ranked quick alternatives are shown
- **THEN** the section SHALL be labeled `Top picks`
- **AND** each supported integer percentage SHALL use the established match-score gradient rather than its chord-family color

#### Scenario: Chord-family option names
- **WHEN** any alternative chord name is displayed
- **THEN** the chord name SHALL use the shared Major, Minor, Dominant, Suspended, Diminished, or Augmented family presentation while its match percentage remains an independent cue

#### Scenario: Contextual evidence
- **WHEN** a quick alternative has a supported key/function score
- **THEN** its integer fit score and at least one concise localized reason SHALL be visible and included in its accessible description

#### Scenario: Unknown-context presentation
- **WHEN** the selected chord has no supported key/mode context
- **THEN** the current generic quick ordering SHALL be used and fit percentages or contextual reasons SHALL NOT be shown

#### Scenario: Search full alternative set
- **WHEN** a user enters text in the modifier search field
- **THEN** the result list SHALL show only same-root catalog alternatives whose labels match the query

#### Scenario: Keyboard open and select
- **WHEN** a keyboard user focuses the modifier trigger, opens the dialog, and activates an option
- **THEN** the same replacement SHALL occur without requiring pointer input

#### Scenario: Escape closes without mutation
- **WHEN** the modifier dialog is open and the user presses Escape
- **THEN** the dialog SHALL close, focus SHALL return to its trigger, and the progression SHALL remain unchanged

#### Scenario: Responsive containment
- **WHEN** the modifier dialog is used at 375px, tablet, or desktop widths
- **THEN** its scores, reasons, controls, and results SHALL remain readable and contained without horizontal document overflow

## ADDED Requirements

### Requirement: First-visit onboarding
The application SHALL show a concise Tonari-styled onboarding dialog on a user's first visit and SHALL defer persistence until the user explicitly dismisses it.

#### Scenario: New visitor
- **WHEN** the application loads without the current versioned dismissal record
- **THEN** onboarding SHALL open and SHALL explain Hasher, Tune Toolbox, Fret Finder, instrument switching, playback, and cross-tool handoff

#### Scenario: Explicit dismissal
- **WHEN** the user activates the close or `Start hashing` action
- **THEN** onboarding SHALL close and the current versioned dismissal record SHALL be stored

#### Scenario: Returning visitor
- **WHEN** the application loads with the current versioned dismissal record
- **THEN** onboarding SHALL remain closed and Hasher SHALL be immediately usable

#### Scenario: Storage unavailable
- **WHEN** reading or writing local storage throws or is unavailable
- **THEN** the application SHALL remain usable, onboarding SHALL be dismissible for the session, and no uncaught error SHALL be logged

### Requirement: Permanent onboarding reopen action
The application header SHALL keep a labeled Help/About action that reopens onboarding regardless of its persisted dismissal state.

#### Scenario: Reopen after dismissal
- **WHEN** a returning user activates the Help/About action
- **THEN** the same onboarding content SHALL open without clearing or corrupting the dismissal record

#### Scenario: Close reopened dialog
- **WHEN** the reopened dialog closes
- **THEN** focus SHALL return to the Help/About trigger

### Requirement: Accessible modal behavior
Onboarding SHALL be a named modal dialog with keyboard focus containment, Escape dismissal, background interaction blocking, focus restoration, and reduced-motion behavior consistent with the existing Tonari modal patterns.

#### Scenario: Initial focus
- **WHEN** onboarding opens
- **THEN** focus SHALL move to an intentional control inside the named dialog and background controls SHALL not be keyboard or pointer interactive

#### Scenario: Focus loop
- **WHEN** a keyboard user tabs forward or backward past the dialog's last or first focusable control
- **THEN** focus SHALL wrap within the dialog

#### Scenario: Escape dismissal
- **WHEN** the user presses Escape
- **THEN** onboarding SHALL close, persist explicit dismissal when appropriate, and restore focus to the triggering control when one exists

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** onboarding SHALL open and close without animated transitions

#### Scenario: Mobile containment
- **WHEN** onboarding renders at 375px width or a short landscape viewport
- **THEN** the dialog SHALL remain within the viewport, its content SHALL scroll internally when necessary, and the document SHALL not overflow horizontally

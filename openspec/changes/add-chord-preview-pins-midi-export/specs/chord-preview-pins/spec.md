## ADDED Requirements

### Requirement: Delayed chord-card hover preview
The chord browser SHALL show an instrument-appropriate chord-card preview near the pointer only after a mouse pointer continuously hovers one dictionary-valid chord cell for at least 1,500 milliseconds. The existing cell activation and composer drag behaviors SHALL remain unchanged.

#### Scenario: Preview appears after threshold
- **WHEN** a mouse pointer remains over `Cmaj7` for 1,500 milliseconds
- **THEN** a `Cmaj7` card preview SHALL appear near the latest pointer position without adding the chord to the composer or timeline

#### Scenario: Early leave cancels preview
- **WHEN** the pointer leaves a chord cell before 1,500 milliseconds elapse
- **THEN** no preview SHALL appear for that hover

#### Scenario: Cell activation still inserts
- **WHEN** the user clicks or keyboard-activates a chord-grid cell
- **THEN** the existing chord insertion behavior SHALL occur exactly once

#### Scenario: Instrument parity
- **WHEN** the active instrument is Guitar or Piano and a hover preview appears
- **THEN** the preview SHALL use the corresponding existing Guitar or Piano card visualization

### Requirement: Preview promotion and pin persistence
Clicking into a transient preview SHALL promote it to an independently managed visual pin. Multiple pins SHALL remain visible across Hasher, Tune Toolbox, and Fret Finder workspace navigation and across Run, agent result, preset, timeline Modify, and randomization actions until explicitly dismissed or the page session ends.

#### Scenario: Click promotes preview
- **WHEN** the user clicks anywhere inside a transient `Dm7` preview
- **THEN** one pinned `Dm7` card SHALL remain after the pointer leaves the original grid cell

#### Scenario: Multiple independent pins
- **WHEN** the user pins `C`, `Am7`, and `G7`
- **THEN** all three pins SHALL remain visible and independently movable and dismissible

#### Scenario: Pins follow workspace navigation
- **WHEN** pins exist and the user moves from Hasher to Tune Toolbox or Fret Finder and back
- **THEN** the same pins and their visual state SHALL remain available

#### Scenario: Timeline mutations do not clear pins
- **WHEN** the user runs or replaces the progression, modifies a timeline chord, or randomizes timeline voices
- **THEN** existing pins SHALL remain unchanged

### Requirement: Visual-only full card controls
Pinned cards SHALL expose the applicable existing chord Modify, Guitar variation/display-mode, and Piano voicing-style controls while omitting the timeline lock control. Pin interactions SHALL mutate only that pin and SHALL NOT add notes to playback, the progression timeline, URL shares, MIDI export, Hanz state, or any audio path.

#### Scenario: Guitar pin controls
- **WHEN** a Guitar chord is pinned
- **THEN** its Modify, Fingering/Intervals/Notes, and available variation controls SHALL remain usable and no lock control SHALL render

#### Scenario: Piano pin controls
- **WHEN** a Piano chord is pinned
- **THEN** its Modify and applicable Piano voicing-style controls SHALL remain usable and no lock control SHALL render

#### Scenario: Pin modification is isolated
- **WHEN** the user changes a pinned chord or its variation/style
- **THEN** only that pin SHALL update and the application timeline SHALL remain unchanged

#### Scenario: Pins remain silent
- **WHEN** the user creates, moves, modifies, or dismisses a pin
- **THEN** the application SHALL NOT create an AudioContext, schedule notes, or start playback for that action

### Requirement: Constrained pin movement and dismissal
Every pin SHALL provide an explicit drag handle and dismiss action. Drag movement SHALL remain within the visible application viewport and SHALL NOT prevent operation of controls inside the card.

#### Scenario: Drag from handle
- **WHEN** the user drags a pin by its handle
- **THEN** the complete pin SHALL move with momentum disabled and remain within the viewport bounds

#### Scenario: Card controls do not drag
- **WHEN** the user activates Modify, a display mode, a variation arrow, or a Piano style
- **THEN** that control SHALL operate without initiating a pin drag

#### Scenario: Dismiss one pin
- **WHEN** the user activates one pin's dismiss action
- **THEN** only that pin SHALL be removed and all other pins SHALL remain

## Purpose

Let musicians identify harmony directly from chosen or played notes and practice over an existing progression without changing that progression.

## ADDED Requirements

### Requirement: Identify selected pitches and the actual bass
DISCOVERY SHALL identify common chord families using selected MIDI pitches independently of chord diagrams and SHALL display chord tones, the lowest note, and plausible exact or slash alternatives. Octave duplicates SHALL not change chord quality. Unrecognized collections SHALL remain usable and explain that no common exact match is available.

#### Scenario: Minor triad becomes minor seventh
- **WHEN** C, Eb and G are selected and then Bb is added above them
- **THEN** the primary name changes from Cmin to Cmin7 and Eb/C is available as an alternative

#### Scenario: Bass changes interpretation
- **WHEN** Bb is played below C, Eb and G
- **THEN** Eb6/Bb is a primary interpretation with Cmin7/Bb and Cmin/Bb offered as alternatives

#### Scenario: Unsupported collection
- **WHEN** the selected pitch classes do not exactly match a supported formula or slash decomposition
- **THEN** DISCOVERY shows the notes without inventing a matching chord

### Requirement: Accessible note entry
DISCOVERY SHALL offer a three-octave piano and standard guitar fretboard with individually operable notes, a clear action, and persistent visible selection. A string SHALL have at most one chosen fret. The instrument SHALL fit a mobile viewport through contained scrolling.

#### Scenario: Toggle and remove notes
- **WHEN** a piano key is clicked twice
- **THEN** it is first selected and then removed, and the chord information updates each time

### Requirement: Live input lifecycle
DISCOVERY SHALL offer opt-in computer keyboard and MIDI input with audible notes and held-note highlighting. Computer input SHALL use Ableton-style white/black key positions and octave controls, ignore editable fields and modified shortcuts, and release notes on blur. MIDI access SHALL require a user action, report unsupported or denied access, handle note-off and zero-velocity note-on, and remove listeners and release notes on disconnect or leaving the workspace.

#### Scenario: Simultaneous held notes
- **WHEN** several computer or MIDI keys are held then released
- **THEN** all held notes glow and sound together, then cease without leaving stuck notes

#### Scenario: MIDI unavailable
- **WHEN** MIDI access is absent or denied
- **THEN** the interface explains the limitation and pointer/computer entry remains usable

### Requirement: Read-only Hasher accompaniment
DISCOVERY SHALL provide looping play/stop and a tempo slider for a supplied Hasher progression. It SHALL preserve the supplied chord notes and order, expose no recording controls, stop on workspace exit, and handle unavailable or changed progressions without stale playback.

#### Scenario: Practice over a built progression
- **WHEN** a Hasher progression is present and the user starts the loop
- **THEN** the progression repeats at the selected tempo while live notes remain independently playable

#### Scenario: No built progression
- **WHEN** Hasher contains no playable progression
- **THEN** DISCOVERY explains how to enable accompaniment and cannot start an empty loop

### Requirement: Compact interval-led chord HUD
DISCOVERY SHALL present the primary chord symbol on one compact non-wrapping line using the shared chord-family color language. Its detail column SHALL use the shared chromatic interval colors to show selected tones, interval degrees and names, bass/inversion information, alternatives, and the available pin action without moving those details outside the HUD.

#### Scenario: Minor chord explanation
- **WHEN** C, Eb, and G identify Cmin
- **THEN** the chord symbol uses the shared minor-family color and the detail column shows C/Eb/G with 1 Root, b3 Minor third, and 5 Perfect fifth in their shared interval colors

#### Scenario: Long chord name
- **WHEN** an extended or omitted-tone chord is identified
- **THEN** its complete symbol remains on one visually compact line at desktop width instead of wrapping into an oversized multi-line heading

### Requirement: Collision-free piano and computer-key labels
DISCOVERY SHALL center each white-key note and octave as one non-wrapping label and SHALL keep note labels and computer shortcuts in separate bounded rows on both white and black keys. The current computer octave and its Z/X shortcut hint SHALL appear directly above the Computer keys action, with Z and X emphasized using the existing pastel-green semantic token.

#### Scenario: Computer labels are enabled
- **WHEN** Computer keys is enabled at octave 2
- **THEN** white keys show centered labels such as C2 and D2, black-key W/E/T/Y/U/O hints remain inside their black keys, and the compact control above the action reads Octave 2 with emphasized Z/X hints

### Requirement: Selectable MIDI input
After user-initiated MIDI permission, DISCOVERY SHALL enumerate connected input ports and receive events from exactly one selected port. If more than one input is connected it SHALL expose a labeled selector, release and close the previous port when selection changes, and recover truthfully when the selected port disconnects.

#### Scenario: Choose between multiple keyboards
- **WHEN** two MIDI inputs are connected and the user selects the second input
- **THEN** notes from the first input are released and ignored, notes from the second input are received, and the selected device name remains visible

#### Scenario: Selected device disconnects
- **WHEN** the selected MIDI input disconnects while another input remains
- **THEN** its held notes are released, its port is closed, and the remaining connected input becomes selected

### Requirement: Pin a discovered chord for later inspection
When the primary discovered symbol resolves through the shared chord dictionary, DISCOVERY SHALL provide a detail-column action that creates a silent visual-only chord-card pin in the existing floating Hasher layer. The pin SHALL use the current Hasher instrument, survive workspace navigation, and SHALL NOT mutate the timeline or start audio. If the symbol cannot be resolved, identification SHALL remain available and the action SHALL be disabled with an honest explanation.

#### Scenario: Pin a supported discovery
- **WHEN** Cmin7 is discovered and the user activates Pin chord card
- **THEN** one full Cmin7 floating card appears for later inspection while the Hasher timeline remains unchanged

### Requirement: Accompaniment follows Hasher Piano octaves
DISCOVERY SHALL consume the exact current Hasher Piano MIDI voicings, including every per-card or whole-progression octave adjustment, when it starts or restarts its read-only loop.

#### Scenario: Shift before looping
- **WHEN** one Hasher Piano chord is raised by one octave and the Discovery loop starts
- **THEN** that loop slot uses the raised MIDI notes while all unshifted slots retain their current voicings

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

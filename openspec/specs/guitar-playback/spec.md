# guitar-playback Specification

## Purpose
Define diagram-accurate, lifecycle-safe guitar progression playback with plucked-string timbre and Piano transport parity.

## Requirements

### Requirement: Diagram-accurate guitar voicings
The system SHALL derive each guitar playback voicing from the currently selected, successfully parsed guitar diagram using standard tuning and the diagram's string, fret, open-string, and mute information.

#### Scenario: Open-position chord
- **WHEN** the selected diagram contains open and fretted strings
- **THEN** playback SHALL schedule the absolute MIDI pitch represented by every sounding string in physical low-to-high string order

#### Scenario: Muted strings
- **WHEN** a diagram marks a string muted
- **THEN** that string SHALL contribute no playback note

#### Scenario: Selected variant
- **WHEN** the user changes a guitar card from one valid diagram variant to another
- **THEN** subsequent playback SHALL use the new variant's exact sounding pitches rather than a pitch-class-only approximation

#### Scenario: Duplicate pitch classes
- **WHEN** two strings in the selected shape play the same pitch class in different octaves or unisons
- **THEN** both physical string voices SHALL remain in the playback voicing

#### Scenario: Invalid diagram data
- **WHEN** a selected guitar diagram cannot produce a finite in-range MIDI voicing
- **THEN** playback SHALL fail visibly and SHALL NOT schedule a success-shaped empty or guessed chord

### Requirement: Distinct plucked-string synthesis
The audio engine SHALL provide a guitar timbre that is audibly and parametrically distinct from the existing piano timbre by using a short attack, decaying plucked envelope, bounded string staggering, and deterministic resource cleanup.

#### Scenario: Guitar envelope
- **WHEN** a guitar playback event is scheduled
- **THEN** each string voice SHALL use the guitar pluck envelope and SHALL decay before an equivalent piano voice would sustain

#### Scenario: Strummed onset
- **WHEN** a multi-string guitar chord is scheduled
- **THEN** its string onsets SHALL be staggered by a bounded deterministic interval without moving the event outside its chord duration

#### Scenario: Piano timbre unchanged
- **WHEN** the instrument is Piano
- **THEN** the existing piano oscillator and sustained envelope behavior SHALL remain selected

#### Scenario: Stop cleanup
- **WHEN** guitar playback is stopped, replaced, unmounted, or reaches its end
- **THEN** all scheduled guitar audio nodes and UI callbacks SHALL be stopped or disconnected and the active-card indicator SHALL clear

### Requirement: Guitar progression transport parity
Every progression transport entry point available to Piano SHALL also accept Guitar when at least one playable chord exists, using the same ordered timeline, BPM, lifecycle, and active-card cursor with the guitar voicings and timbre.

#### Scenario: Guitar transport visible
- **WHEN** Guitar is selected and one or more playable chord cards are rendered
- **THEN** the progression action rail SHALL expose the same Play progression control as Piano

#### Scenario: Guitar playback order
- **WHEN** the user starts a four-chord guitar progression
- **THEN** the selected diagram voicings SHALL sound in timeline order and each corresponding card SHALL become active exactly once

#### Scenario: Instrument changes during playback
- **WHEN** the user changes instrument while playback is starting or active
- **THEN** the prior playback generation SHALL stop, its cursor SHALL clear, and a later start SHALL use the newly selected instrument

#### Scenario: Timeline changes during playback
- **WHEN** a chord is inserted, moved, removed, replaced, or randomized while guitar playback is active
- **THEN** the current playback SHALL stop and SHALL NOT continue with stale voicings or indexes

### Requirement: Voice companion guitar playback
The voice companion's existing `play_progression` client tool SHALL use the active instrument and SHALL support Guitar and Piano without changing the nine-tool surface or weakening its truthful lifecycle statuses.

#### Scenario: Voice starts guitar playback
- **WHEN** Guitar is active, playable chords exist, playback is idle, and the agent calls `play_progression`
- **THEN** guitar playback SHALL start once and the tool SHALL return `started`

#### Scenario: Empty guitar timeline
- **WHEN** Guitar is active with no timeline chords and the agent calls `play_progression`
- **THEN** playback SHALL NOT start and the tool SHALL return `empty`

#### Scenario: Existing lifecycle statuses
- **WHEN** guitar playback is already starting/running, is cancelled while starting, or cannot create/resume/schedule audio
- **THEN** the tool SHALL return `already_playing`, `cancelled`, or `unavailable` respectively under the same conditions as Piano

#### Scenario: Provisioned source parity
- **WHEN** the guitar-capable voice source is released
- **THEN** `toolSchemas.ts`, the browser handler, bridge types, system prompt, and verified live agent SHALL agree that `play_progression` supports the active instrument

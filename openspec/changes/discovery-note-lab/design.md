## Context

The app already provides semantic workspace controls, fretboard tuning definitions, MIDI-to-frequency conversion, and scheduled progression audio. ScalePianoKeyboard is display-only. The shell owns Hasher chord generation and one-shot playback. See proposal.md for scope.

## Goals / Non-Goals

**Goals:** Keep chord identification pure and deterministic, preserve bass register, isolate audio/input ownership, and expose a small shell integration contract.

**Non-Goals:** Dictionary lookups, recording, timeline mutation, backend changes, and guided-tour changes.

## Decisions

- Match pitch-class sets against explicit common chord formulas. Rank exact formulas by root-in-bass, family familiarity, and inversion. If an actual bass can be separated from an upper triad, include that slash spelling. This supports Cmin7/Eb6 ambiguity without allowing arbitrary partial matches to claim missing tones. No key is inferred from one chord.
- Interpret the user's EbMaj6 example as Eb6, the conventional major-sixth symbol. Keep the full Cmin7/Bb spelling alongside Cmin/Bb, whose separate bass supplies the seventh.
- Use three octaves of button-based piano keys and a standard-tuning fretboard sourced from existing tuning definitions. Each surface retains its own pointer selection, since arbitrary piano voicings cannot always map to one physical fret per string. Live pitches are shared and the piano follows their register; a complete note strip also covers wide voicings beyond the viewport.
- Separate latched pointer selections from live held notes keyed by source/device/channel/note. Live release never erases clicked notes or a note still held by another input source.
- Use actual Ableton US key positions: A S D F G H J K L are white notes, W E T Y U O are black notes, Z/X shift octave. The Ableton 12 manual documents the center/upper rows and octave controls: https://www.ableton.com/en/manual/routing-and-i-o/#playing-midi-with-the-computer-keyboard .
- Request Web MIDI only from Connect MIDI, without SysEx. Handle hotplug, sustain, all-notes-off, and note-on velocity zero; release all notes and listeners on hide/unmount. API contract: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API .
- The shell supplies `playbackRequest`, `progressionLabels`, `active`, and `onBeforeLoopStart`. A separate loop controller owns its context and scheduling; there are no Hasher editing callbacks. Playback requests are snapshotted. Tempo changes restart the loop cleanly.
- Reuse React effect cleanup for subscriptions and Web Audio resource disposal, including Strict Mode remounts; follow React Context7 guidance for event-listener setup/cleanup.

## Risks / Trade-offs

- [Chord names are ambiguous] → Show up to three alternative exact/slash readings and bass information; do not assert a key or hide unsupported note collections.
- [Browser MIDI support varies] → Capability/permission feedback and pointer/computer alternatives; automated MIDI test doubles cover parsing and disconnect behavior but cannot prove hardware compatibility.
- [Accidental keyboard interception] → Explicit enable switch, editable-target/modifier guards, and lifecycle cleanup.
- [Multiple audio surfaces] → Stop Hasher playback before starting accompaniment and stop Discovery audio on exit; separate live-note/loop contexts prevent live release from cutting the loop.
- [Three octaves on mobile] → Contained horizontal scroll with visible octave labels and a compact control layout.

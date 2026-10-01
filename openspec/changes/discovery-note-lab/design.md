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
- Reuse the shipped chord-family and chromatic-interval presentation helpers for the Discovery HUD. Keep the chord symbol on one compact line; place notes, interval names, bass/inversion, alternatives, and the pin action in the right-hand detail column. White piano keys render one non-wrapping note-plus-octave label, while computer shortcuts occupy a separate bounded label row so black-key shortcuts cannot visually spill onto white keys.
- Keep the computer octave control directly above its enable button. The Z/X legend is a semantic hint using the existing pastel major-family token, not a new color. The full Ableton mapping remains visible on the keys themselves.
- Treat MIDI permission and MIDI selection as separate steps. After the user grants access, enumerate connected inputs, retain a valid selected id across state changes, attach `midimessage` only to that selected port, and clear/close it before switching or disconnecting. Show the selector only when more than one input is available. This follows the Context7/MDN `MIDIAccess.inputs`, `statechange`, and `MIDIPort.close()` lifecycle.
- Store Piano octave offsets by stable timeline item id. Apply a pure whole-octave transform after voice-leading/style selection, bound each card to two octaves below or above its computed register, and move that card's three-octave visual window with the transformed notes. Whole-progression controls advance every offset atomically or disable at a boundary. The transformed `pianoVoicings` remain the single source for Hasher playback, MIDI export, the voice bridge, and Discovery accompaniment.
- Resolve a discovered symbol through the shared chord dictionary before offering the pin action. A successful action sends a one-shot request to the already-mounted `FloatingChordCards` owner, which creates the same visual-only, silent, cross-workspace pin used by chord-browser previews. Unsupported dictionary spellings keep identification usable and expose an honest disabled state.
- Consolidate PR #112's reviewed dependency bundle on this branch: Wrangler 4.144.0 and its lockfile graph, including `sharp` 0.35.4. After the fresh install, apply only npm's non-breaking transitive lock resolutions for `nanoid` and both `brace-expansion` lines so the combined tree has no known audit findings, then run the normal build and test gates.

## Risks / Trade-offs

- [Chord names are ambiguous] → Show up to three alternative exact/slash readings and bass information; do not assert a key or hide unsupported note collections.
- [Browser MIDI support varies] → Capability/permission feedback and pointer/computer alternatives; automated MIDI test doubles cover parsing and disconnect behavior but cannot prove hardware compatibility.
- [Accidental keyboard interception] → Explicit enable switch, editable-target/modifier guards, and lifecycle cleanup.
- [Multiple audio surfaces] → Stop Hasher playback before starting accompaniment and stop Discovery audio on exit; separate live-note/loop contexts prevent live release from cutting the loop.
- [Three octaves on mobile] → Contained horizontal scroll with visible octave labels and a compact control layout.
- [Octave offsets drift when timeline cards move] → Key offsets by stable timeline item id and prune them with the same transaction survival map used by Guitar MIDI state.
- [A selected MIDI device disappears] → Release its source-owned notes, close the port, select the first remaining connected input, and publish the updated device list.
- [A detector spelling has no card dictionary entry] → Keep the analysis visible and disable only the pin action instead of synthesizing an unverified card.

## Context

The chord grid currently owns its open/closed state and inserts a dictionary-valid chord immediately when a cell is activated. Full Guitar/Piano visualization exists only in timeline `ChordCard` instances, whose variation, Piano style, modifier, lock, playback, and Hanz state are coordinated by `App`. The Share panel currently derives a URL from chord symbols and instrument only. Guitar cards already report the exact MIDI notes of their selected SVG variation to `App`; Piano cards already expose the selected voice-led voicing there.

This change crosses the grid, app root, card shell, Share panel, and Hasher layout. It must preserve the application-owned timeline and keep every preview/pin outside playback, sharing, Hanz, lock, and transaction state. The screenshots establish visual order and placement intent; semantic tokens and existing responsive conventions remain authoritative. Context7 Motion guidance confirms that manual drag controls with `dragListener={false}` preserve child-button interaction while a dedicated handle starts a constrained drag.

## Goals / Non-Goals

**Goals:**

- Let a mouse user inspect a complete instrument-appropriate chord card after 1.5 seconds of continuous cell hover without first adding or running the chord.
- Let users promote previews into multiple independently editable, dismissible, viewport-constrained pins that survive in-app workspace changes and timeline mutations for the current app session.
- Export the active progression's exact selected Guitar variations or Piano voicings as a valid `.mid`, one four-quarter bar per chord, with no Set Tempo event.
- Put the agent-first, direct-composition-second workflow ahead of presets and keep harmony context compact beside Browse Chords.

**Non-Goals:**

- Persisting pins across page reloads or separate browser windows.
- Adding pinned chords to the timeline, share URL, MIDI export, playback, Hanz, or saved data.
- Adding audio audition to chord previews or pins.
- Changing chord lookup, modifier ranking, Guitar/Piano rendering, playback scheduling, URL sharing, provider APIs, or Worker routes.
- Introducing a MIDI library or any other runtime dependency.

## Decisions

### 1. The grid reports hover intent; the app root owns only the transient request

`ChordReferenceGrid` will retain its existing click and drag-to-composer behavior, add a 1,500 ms mouse-only hover timer, and report the resolved chord name plus latest client pointer position. Leaving before the threshold cancels the timer. Leaving after display schedules a short dismissal grace period so the pointer can enter the adjacent card.

`App` will hold the current transient preview request because it connects the builder-only grid to a root-level floating layer. The floating layer remains mounted across `builder`, `theory`, and `fretboard`, so its internal pinned-card state is not destroyed by workspace navigation. Keeping pins in the timeline or a global store was rejected because pins are explicitly visual-only and must not participate in application transactions.

### 2. Pins are independent card snapshots that reuse `ChordCard`

Promoting a preview creates a pin with a stable id, dictionary chord, display name, instrument at pin time, Guitar variation, Piano style, and initial viewport position. Each pin computes its own Piano voicing and routes Modify/variation/style changes only to its local model. `ChordCard` gains an opt-out for the lock action; its normal default remains unchanged. Playback and Guitar playback-report callbacks are omitted.

A transient preview is a visual card with a click-to-pin interaction. Its first click promotes the card rather than also invoking an internal modifier or variation control; the newly pinned card then exposes all controls normally. This avoids one gesture unexpectedly doing two state changes while satisfying the requirement that clicking into the appeared card pins it.

Pins render inside a fixed, pointer-transparent root layer. Each pin restores pointer events on itself and uses a dedicated drag handle with Motion manual drag controls, disabled momentum, and constraints bound to the viewport layer. Dragging the entire card was rejected because it conflicts with Modify, display-mode, variation, and Piano-style controls.

### 3. MIDI export consumes the same selected-note arrays as playback

`App` will pass the Share panel an ordered MIDI-note array per timeline chord: current `pianoVoicings` for Piano or validated current-variant `guitarMidiVoicings` for Guitar. The pure encoder validates every non-empty note list, de-duplicates simultaneous notes, and writes a Standard MIDI File Type 0 with 480 pulses per quarter note.

The track begins with a 4/4 Time Signature meta event, contains simultaneous Note On events followed by Note Off events 1,920 ticks later for each chord, and ends with End of Track. It deliberately emits no `FF 51` Set Tempo meta event. Time signature is retained because “one bar” needs a meter; a consuming DAW can assign tempo freely. Pins are excluded because the arrays come only from the application timeline.

The Share panel downloads a Blob through a temporary object URL and revokes it after activation. Guitar export is disabled with truthful status until every selected diagram has reported a matching voicing; encoder/download errors surface in the panel instead of producing an empty or malformed file.

### 4. The Hasher layout becomes agent-first and browser-contextual

`ProgressionInput` will render Describe, the localized separator, Build Your Own, then the persistent chord-browser toolbar. The Key/Mode controls and instrument selector move into that toolbar, matching their preset/suggestion scope. A second separator and preset section render only while the browser is collapsed. Expanding the browser hides both preset heading and surface; collapsing restores the same selection and dialog state.

Dedicated inline-context classes will size Key and Mode by content on wide screens and stack them without overflow on narrow screens. Existing tokens, control minimum heights, localization, and preset dialog behavior remain unchanged.

### 5. Verification follows each independently shippable slice

Pure tests will cover MIDI bytes, note validation, bar timing, and absence of a tempo event. Component/static tests will cover lock omission and the new Share control contract. Browser tests will cover the 1.5-second threshold, preview promotion, independent pin modification/variation, drag constraints, survival across workspace and Run/Modify actions, visual-only/no-audio behavior, preset visibility, control order, and MIDI download metadata. Each OpenSpec task will be checked and committed only after its focused tests plus build/lint gates pass.

## Risks / Trade-offs

- **[Risk] The preview vanishes while the pointer crosses the gap from cell to card.** → Use a short cancellable leave grace period and place the preview beside, not under, the pointer.
- **[Risk] Drag gestures steal clicks from card controls.** → Start drag only from a dedicated handle with manual controls and disabled automatic drag listening.
- **[Risk] A pin falls outside the visible viewport after resize, keyboard display, pinch zoom, or a later drag.** → Re-clamp each live pin from its rendered bounds against visual-viewport width, height, and offsets on resize/scroll and drag end, with a layout-viewport fallback and retained drag constraints; responsive tests cover layout and offset visual bounds.
- **[Risk] A card is larger than a pinch-zoomed visual viewport or a new pin fully covers an existing pin.** → Feed live visual width/height into token-based card sizing and cascade each new pin through bounded candidate positions until an existing toolbar strip remains reachable.
- **[Risk] Hidden Hasher state emits a delayed preview or motion ignores user preference.** → Cancel pending grid intent whenever Hasher becomes inactive and suppress the preview's initial transform/transition under reduced motion.
- **[Risk] Guitar MIDI export races diagram parsing after variation changes.** → Validate source-path identity as playback already does and disable export until every chord reports the current variation.
- **[Risk] “No tempo set” is misread as zero tempo.** → Omit Set Tempo entirely; document and test the absence of `FF 51` while retaining 4/4 meter and PPQ timing.
- **[Risk] Existing active OpenSpec work describes the prior preset-first order.** → This follow-up adds an explicit agent-first requirement and will be reconciled during the normal spec-sync/archive boundary.

## Migration Plan

1. Land and validate this change's artifacts on the feature branch.
2. Add the floating-card layer and delayed grid events without changing timeline handlers.
3. Add the pure MIDI encoder and Share-panel download path using existing selected-note state.
4. Reorder and responsively style `ProgressionInput` controls.
5. Run unit, build, lint, strict OpenSpec, and focused browser verification before handoff.

Rollback is a normal revert of the feature commits. No persisted schema, backend API, secret, or deployment migration is involved.

## Open Questions

None. “Other tabs” is implemented as the app's Hasher, Tune Toolbox, and Fret Finder workspaces shown in the supplied UI; cross-window or reload persistence is outside this visual-only request.

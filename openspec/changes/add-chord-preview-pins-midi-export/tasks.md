## 1. Chord Preview Intent

- [x] 1.1 Add the 1,500 ms mouse-hover intent contract and open-state reporting to `ChordReferenceGrid`, with focused timing and regression coverage for insertion behavior.

## 2. Floating Visual Pins

- [ ] 2.1 Add the root-mounted floating preview/pin layer, reuse full Guitar/Piano cards without locks or audio callbacks, and cover promotion, isolated controls, drag handles, dismissal, and workspace/timeline persistence.

## 3. MIDI Export

- [ ] 3.1 Implement and unit-test a strict dependency-free Standard MIDI File encoder with one 4/4 bar per chord, selected note arrays, and no Set Tempo event.
- [ ] 3.2 Add the MIDI download section beneath the existing Share link, wire current Guitar/Piano voicings from `App`, and cover ready, loading, error, and download behavior without changing URL sharing.

## 4. Hasher Control Hierarchy

- [ ] 4.1 Reorder the unified Hasher flow, colocate compact Key/Mode and instrument controls with Browse Chords, hide presets while the browser is open, and verify responsive/localized behavior.

## 5. Integrated Validation

- [ ] 5.1 Run focused browser scenarios plus full build, lint, unit, and strict OpenSpec gates; inspect the final desktop/mobile layout and update the long-horizon handoff evidence.

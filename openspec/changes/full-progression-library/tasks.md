## 1. Types & Data Layer

- [x] 1.1 Add new types to `src/lib/types.ts`: `Progression`, `Subgroup`, `TonalityGroup` (with id, label, scaleType, subgroups)
- [x] 1.2 Create `src/data/progressions.ts` with full `PROGRESSION_LIBRARY` array encoding all 65+ progressions from `docs/hh-library.md` across 4 tonality groups with correct subgroup structure and scaleType assignments
- [x] 1.3 Remove old `PRESET_PROGRESSIONS` array from `src/lib/harmonyBrain.ts` and its associated `PresetProgression` type

## 2. Transposition Integration

- [x] 2.1 Update `transposeProgression` in `harmonyBrain.ts` to accept a numeral string (split on ` – `) in addition to the existing string array, or add a helper that splits and delegates
- [x] 2.2 Ensure scaleType resolution works with the new data shape: group default → subgroup override → passed to transposition

## 3. Progression Browser UI

- [x] 3.1 Replace the category-grouped button layout in `ProgressionInput.tsx` with a Tonality selector (4 options: Major, Minor, Modal, Advanced) using the same styling pattern as the Key selector
- [x] 3.2 Render subgroups for the active tonality: all-caps label per subgroup using `--text-muted` color, small font
- [x] 3.3 Render pill buttons per progression under each subgroup with `numerals` as label and `name` as `title` tooltip
- [x] 3.4 Wire up button click to call transposition with the correct scaleType (subgroup override or group default) and selected key
- [x] 3.5 Maintain gold accent highlight on selected button (`--interactive-accent-bg/text/border`) and deselect on tonality switch

## 4. Verification

- [ ] 4.1 Run `npm run build` — confirm zero type errors
- [ ] 4.2 Manual verification: select each tonality, verify subgroups and progressions render correctly, click progressions in different keys and verify chord cards update
- [ ] 4.3 Verify Free Input tab is completely unchanged

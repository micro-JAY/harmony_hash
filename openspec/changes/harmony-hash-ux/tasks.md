## 1. Stage 1 - Minor Blend Help Button and Modal

- [x] 1.1 Run pre-stage checks (`npm run build` and `npx vitest run`).
- [x] 1.2 Add minor-only `?` help trigger and modal open/close state in `src/components/ProgressionInput.tsx`.
- [x] 1.3 Create `src/components/MinorBlendModal.tsx` with static JSX content, Framer Motion transition, outside-click close, close button, and Escape handling.
- [x] 1.4 Integrate modal via `AnimatePresence`, validate minor-only visibility/dismissal behavior, run post-stage checks, and commit `feat: minor tonality help button with blend guide modal`.

## 2. Stage 2 - Piano Fingering vs Notes Display Toggle

- [x] 2.1 Run pre-stage checks (`npm run build` and `npx vitest run`).
- [x] 2.2 Add per-card piano display mode state and compact `Notes` / `Fingering` toggle in `src/components/ChordCard.tsx` (piano mode only).
- [x] 2.3 Update `src/components/PianoKeyboard.tsx` and related types (if needed) to support `displayMode`, note labels in notes mode, fingering labels in fingering mode, and root-key accent styling in fingering mode.
- [x] 2.4 Validate piano-mode toggle behavior and unchanged guitar behavior, run post-stage checks, and commit `feat: piano fingering vs note names display toggle`.

## 3. Final Verification

- [ ] 3.1 Run final `npm run build` and `npx vitest run` with both stages applied.
- [ ] 3.2 Confirm modal and piano toggle acceptance criteria from this change request.
- [ ] 3.3 Mark all OpenSpec tasks complete or explicitly blocked with reason.

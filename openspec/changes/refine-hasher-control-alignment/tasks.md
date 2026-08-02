## 1. HASHER Control Geometry

- [x] 1.1 Create one shared desktop sizing contract for the Progression Agent and direct composer entry rows.
- [x] 1.2 Align Browse Chords and the instrument selector on the composer companion rail, including rounded selected-state clipping.

## 2. Header Locale Control

- [x] 2.1 Replace the two-button locale switcher with one accessible square EN/JP toggle.
- [x] 2.2 Align Help/About and the locale toggle at desktop, tablet, and mobile breakpoints.

## 3. Verification

- [x] 3.1 Add focused browser coverage for entry-row, companion-rail, and locale-toggle geometry and behavior.
- [x] 3.2 Pass lint, build, unit/e2e, strict OpenSpec, and desktop/mobile rendered QA.

## 4. Review Follow-up And Neural Preview

- [x] 4.1 Remove the locale toggle's misleading pressed state, preserve the instrument focus ring, and replace duplicated control geometry with named tokens.
- [x] 4.2 Add a localized Note Neural Network `EARLY PREVIEW` badge and replace millisecond-based user guidance with press-and-hold language.
- [ ] 4.3 Pass focused/full validation and rendered desktop/mobile QA, then confirm the updated PR has no new actionable Codex feedback.

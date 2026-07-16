# Acceptance Ledger

This ledger maps the user's current correction request to authoritative evidence. A row is complete only when both implementation and rendered/test evidence are present.

| ID | Required end state | Baseline evidence | Completion evidence |
|---|---|---|---|
| A1 | HASHER / TUNE TOOLBOX / FRET FINDER navigation is geometrically centered. | Browser geometry at 1440×900 measured the navigation center 91px left of viewport center; `Header.tsx` uses a flex row whose center depends on unequal brand/utility widths. | Pending corrected desktop/tablet/mobile geometry assertions and inspected screenshots. |
| A2 | Four centered preset buttons open Major, Minor, Modal, and Advanced dialogs. | Browser DOM/screenshot and `ProgressionInput.tsx` show category buttons followed by an active subgroup tab strip and one horizontally clipped progression list, not dialogs. | Pending dialog DOM and screenshot evidence. |
| A3 | Every documented preset is visible: Major 23, Minor 21, Modal 13, Advanced 5. | `PROGRESSION_LIBRARY` and `docs/hh-library.md` contain 62 entries, but Browser exposed only the active 10 Major Foundation buttons; screenshots 1–4 show the intended complete category inventories. | Pending source/document/dialog parity tests and all-key resolution. |
| A4 | Focused/selected chips expose `X`; dragging to the outside removal target removes; persistent handles/arrows/`+` remain absent. | Browser measured zero composer removal buttons after loading C–F–G; `ProgressionTimelineComposer.tsx` supports Delete/Backspace and reorder but no selected removal affordance or drag-out target. | Pending pointer/keyboard/cancelled-drag evidence. |
| A5 | Major green, Minor orange, Dominant deep red, Suspended yellow, Diminished pink, Augmented white across grid headers, cards, and modifier names. | Screenshot 6 and screenshot 7 show inconsistent family mapping; current family classification/tokens need exhaustive audit. | Pending classifier/token/contrast/rendered evidence. |
| A6 | Root rows stay blue and percentage scores keep the match gradient. | Current grid owns separate root and match layers; correction must not collapse them into family colors. | Pending layer-separation assertions. |
| A7 | Guitar `Fingering / Intervals / Notes` is centered independently of `Modify`; Piano has no label selector. | Screenshot 7 and `ChordCard.tsx` use `justify-between`, centering the toggle only in leftover space. | Pending card-center geometry at desktop/mobile. |
| A8 | Modifier is a modal named `Top picks`; chord names use family colors and percentages use match colors. | PR #75 already uses `AccessibleDialog`, but color and percentage semantics require verification. | Pending dialog, focus, score-color, and non-color evidence. |
| A9 | Piano style selectors show only applicable choices and do not create uneven empty/wrapped space. | `ChordCard.tsx` filters styles, but screenshot 8 and Browser geometry show the current card contract relies on clipped fixed keyboards and lacks explicit equal-height/style-inventory coverage. | Pending style-inventory and equal-card-bound assertions. |
| A10 | Every active Piano key is visible inside a full-width, fixed-size card keyboard. | Browser measured each primary Piano keyboard at 630px inside a 457px desktop card and marked all three clipped; the same fixed 630px strip remains clipped at 820px and 375px. | Pending proportional-geometry tests and active-key/card bounding boxes. |
| A11 | Piano voicing comparison remains a contained accessible popup with only applicable options. | PR #75 already moved comparison into `AccessibleDialog`; regression proof is incomplete. | Pending pointer/keyboard/mobile/focus-restoration evidence. |
| A12 | English/Japanese, reduced motion, lock/variant/style state, playback, Hanz focus, and stale-agent safety remain intact. | These are existing cross-cutting contracts. | Pending full unit/Playwright/Browser/independent-review gates. |

## Baseline Reference Images

- Major catalogue: user image 1 (`CleanShot 2026-07-16 at 16.02.55.png`)
- Minor catalogue: user image 2 (`CleanShot 2026-07-16 at 16.11.25.png`)
- Modal catalogue: user image 3 (`CleanShot 2026-07-16 at 16.11.30.png`)
- Advanced catalogue: user image 4 (`CleanShot 2026-07-16 at 16.11.39.png`)
- HASHER layout/navigation: user image 5 (`CleanShot 2026-07-16 at 16.01.38.png`)
- Chord-grid family headers: user image 6 (`CleanShot 2026-07-16 at 16.17.01.png`)
- Guitar cards/control alignment: user image 7 (`CleanShot 2026-07-16 at 16.17.49.png`)
- Piano cards/voicing geometry: user image 8 (`CleanShot 2026-07-16 at 16.19.12.png`)

## Measured PR #75 Baseline

- Desktop 1440×900: navigation center delta `-91px`; visible Major progression buttons `10`; composer removal buttons `0`; Guitar cards `457×361px`; Piano cards `457×387px`; Piano keyboards `630px` and clipped.
- Tablet 820×1000: navigation wraps near center; visible Major progression buttons `10`; Piano keyboards remain `630px` and clipped; no document-level overflow.
- Mobile 375×812: navigation wraps near center; visible Major progression buttons `10`; Piano keyboards remain `630px` and clipped; no document-level overflow because the card hides the excess.
- Page identity: `HARMONY HASH — TONARI LABS`; no framework overlay. The expected Vite-only service-unavailable state is present because `npm run dev` does not serve Worker API routes.

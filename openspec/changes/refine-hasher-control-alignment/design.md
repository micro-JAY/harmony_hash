## Context

The HASHER builder uses two adjacent entry rows: Progression Agent uses a flexible prompt plus a fixed desktop Run action, while the direct composer uses a similar layout through separate CSS. Its companion controls were previously split between the browser toolbar and a two-button locale switcher in the header. The supplied desktop captures expose small but visible differences in width, vertical alignment, and rounded active-state clipping.

## Goals / Non-Goals

**Goals:**

- Give the two entry rows one shared desktop action-column width and matching control height/alignment.
- Keep the Browse Chords and Guitar/Piano selector on a visually balanced shared rail.
- Make instrument selection preserve its rounded outer boundary.
- Replace the dual locale selector with one accessible square EN/JP state toggle that matches the onboarding close control's dimensions.
- Keep Help / About and the locale control aligned as one header utility pair across responsive breakpoints.
- Make Note Neural Network's early status visible without disabling it, and explain its pointer controls without exposing millisecond timing.

**Non-Goals:**

- Changing how chords are parsed, generated, inserted, voiced, played, or localized.
- Introducing a component library, new dependencies, a different picker behavior, or a HASHER workflow change.
- Altering Note Neural Network mechanics or any other TUNE TOOLBOX/FRET FINDER control.

## Decisions

- Define named entry-height and action-width tokens and consume them from both the agent and composer rows. This avoids duplicated arbitrary geometry and keeps future visual adjustments synchronized.
- Keep the existing 44px semantic control size (`--control-min-height`) as the single square dimension for locale and onboarding-close parity; use a compact rounded-square container rather than a two-segment pill.
- Render one action-labeled locale button whose visible label is the destination locale (`JP` while English is active; `EN` while Japanese is active). Omit `aria-pressed` because the accessible name already describes the next action, not a stable toggle option.
- Use the existing selector outer radius and clip its child backgrounds with `overflow: hidden`; retain a neutral child border and an inset focus-visible outline so selected and focused states remain complete inside that boundary.
- Reuse Tonari's restrained early-status pill treatment with the existing info/soft semantic palette. Keep the badge outside the disclosure button so it does not change the button's accessible name or activation area.
- Describe pinning as pressing and holding a node. The implementation threshold remains testable technical behavior, but it does not belong in user-facing guidance.

## Risks / Trade-offs

- [A desktop-only width change could disturb small layouts] → retain the current stacked mobile layout and verify 375px, tablet, and desktop widths.
- [A one-button locale control could make its action ambiguous] → label it explicitly as switching to the visible destination locale in both supported languages.
- [Shared CSS could unintentionally affect other controls] → scope the new geometry to HASHER class names and add focused browser assertions for both rows.
- [A right-aligned badge could crowd the disclosure at narrow widths] → keep the header wrapping, the disclosure flexible, and the pill non-shrinking; verify desktop and mobile containment.

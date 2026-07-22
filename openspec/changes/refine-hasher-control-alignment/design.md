## Context

The HASHER builder uses two adjacent entry rows: Progression Agent uses a flexible prompt plus a fixed desktop Run action, while the direct composer uses a similar layout through separate CSS. Its companion controls were previously split between the browser toolbar and a two-button locale switcher in the header. The supplied desktop captures expose small but visible differences in width, vertical alignment, and rounded active-state clipping.

## Goals / Non-Goals

**Goals:**

- Give the two entry rows one shared desktop action-column width and matching control height/alignment.
- Keep the Browse Chords and Guitar/Piano selector on a visually balanced shared rail.
- Make instrument selection preserve its rounded outer boundary.
- Replace the dual locale selector with one accessible square EN/JP state toggle that matches the onboarding close control's dimensions.
- Keep Help / About and the locale control aligned as one header utility pair across responsive breakpoints.

**Non-Goals:**

- Changing how chords are parsed, generated, inserted, voiced, played, or localized.
- Introducing a component library, new dependencies, tokens, a different picker behavior, or a HASHER workflow change.
- Altering TUNE TOOLBOX or FRET FINDER controls.

## Decisions

- Define the shared desktop entry-row geometry in HASHER CSS and consume it from both the agent and composer rows. This avoids duplicated arbitrary widths and keeps future visual adjustments synchronized.
- Keep the existing 44px semantic control size (`--control-min-height`) as the single square dimension for locale and onboarding-close parity; use a compact rounded-square container rather than a two-segment pill.
- Render one locale button whose label is the destination locale (`JP` while English is active; `EN` while Japanese is active), with `aria-pressed` describing the active language and an accessible label naming the switch action. This preserves one-click language switching without the clipped active child surface.
- Use the existing selector outer radius and clip its child backgrounds with `overflow: hidden`; retain a neutral child border so the selected instrument never renders a square outline inside the rounded parent.

## Risks / Trade-offs

- [A desktop-only width change could disturb small layouts] → retain the current stacked mobile layout and verify 375px, tablet, and desktop widths.
- [A one-button locale control could make its current state ambiguous] → expose the active state with `aria-pressed` and label the action as switching to the visible destination locale.
- [Shared CSS could unintentionally affect other controls] → scope the new geometry to HASHER class names and add focused browser assertions for both rows.

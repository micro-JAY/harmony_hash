## Context

HASHER currently renders a twelve-degree legend beside the global instrument toggle, while guitar chord SVGs are fetched, sanitized, parsed, and enhanced with DOM overlays after load. Piano notes are native React elements. The composer Run button lives in `ProgressionInput`, but the selector is presently passed through as leading content for the chord-browser toolbar. The change must keep the existing interval colors, display modes, playback voicings, and responsive card geometry intact.

## Goals / Non-Goals

**Goals:**

- Put the displayed note, degree, and full harmonic-role name on each highlighted guitar position and piano key.
- Make the same information available on pointer hover and keyboard focus.
- Keep one lightweight tooltip visible at a time without increasing diagram/card dimensions.
- Place an icon-only, accessible instrument selector below Run using existing design tokens and Lucide icons already shipped by the app.

**Non-Goals:**

- Changing chord spellings, voicing calculation, guitar fingering data, note colors, playback, or the guitar Fingering/Intervals/Notes modes.
- Adding a new tooltip dependency or changing TUNE TOOLBOX/FRET FINDER controls.
- Persisting tooltip state or showing tooltips for inactive piano keys and non-played guitar marks.

## Decisions

- Centralize the twelve degree/name records in a small presentation helper. Guitar and piano use the same label source so `b3` always resolves to `Minor third`, and the removed legend no longer owns theory vocabulary.
- Use one reusable HTML tooltip component positioned from pointer/focus coordinates. Guitar's injected SVG markers receive `data-note-tooltip`, `tabindex`, and accessible labels, then event delegation on the containing React element drives the tooltip. This avoids embedding unreadably small text or mounting React inside fetched SVG.
- Native piano keys expose the same data and accessibility contract directly. Pointer entry and focus position the shared tooltip over the active key; pointer leave and blur dismiss it.
- Preserve all marker coloring and display-mode labels. Tooltip metadata is additive to open-string, circle, and per-string barre markers, so every played position remains independently inspectable.
- Move the existing `outputTools` slot into a composer action column below Run rather than introducing instrument state into `ProgressionInput`. `App` continues to own the global instrument state and passes the selector as composition content.
- Use Lucide `Guitar` and `Keyboard` icons with visually hidden/native accessible button names. Selected and unselected treatments continue to use the existing primary and muted semantic tokens.

## Risks / Trade-offs

- [Injected SVG focus behavior differs across browsers] → add explicit `tabindex="0"`, `role="img"`, and delegated `focusin`/`focusout` handling, then cover Chromium behavior in Playwright.
- [Tooltip clips near a card edge] → position within a relatively positioned diagram/keyboard container and clamp its horizontal coordinate to the container bounds.
- [Dense barre markers overlap] → show only one tooltip at a time and anchor it above the actual per-string marker.
- [Icon-only selector becomes ambiguous] → retain translated `aria-label` and `title` values while removing only visible text.
- [Mobile has no hover] → keyboard focus remains supported and pointer events allow the same tooltip to appear from touch-capable pointer interaction without making it required to understand chord output.

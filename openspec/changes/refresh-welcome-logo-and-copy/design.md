## Context

The onboarding modal is a reusable, accessible portal whose current left visual column uses the existing logo as a contained image. Browser icon links point at separately sized PNG derivatives. The supplied 1000px PNG is the canonical replacement, and the existing modal must retain focus containment, persistence, reduced-motion behavior, and its fully functional guided-tour launch.

## Goals / Non-Goals

**Goals:**

- Use one canonical logo source for the welcome visual, favicon, and Apple touch icon.
- Let the welcome visual's artwork cover the complete left panel on desktop while preserving readable copy and an internally scrolling mobile modal.
- Update the requested visible labels and destination symbols with semantic, accessible text unchanged.
- Validate the welcome/help and guided-tour flow at desktop and mobile widths.

**Non-Goals:**

- No changes to the guided-tour steps, persistence/versioning, workspace navigation, HASHER, TUNE TOOLBOX, FRET FINDER, voice, playback, or theory behavior.
- No new dependency, remote asset, browser API, or design-system color token.

## Decisions

- Treat the supplied PNG as the sole source asset, copy it into the tracked public logo location, and generate fixed PNG derivatives for the existing icon URLs. This preserves cacheable static URLs and avoids runtime image processing.
- Make the visual column a background-covered surface and keep the semantic `<img>` present but visually fitted within that surface. This preserves the dialog's presentational image semantics and avoids background-image-only accessibility ambiguity.
- Keep all wordmark/copy strings in the existing localization layer. The final tagline is an explicit user-approved value before any commit; all other approved copy changes can be validated beforehand.
- Replace only decorative destination marks with Lucide icons, keeping the existing section headings and descriptions as the accessible labels. This provides visual meaning without widening the modal's spoken content.

## Risks / Trade-offs

- **[Risk]** A full-bleed square image can crowd a short or narrow modal. **→ Mitigation:** preserve the current internal scroll region and add responsive sizing tests at desktop and 375px widths.
- **[Risk]** Changing the action label accidentally breaks the tour trigger. **→ Mitigation:** test the renamed button through the same flow to the first guided-tour step.
- **[Risk]** Browser icons retain an old cache. **→ Mitigation:** replace the current stable filenames and validate their decoded dimensions in source and their existing document links in the browser.
- **[Risk]** A copy refresh creates unexpected translation fallbacks. **→ Mitigation:** add every approved string to English/Japanese translations and assert each locale's rendered control identity.

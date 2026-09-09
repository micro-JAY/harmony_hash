## Context

`index.html` still points Open Graph and Twitter/X crawlers at a legacy image hosted on `tonari.ai`, while the refreshed welcome uses the square `public/hh_logo.png` artwork in a split black-and-gold presentation. The onboarding copy keys are selected in `App.tsx` and translated through the existing exact-string localization map.

## Goals / Non-Goals

**Goals:**

- Make shared links visibly match the current welcome identity without relying on a second host.
- Keep the preview deterministic, legible at small unfurl sizes, and verifiable from repository tests.
- Add meaningful welcome-copy variety without changing selection timing or localization architecture.

**Non-Goals:**

- No crawler-specific server rendering, dynamic per-progression cards, metadata service, or new image-processing runtime.
- No changes to the modal layout, onboarding persistence, or guided-tour behavior.
- No dependency upgrades as part of the presentation change; Dependabot findings are assessed separately.

## Decisions

- Compose a fixed 1200×630 PNG from the canonical shipped logo, local Zalando Sans font, and the welcome panel's black, warm-white, and gold visual language. A deterministic composition preserves the exact logo and typography; generative artwork was rejected because social cards require stable brand marks and reliably rendered text.
- Publish the image at a versioned first-party path and use the absolute production URL in both Open Graph and Twitter/X tags. The version suffix provides cache invalidation for social crawlers while the production origin removes the legacy cross-site dependency.
- Use the landing tagline as the document, Open Graph, and Twitter/X description, and add explicit image-alt metadata. One shared sentence avoids divergent copy across crawlers and accessibility surfaces.
- Keep copy keys as literal English source strings in the existing localization map. This matches current conventions and makes missing Japanese entries visible to translation tests.
- Add five new lines to the three-line pool. Eight choices provide noticeable variety while keeping review and localization bounded.

## Risks / Trade-offs

- **[Risk]** Social networks can retain the old cached card after deployment. **→ Mitigation:** use a new versioned filename and verify the absolute production URL in source.
- **[Risk]** A 1200×630 PNG can become unnecessarily large. **→ Mitigation:** render from the existing raster logo at target size and optimize the final PNG without changing dimensions.
- **[Risk]** Randomized UI makes individual lines hard to cover through a single browser run. **→ Mitigation:** test the complete configured key set and translation coverage directly, then keep one browser assertion that accepts every approved line.

## Context

Harmony Hash currently exposes the requested building blocks across five top-level workspaces and two Hasher input modes, but related state and actions live at different ownership levels. `App.tsx` owns the committed progression, instrument, playback cursor, voice focus, and the Note Neural Network handoff. `ProgressionInput.tsx` separately owns Free Input/Progressions UI state, composer draft state, key/mode context, and a shared Hasher mood selection. Circle of Fifths, Scale Synthesia, and Note Neural Network each own overlapping theory context, so navigating between them remounts tools and loses useful state. Piano playback is computed centrally, while guitar cards have no equivalent absolute-pitch playback representation or timbre.

The design must preserve several existing contracts while changing the information architecture:

- The chord dictionary and `IndexedChord` timeline remain the rendering and validation source of truth for manual input, the progression agent, sharing, and Hanz client tools.
- Progression state continues to live in React with the voice companion reading through the established ref-mirror bridge. The change must not introduce a second store or merge voice focus with playback focus.
- Tonari semantic tokens in `public/tokens.css` remain the only color, surface, typography, motion, and sizing source. Gold denotes active/action/playback state; academy blue denotes learning relationships and Hanz focus.
- All controls remain keyboard reachable, have a 44px minimum target, preserve reduced-motion behavior, and work at 375px through wide desktop layouts.
- Existing progression share links remain version-compatible. Reordering changes local state only and must not mutate an already-issued URL.
- The Worker route surface, secrets, provider choice, and production bindings do not change.
- The accepted visual direction is recorded in `docs/design/hasher-learning-suite/hasher-desktop-concept.png` and `docs/design/hasher-learning-suite/theory-desktop-concept.png`. These are layout and hierarchy references; rendered implementation still follows the repository tokens and component conventions.

The primary stakeholders are musicians building progressions on desktop or mobile, keyboard-only and assistive-technology users, guitar and piano users who expect transport parity, and maintainers of the shared browser/Worker chord model and ElevenLabs client-tool contract.

## Goals / Non-Goals

**Goals:**

- Make both Hasher modes share one clear hierarchy: mode tabs, visible Browse Chords, key/mode context, prompt generation, a compact “or”, then direct entry or chord selection.
- Remove mood from Hasher without retaining hidden mood filtering, while keeping a required, explicit `Any`-defaulted mood context in the Theory workspace.
- Preserve one coherent progression timeline while allowing pointer drag/drop, insertion at any boundary, and equivalent keyboard reordering.
- Give guitar every progression playback entry point currently offered to piano, with a recognizably plucked timbre and truthful voice-tool results.
- Keep progression actions, card density, and voicing comparison usable as a performance surface across responsive widths.
- Unify Circle of Fifths, Scale Synthesia, and Note Neural Network under one shared theory context with collapsible, state-preserving tools and explicit cross-tool handoffs.
- Rank quick chord changes with deterministic, explainable key and harmonic-function evidence while retaining the current generic ordering when context is unknown.
- Add accessible, versioned first-visit onboarding and remove only the screenshot-marked Fretboard tuning badge.
- Prove each acceptance item with focused unit/component coverage and real-browser desktop/mobile evidence before release.

**Non-Goals:**

- Detect a key automatically from arbitrary chord input or claim that Hanz computed a key, Roman numerals, compatible scales, or suggestions that the application does not actually calculate.
- Expand the progression preset engine's bounded `ScaleType` union to every Scale Synthesia formula. Unsupported theory selections may transfer root/mode display context and a validated chord suggestion without masquerading as a preset scale type.
- Replace the ref-mirror voice bridge with Zustand, Redux, or another global store.
- Add sampled instruments, audio files, a third-party synthesis dependency, MIDI input/output, recording, or offline audio rendering.
- Make the graph the only way to browse theory relationships; an equivalent semantic list/detail path remains required.
- Change public Worker APIs, the share-link codec version, provider credentials, pricing, footer/licensing, or unrelated piano-voicing algorithms.
- Reproduce the generated concepts pixel-for-pixel when doing so would conflict with responsive behavior, localization, accessibility, or existing Tonari tokens.

## Decisions

### 1. Keep progression ownership in `App.tsx` and add explicit timeline transactions

`App.tsx` remains the single owner of the committed chord array and all parallel per-card state. A pure timeline transaction helper will produce an index mapping for `insert`, `move`, and `remove`, and the App-level callback will apply that mapping atomically to chords, keys, guitar variants, voicing styles, timeline locks, playback cursor, active chord, and Hanz highlight. Composer drafts continue to synchronize through the existing `updateComposerDraft` path.

Pointer drag/drop will use native drag events and visible insertion slots between every chord, including index zero and the end. Each chord chip also exposes keyboard move-before/move-after actions with a live-region announcement. Stable per-timeline item IDs will be created at ingestion and moved with the item; array indexes remain presentation positions, not identity.

This is preferred over letting `ProgressionInput` reorder only its local draft because a local-only move could desynchronize rendered cards and parallel state. A drag library was considered, but the existing interaction is small enough that adding bundle weight and a second accessibility abstraction is not justified.

### 2. Separate Hasher context from Theory context and lift only genuinely shared state

The Hasher keeps a `HasherContext` containing optional preset-compatible `key` and `scaleType`. Its mood field is removed completely, including any filtering side effects. Both Free Input and Progressions render the same controlled key/mode rail above their input surface; mode-specific draft content remains preserved when switching tabs.

A new `TheoryContext` owned by `App.tsx` contains `root`, `scaleId`, `mood` (always defined, default `any`), and selected relationship metadata. Tool-local ephemeral state—Scale practice playback, graph viewport, Circle disclosure detail—remains inside each tool. `TheoryWorkspace` owns disclosure state and mounts tool bodies persistently, hiding collapsed content without discarding state; collapsing Scale Synthesia explicitly stops audio.

This is preferred over one application-wide “musical context” because Hasher supports a narrower preset scale contract and because a global mood value would recreate hidden Hasher filtering. A new external store was considered but rejected: the state graph is small, React ownership is already established, and Hanz depends on the deliberate ref-mirror boundary.

### 3. Replace five top-level learning destinations with three alliterative, durable workspaces

The header will expose `Hasher`, `Tune Toolbox`, and `Fret Finder`. `Tune Toolbox` is the user-facing name for the unified theory workspace; `Fret Finder` is the user-facing name for the fretboard explorer. Circle of Fifths, Scale Synthesia, and Note Neural Network become disclosures within `TheoryWorkspace`; the widely recognized `Circle of Fifths` tool name remains unchanged. Improv Insight remains a reusable controlled panel launched from Hasher and Circle/detail actions rather than a separate destination. Existing deep-link or test identifiers for the old workspaces will be translated to the relevant Tune Toolbox disclosure during the migration so bookmarked in-app routes do not strand users.

Each disclosure header always shows its current context summary and relevant handoff. Only disclosure bodies collapse. On desktop, Circle and graph may use a balanced grid when both are open; on narrow viewports they stack in source order. “Use this in Hasher” maps supported scale formulas to the existing Hasher type, switches to Hasher, and focuses the context rail. For an unsupported formula it transfers the root and a validated suggested chord set/context label without coercing the scale into a false supported type.

This is preferred over tab-within-tab navigation because the user's goal is simultaneous, stateful cross-reference. Keeping all five top-level destinations was rejected because it preserves the current context-loss problem.

### 4. Model theory relationships explicitly and render redundant strength cues

A pure relationship model will emit nodes and edges with stable IDs, relationship kind (`fifth`, `relative`, `parallel`, `modal`, `diatonic-chord`, `secondary-dominant`, or `weak`), strength, direction where meaningful, and a short explanation. Circle and Network consume the same model instead of deriving unrelated visual-only connections.

Strength is conveyed redundantly: semantic color, line width, solid/dashed pattern, labels/legend, and selected-state text. Gold is reserved for the selected/strongest action relationship; academy blue identifies close learning relationships; lower-strength edges use subdued tokenized text/border colors. No meaning depends on hue alone.

This is preferred over an ad hoc score embedded in each SVG because a shared typed model keeps Circle, graph details, Improv handoff, tests, and localization coherent.

### 5. Use a deterministic bounded graph layout with semantic fallback controls

The Note Neural Network will render a stable, seeded force-style topology from the shared relationship model. The selected node occupies protected space but is offset from the exact viewport center when necessary; clustered relatives are placed in concentric semantic bands with collision padding based on measured/wrapped label bounds. Edges terminate at node bounds rather than passing through labels. Labels use opaque tokenized backing/halo, bounded two-line wrapping, and a full accessible name/title.

Pointer users can pan, zoom, reset, and select nodes; keyboard users traverse an adjacent semantic listbox/tree and receive the same detail panel. Reduced motion disables animated settling and uses the deterministic final positions immediately. Mobile uses a bounded viewport plus the list/detail path, not a forced 42rem canvas or page-wide horizontal scroll.

A free-running physics simulation was considered but rejected because layout drift makes labels, screenshots, reduced motion, and keyboard spatial expectations unreliable. A static radial hub was rejected because it recreates the crowded center and does not communicate clusters.

### 6. Generalize playback around timbre-aware voicing requests

The progression playback controller will accept an immutable request containing absolute MIDI voicings plus a `piano` or `guitar` timbre. Piano continues to use the existing voice-led voicings. Guitar voicings will be derived from the selected rendered diagram's string/fret positions using standard tuning and octave-aware MIDI calculation, ensuring playback matches the visible variant. Muted strings are omitted and duplicated pitch classes on distinct strings remain distinct voices.

The audio engine will retain Web Audio primitives but add a short, per-string staggered pluck: rapid attack, exponential decay, short release, and a filtered oscillator/noise transient using existing browser APIs. Piano retains its current sustained envelope. The same guitar timbre contract applies anywhere instrument-aware scale/progression playback is offered.

Transport start/stop, generation cancellation, cursor movement, and Hanz focus remain independent. The Hanz `play_progression` client tool and system prompt will become instrument-capable and return the existing truthful lifecycle results instead of `requires_piano`; the provisioning source must be re-applied and verified before release.

This is preferred over a single pitch-class triad for guitar because audible output must correspond to the chosen fingering. Audio samples or a synthesis dependency were rejected to keep deployment self-contained and avoid licensing/network costs.

### 7. Rank chord modifiers with an explainable scoring pipeline

Quick-change candidates continue to come from dictionary-valid chord types rooted on the selected chord. When Hasher key/mode context is supported, a pure scorer combines:

1. scale-tone coverage,
2. root degree and inferred harmonic function,
3. function-appropriate quality/extension bonuses,
4. voice-leading distance from adjacent committed chords, and
5. a small complexity penalty so an altered extension does not outrank a simpler functional choice without evidence.

The result is a stable 0–100 fit score plus short reason codes suitable for localization. Minor supertonic contexts explicitly include minor/minor-seven and half-diminished choices as theory permits. Dominant-function roots explicitly include major, dominant seventh, suspended, ninth/thirteenth, and altered candidates; function scoring prevents scale-tone coverage alone from unfairly suppressing a valid dominant in minor. Ties use the current generic candidate order for stability.

When key/mode is missing or cannot map to the supported context, the component renders the current generic ordering and omits scores/reasons rather than fabricating confidence. Applying a recommendation still flows through the existing validated modifier replacement callback.

This is preferred over a remote model or heuristic prose because recommendations must be fast, deterministic, testable, and honest about what the app computed.

### 8. Make action placement and card density responsive, not instrument-conditional

Play, Share, Improv Insight, and Hanz remain one progression-level action rail visible in both input modes where the underlying action is valid. Share already operates on the committed timeline and will no longer appear progression-mode-only. Browse Chords moves directly under the mode tabs and uses the secondary action surface instead of the current dark low-contrast disclosure.

Piano card layout will use responsive `minmax()` columns tuned to the keyboard's actual minimum legibility: one column on mobile, two on tablet/small desktop, three on normal desktop, and four only when each card meets its tested minimum width. Guitar keeps its appropriate density. Expanded comparison stays within the owning grid column or spans the grid in a contained row whose maximum width is the progression surface, never the viewport.

This is preferred over scaling keyboards down indiscriminately because a visually dense but unplayable diagram would not meet the performance goal.

### 9. Implement onboarding as an accessible versioned modal

The first successful client render checks a safe, versioned local-storage key such as `hh:onboarding:v1:dismissed`. Missing or inaccessible storage means the splash is shown for the session; storage failures never crash the app. The modal reuses the established Minor Blend focus trap, Escape handling, background inertness, focus restoration, and reduced-motion patterns. Dismissal persists only after an explicit close or “Start hashing” action.

A compact Help/About action in the persistent header reopens the same content without clearing the stored preference. The modal explains Hasher, Tune Toolbox, Fret Finder, instrument switching, playback, and cross-tool handoff in concise localized copy.

A full route and an animated marketing splash were rejected because they delay the actual instrument and complicate back/navigation semantics. The goal is orientation, not an interstitial campaign page.

### 10. Preserve localization and testable semantics through composition

New strings will be added to both locale catalogs with stable semantic keys. Shared controls—context rail, theory disclosure header, relationship legend, timeline insertion slot, action rail—will be components with explicit accessible names and durable `data-testid` only where role/name selectors cannot express the contract. Visual iconography always has text or an accessible label.

Existing tests that encode the obsolete five-tab IA, hidden mood coupling, single append target, piano-only playback, or forced graph overflow will be replaced with acceptance-level assertions for the new contract rather than weakened or skipped.

## Risks / Trade-offs

- **[Parallel timeline state can desynchronize during reorder]** → Centralize all index remapping in one pure transaction, apply it atomically, and test every parallel array plus playback/Hanz cursor behavior for move, insert, remove, and replacement.
- **[Guitar MIDI playback can disagree with the displayed SVG variant]** → Derive absolute notes from the selected parsed string/fret positions, assert standard-tuning fixtures, and browser-test at least one open, barre, muted-string, and duplicate-note shape.
- **[Web Audio pluck quality varies across browsers]** → Use only broadly supported oscillator, gain, and filter nodes; bound voice count and cleanup; test lifecycle and timbre-envelope parameters deterministically while using browser evidence for audible parity.
- **[Changing the Hanz tool contract can make the live provisioned agent stale]** → Keep tool schema, hook, bridge, and system prompt in one milestone; run the provisioning verifier; update the source only after code review and immediately read back the exact tool surface.
- **[A unified Theory workspace can become visually overwhelming]** → Default to one primary disclosure open, retain context summaries/actions on collapsed headers, persist user disclosure choices for the session, and stack predictably on narrow screens.
- **[Mounted collapsed tools can keep expensive graph/audio work alive]** → Pause graph simulation after deterministic layout, stop Scale audio on collapse, and avoid observing or animating hidden panels.
- **[Relationship strength can imply false music-theory precision]** → Use named ordinal strengths and explanations, not a pseudo-scientific percentage; reserve percentages for the explicitly defined modifier fit model.
- **[Modifier fit scores may overstate contextual certainty]** → Show concise contributing reasons, omit scores for unknown/unsupported contexts, cap any individual component, and cover canonical major/minor ii–V examples with hand-authored expectations.
- **[Four-column piano density can harm legibility]** → Gate column count by measured minimum card width and browser screenshot assertions; four columns are an opportunistic wide-screen enhancement, not a forced target.
- **[First-visit modal can destabilize existing browser tests]** → Add a default test fixture that records dismissal, plus dedicated clean-storage, storage-failure, keyboard, focus-restoration, and reopen tests.
- **[Generated concept images can tempt one-off styling]** → Treat them as hierarchy references only; implement exclusively with existing semantic tokens and log any genuinely missing token before extending `public/tokens.css`.
- **[Large coordinated change increases regression surface]** → Deliver focused conventional milestone commits on the feature branch, run focused browser suites after each milestone, then run the full build/lint/Vitest/Playwright/security/review gates before publication.

## Migration Plan

1. Land pure state and theory primitives first: timeline transactions, guitar MIDI derivation/timbre request types, relationship model, and modifier scoring, each behind existing UI behavior with unit tests.
2. Introduce the Hasher context rail, action placement, timeline reorder controls, responsive card grid, and guitar playback. Update Hanz source files in the same playback milestone but do not provision the live agent yet.
3. Add `TheoryWorkspace`, move the three tools under controlled disclosures, separate theory mood from Hasher state, and wire Scale→Hasher and Circle→Improv handoffs. Retain compatibility mapping for the old workspace identifiers during this release.
4. Replace the Network rendering with the deterministic graph and semantic list/detail path. Remove the Fretboard badge and add onboarding.
5. Run focused and full local gates, independent code/security reviews, and exact-head CI. Capture desktop, tablet, mobile, reduced-motion, keyboard, audio, and clean-console evidence in the acceptance checklist.
6. Provision and verify the ElevenLabs source only after the reviewed application head passes locally. If provisioning fails, leave the currently deployed source intact and record a release blocker; do not partially claim guitar voice parity.
7. Squash-merge the reviewed PR into `main`, apply and archive the OpenSpec deltas, reconcile the long-horizon plan/log, and deploy the exact merged SHA through Cloudflare's version flow. Promote traffic only after verifying assets, bindings, health, and a preview smoke test.
8. Verify the custom domain in real desktop and mobile browsers, including both Hasher modes, both instruments, guitar/piano playback, share/import, reorder, modifier ranking, Theory handoffs, graph, onboarding persistence, Hanz coexistence, and console/network health.

Rollback is the previous Cloudflare Worker/static-assets version plus the previous ElevenLabs source definition. The new UI state is client-only and additive; the versioned onboarding key is harmless if old code is restored. No persistent server migration or share-link version migration is required.

## Open Questions

- Browser audio cannot be judged fully by automated waveform assertions. The release evidence will prove scheduling, distinct envelopes, and clean lifecycle automatically, then record a manual audible desktop/mobile check before production promotion.
- Some Scale Synthesia formulas do not map to Hasher's bounded preset `ScaleType`. The implementation will use the explicit supported mapping described above and surface a truthful free-input/context handoff for the remainder; specs must name the supported mapping rather than implying universal preset transposition.
- Four piano cards per row depends on the final minimum readable keyboard width in the rendered implementation. The acceptance threshold is two to three at ordinary desktop widths and four only when the measured card minimum and comparison containment both pass.

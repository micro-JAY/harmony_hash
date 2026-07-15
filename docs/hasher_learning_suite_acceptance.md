# Hasher Learning Suite — Acceptance Ledger

This ledger is the requirement-by-requirement proof record for the `hasher-learning-suite` change. A row is complete only when implementation, automated coverage, and production evidence all prove the original acceptance item.

## Baseline

- Branch: `feat/hasher-learning-suite`
- Before-state revision: `a20c8dba6c53e43c677fa2eecc1d6257e57abfc5`
- Captured: 2026-07-15 06:53 JST
- Production Browser/IAB result: Cloudflare security verification blocked inspection of the live app, so local Chromium Playwright is the authoritative before-state fallback.
- Existing browser inventory: 124 tests across 21 files and 25 committed snapshot PNGs.
- Focused before-state browser gate: 75/75 passed across Hasher layout, cards, modifiers, Circle, Scale, Network, Improv, Fretboard, Compare, Share, Hanz, and both instruments.
- Focused before-state unit gate: 87/87 passed across nine affected audio, playback, modifier, theory, graph, and SSR suites.
- Build baseline: passed as the Playwright web-server prerequisite; the existing optional voice chunk warning remains unchanged.

## Visual Evidence

### User acceptance screenshots

- `CleanShot 2026-07-15 at 05.57.31.png`: Hasher Key/Mode placement and Mood Lens removal target.
- `CleanShot 2026-07-15 at 05.55.55.png`: Scale Synthesia Mood Lens reference.
- `CleanShot 2026-07-15 at 05.51.52.png`: Obsidian graph behavior reference.
- `CleanShot 2026-07-15 at 05.48.13.png`: chord drag/insertion reference.
- `CleanShot 2026-07-15 at 05.50.30.png`: current Network center/label problem.
- `CleanShot 2026-07-15 at 05.40.08.png`: piano density and Compare containment problem.
- `CleanShot 2026-07-15 at 05.46.43.png`: Fretboard badge removal target.

### Accepted concepts

- Hasher: `docs/design/hasher-learning-suite/hasher-desktop-concept.png`
- Unified Theory: `docs/design/hasher-learning-suite/theory-desktop-concept.png`

### Playwright before-state screenshots

- Existing 1280/800/375 workspace snapshots: `e2e/__screenshots__/ui-system.spec.ts/`
- Existing Hasher/Hanz desktop and mobile snapshots: `e2e/__screenshots__/builder-layout.spec.ts/`
- Existing focused Circle, Scale, Network, Improv, Fretboard, and piano snapshots: `e2e/__screenshots__/`
- Additional 1280/800/375 captures for rendered Guitar/Piano Hasher cards, Share, Compare Voicings, Improv Insight, and Hanz: `docs/design/hasher-learning-suite/baseline/`

## Design-System Inventory

The accepted concepts can be implemented without extending `public/tokens.css`.

| Concept role | Existing semantic source |
| --- | --- |
| Near-black page and layered panels | `--surface-base`, `--surface-raised`, `--surface-overlay`, `--surface-sunken` |
| Warm primary and secondary copy | `--text-primary`, `--text-secondary`, `--text-muted` |
| Gold action, selection, and playback | `--text-accent`, `--interactive-accent-*`, `--border-accent`, `--glow-accent` |
| Sky-blue theory relationships and Hanz focus | `--text-academy`, `--interactive-academy-*`, academy palette tokens |
| Structural boundaries | `--border-subtle`, `--border-default`, `--border-strong` |
| Typography | locally hosted `Zalando Sans` and `JetBrains Mono` families |
| Control sizing and focus | existing 44px control floor and `--interactive-focus-ring` |

No raw palette value, new font, purple accent, generic glass surface, or one-off component color is approved for this change.

## Acceptance Matrix

| ID | Original acceptance item | OpenSpec proof | Before-state evidence | Implementation and automated proof | Production proof |
| --- | --- | --- | --- | --- | --- |
| H1 | Key and Mode lead Free Input and Progressions | `progression-input`: Input mode switching; Free Input harmony context | Current controls appear after agent/mood/composer or inside the preset disclosure; baseline Hasher captures | `ProgressionInput.tsx`; `hasher-learning-suite.spec.ts` hierarchy and mode-local context cases; full Playwright 143/143 | Exact-main preview verified Key/Mode before both direct-entry surfaces at desktop and 390×844 mobile widths |
| H2 | Browse Chords is visible, lighter, and directly below subtabs in both modes | `progression-input`: Persistent Free Input chord browser | Current low-contrast control appears only in Free Input after the primary panel | `ProgressionInput.tsx`, `ChordReferenceGrid.tsx`; hierarchy plus logical Tab-order browser cases; inspected desktop/mobile snapshots | Exact-main preview verified the secondary-surface Browse control directly below both subtabs, including after output rendered |
| H3 | Remove Hasher Mood Lens and add compact centered `or` | `progression-input`: Hasher prompt-or-direct hierarchy | Current Mood Lens renders in both modes; no centered separator | `ProgressionInput.tsx`; `mood-filter.spec.ts` 3/3 and hierarchy case prove Hasher mood absence and localized separator | Exact-main preview showed the compact centered `or` and no Hasher mood control in either mode |
| H4 | Parameters use one aligned row or equal responsive columns | `progression-input`: Free Input harmony context / Equal responsive controls | Current key and mode widths are unequal | `.hh-context-grid` in `index.css`; builder/UI-system desktop, tablet, and 375px containment cases | Exact-main preview verified aligned controls on desktop and contained equal columns at 390×844 without document overflow |
| A1 | Improv Insight is available in both modes and instruments | `progression-input`: Shared progression actions | Current Improv is Progressions-only; focused browser suite passes existing behavior | Shared action rail in `App.tsx`; mode/instrument parity and Circle-to-empty-Improv cases in `hasher-learning-suite.spec.ts` | Exact-main preview opened populated Improv Insight from the shared rail; browser coverage proves both modes and instruments |
| A2 | Share Progression is available in Free Input | `progression-input`: Shared progression actions | Already reachable from the builder-wide toolbar; Share captures and 9/9 share tests prove the baseline | Shared action rail in `App.tsx`; all 9 share/import/clipboard/viewport cases pass in full Playwright | Exact-main Free Input produced a valid versioned share URL; import and failure recovery remain covered by all 9 browser cases |
| A3 | Guitar progression playback matches Piano entry points with a plucked timbre | `guitar-playback`; `chord-card-display`: Play / Stop toggle | Current Play is hidden for Guitar and Hanz returns `requires_piano` | `guitarPlayback.ts`, `audioEngine.ts`, `progressionPlayback.ts`, bridge/tool schema/system prompt; unit audio/bridge suites and selected-shape browser case pass | Exact-main preview exposes Play for Guitar and Piano; deterministic Web Audio tests prove guitar sawtooth/pluck/stagger and Piano triangle scheduling. The automation host has no resumable audio device, so audible output is not claimed |
| A4 | Compare Voicings remains within card/progression boundaries | `chord-card-display`: Contained voicing comparison | Existing local rail scroll passes containment checks; user screenshot shows undesirable expansion geometry | `ChordCardFrame.tsx`, `App.tsx`; six comparison pointer/keyboard/desktop/tablet/mobile cases pass | Exact-main preview expanded six Piano shapes inside the owning card; desktop/mobile containment and focus restoration pass |
| A5 | Piano cards fit 2–3 per ordinary row and 4 when safe | `chord-card-display`: Responsive piano performance grid | Current 440px card minimum prevents 3/4 cards; baseline Piano captures | responsive card grid in `App.tsx`; measured 2/3/4-column threshold case plus 800px builder density case pass | Exact-main preview showed the denser Piano layout; measured 2/3/4-column thresholds and mobile one-column containment pass |
| A6 | Chords support pointer drag/drop insertion/reorder and keyboard equivalents | `progression-input`: Accessible timeline reordering and insertion | Current grid drop only appends; composer chips only remove | `ProgressionTimelineComposer.tsx`, `timelineTransactions.ts`, `ProgressionInput.tsx`; unit transactions plus exact-boundary native DataTransfer and keyboard/live-region cases pass | Exact-main preview exposed every insertion boundary plus Move before/after controls; native drag and keyboard/live-region flows pass |
| T1 | Hasher, Tune Toolbox, and Fret Finder form the three alliterative top-level tabs; Circle, Scale, and Network share the collapsible Tune Toolbox context while Circle of Fifths keeps its familiar name | `app-shell`; `theory-workspace`: Unified workspace / Shared context | Current Header exposes five destinations and remounts each tool | `Header.tsx`, `TheoryWorkspace.tsx`, `App.tsx`; navigation, Japanese, UI-system, and Toolbox state cases pass | Exact-main preview verified the three alliterative top tabs and the familiar Circle of Fifths name inside Tune Toolbox |
| T2 | Scale Synthesia can `Use this in Hasher` truthfully | `theory-workspace`: Scale-to-Hasher handoff | No Scale-to-Hasher path; Hasher supports a narrower seven-mode type | `theoryContext.ts`, `ScaleSynthesia.tsx`, `TheoryWorkspace.tsx`; supported and unsupported handoff cases pass | Exact-main preview transferred C Major to Hasher and focused its context; supported and fallback mappings pass |
| T3 | Theory Mood remains visible and defaults to Any | `theory-workspace`: Shared explicit theory context | Scale shows an optional local mood control; Hasher and Scale currently share nullable state | required shared Mood select in `TheoryWorkspace.tsx`; Scale Any/out-of-lens and Theory mood-separation cases pass | Exact-main Tune Toolbox showed shared Root/Scale/Mood controls with Mood visibly defaulted to Any |
| T4 | Circle links directly to Improv Insight | `theory-workspace`: Circle-to-Improv handoff | Circle currently only sends I–IV–V to Hasher | `CircleOfFifths.tsx`, `TheoryWorkspace.tsx`, `App.tsx`, `ImprovInsight.tsx`; empty-timeline context/focus-restoration case passes | Exact-main Circle showed Open Improv Insight in both disclosure summary and details; context/focus restoration passes |
| T5 | Circle/Network show strong, weak, relative, key, and chord relationships with redundant cues | `theory-workspace`: Shared relationship model and strength communication | Current Circle arcs and Network spokes have no typed strength model or legend | `theoryRelationships.ts` and tests; Circle/Network legends, line styles, text/detail, and semantic-node browser cases pass | Exact-main Circle and Network rendered strong/medium/weak legends plus textual relationship types and strengths |
| N1 | Network becomes a readable Obsidian-like graph | `theory-workspace`: Legible interactive Note Neural Network | Current fixed hub/spoke center overlaps labels and forces a 42rem mobile canvas | `noteNetworkLayout.ts`, `NoteNeuralNetwork.tsx`; deterministic layout tests and pan/zoom/reset/long-label/375px browser cases pass; snapshot inspected | Exact-main preview expanded the stable graph with bounded pan/zoom/reset, readable long labels, semantic node list, detail panel, and strength legend |
| M1 | Quick Changes rank key/function-aware variants with fit and honest fallback | `quick-chord-modifiers`: contextual ranking/scoring | Current ranking is a static chord-family table with no context or score | `modifierScoring.ts`, `ChordModifier.tsx`; hand-authored theory tests and ii–V–I browser ranking case pass | Exact-main C-major ii–V–I preview ranked Dm6 at 97%, Dm9/Dm11 at 95%, with predominant-function and scale-tone explanations |
| F1 | Remove only the marked Fretboard badge | `guitar-fretboard`: First-class explorer controls | `fretboard-tuning-readout` duplicates tuning information in the header | badge removed in `FretboardExplorer.tsx`; tuning combobox, board data attributes, accessible pitches, and absent-badge cases pass | Exact-main Fret Finder loaded full desktop and compact mobile maps with tuning control/semantics and no duplicate badge |
| O1 | First-visit Tonari onboarding persists dismissal and always reopens | `splash-onboarding` | No onboarding or reopen action exists | `onboardingPersistence.ts`, `OnboardingModal.tsx`, `Header.tsx`; unit tests and first/return/storage-failure/mobile/reopen/focus cases pass | Exact-main first-visit dialog explained all three workspaces and Start hashing; persisted return and Help/About reopen paths pass |
| Q1 | Preserve localization, accessibility, responsive behavior, voice and progression continuity | All capability specs and migration design | Focused baseline gates are green at 1280/800/375 | build/typecheck and lint pass; Vitest 41 files/1,212 tests; Playwright 143/143; Worker dry-run and OpenSpec strict validation pass; visual baselines inspected; no skip/only/fixme added | Exact-main preview passed desktop and 390×844 interaction sweeps with no overflow or console log; health, voice signed-URL, and one bounded progression request returned 200 |
| R1 | Review, squash-merge to remote main, deploy exact revision, and verify live | OpenSpec tasks 8–10 | Not applicable before implementation | PR [#72](https://github.com/micro-JAY/harmony_hash/pull/72) squash-merged as `529568c`; exact-head CI, provider readback, and security reviews green | Cloudflare deployment `1f225dc4-28e5-447b-86e8-10e248441e5e` serves Worker version 263 at 100%; exact-main preview version `f614e3b0-c0ac-4e89-b8ec-8ee3d3f791ad` passed UI/API smoke tests. The custom domain is protected by a managed WAF challenge in this automation environment |

## Test Evidence Log

| Phase | Revision | Command scope | Result |
| --- | --- | --- | --- |
| Before | `a20c8db` | 12 focused Playwright files | 75 passed in 1.3m |
| Before | `a20c8db` | 9 focused Vitest files | 87 passed in 417ms |
| Before | `a20c8db` | dedicated screenshot capture at 1280/800/375 | 3 capture flows passed; 18 PNGs recorded |
| After | working tree on `feat/hasher-learning-suite` | production build/typecheck + ESLint | passed; only the inherited large-chunk advisory remains |
| After | working tree on `feat/hasher-learning-suite` | all Vitest suites | 41 files / 1,212 tests passed |
| After | working tree on `feat/hasher-learning-suite` | full Playwright | 143/143 passed in 1.9m |
| After | working tree on `feat/hasher-learning-suite` | affected visual suite with refreshed baselines | 44/44 passed; desktop and 375px renders inspected with `view_image` |
| After | working tree on `feat/hasher-learning-suite` | independent implementation review and re-review | all actionable timeline, SVG recovery, Circle/modal/enharmonic, shared-context, Network semantics/localization/mobile-pan, and visual-stability findings fixed; scoped reruns green |

## Fidelity Ledger

The accepted concepts and final browser screenshots were inspected at desktop and 375px sizes. The implementation preserves the accepted three-destination navigation, mode-tabs/Browse/context hierarchy, Zalando Sans/JetBrains Mono typography, existing gold/academy semantic palettes, measured piano density, bounded Hanz/Improv/Compare panels, clustered graph label backing and edge termination, responsive disclosures, focus restoration, and reduced-motion behavior. The deliberate concept deviation is keeping the familiar `Circle of Fifths` title inside the alliterative `Tune Toolbox`, as requested. Production fidelity remains unproven until the exact merged revision is inspected live.

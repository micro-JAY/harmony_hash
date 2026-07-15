## 1. Baseline and Acceptance Ledger

- [x] 1.1 Record the current branch SHA, existing focused test inventory, and desktop/tablet/mobile Playwright baseline screenshots for Hasher Free Input, Hasher Progressions, both instruments, Circle, Scale, Network, Improv, Fretboard, Compare Voicings, Share, and Hanz
- [x] 1.2 Create `docs/hasher_learning_suite_acceptance.md` mapping every original acceptance bullet to its spec scenario, implementation files, automated tests, before/after screenshots, and eventual production evidence
- [x] 1.3 Confirm the saved Hasher and Theory concepts use only existing Tonari semantic tokens or log and justify any genuinely required token extension before implementation
- [x] 1.4 Run the untouched focused Vitest and Playwright suites once and record any pre-existing failures without weakening or skipping them

## 2. Pure Timeline and Audio Foundations

- [x] 2.1 Add stable timeline-item identity and pure insert/move/remove index-mapping transactions that preserve order and reject invalid boundaries
- [x] 2.2 Add unit tests covering timeline insert, move forward/backward, first/last boundaries, no-op moves, duplicate chord symbols, and index remapping
- [x] 2.3 Integrate timeline transactions with App-owned chords, variants, locks, piano styles, active/playback cursor, Hanz highlight, and agent-generation invalidation
- [x] 2.4 Add integration tests proving all compatible per-card state moves atomically and stale playback/agent state is stopped or remapped safely
- [x] 2.5 Extend parsed guitar diagram data with octave-aware standard-tuning MIDI pitches derived from sounding string/fret positions
- [x] 2.6 Add guitar MIDI fixture tests for open chords, barre chords, muted strings, selected variants, duplicate pitch classes, invalid diagram data, and physical string order
- [x] 2.7 Generalize the audio request and playback controller to accept immutable MIDI voicings plus `piano` or `guitar` timbre without changing piano scheduling
- [x] 2.8 Implement the Web Audio guitar pluck envelope, bounded string staggering, deterministic stop/disconnect behavior, and error propagation
- [x] 2.9 Add audio unit tests proving piano/guitar envelope distinction, strum timing bounds, transport callbacks, cancellation, generation safety, and cleanup

## 3. Pure Theory and Recommendation Foundations

- [x] 3.1 Define the shared Theory context types for root, scale/formula id, required `Any`-defaulted mood, selected relationship, and supported Hasher handoff
- [x] 3.2 Implement and test an explicit Scale Synthesia-to-Hasher mapping for the seven supported Hasher modes plus truthful unsupported-formula fallback data
- [x] 3.3 Implement a deterministic relationship catalog/model with stable node and edge ids, relationship kind, ordinal strength, direction, and localized explanation keys
- [x] 3.4 Add hand-authored relationship tests for fifths, relative major/minor, modal family, diatonic chord/function, secondary dominant, and weak relationships
- [x] 3.5 Implement stable clustered Network layout helpers with protected label bounds, edge-boundary termination, long-label wrapping metadata, zoom bounds, and reduced-motion final positions
- [x] 3.6 Add deterministic layout tests for repeated contexts, center clearance, node collisions, edge endpoints, long labels, viewport bounds, and mobile containment
- [x] 3.7 Implement contextual quick-modifier scoring from scale coverage, root degree/function, quality/extension, adjacent voice leading, and bounded complexity evidence
- [x] 3.8 Add hand-authored modifier tests for major ii–V–I, natural/harmonic-minor ii and V behavior, altered dominants, extensions, flats, slash bass, unknown context, stable ties, dictionary validity, and 0–100 bounds

## 4. Hasher Hierarchy and Timeline Interaction

- [x] 4.1 Separate Free Input and Progressions harmony contexts from Theory mood state and remove every Hasher Mood Lens render/filter path
- [x] 4.2 Recompose both input modes with mode tabs first, a visible light Browse Chords control directly below, equal-column Key/Mode context above the active surface, and a compact centered localized `or`
- [x] 4.3 Preserve Free Input text, Progressions prompt/feedback, preset state, and each mode's context when switching tabs or applying external timeline changes
- [x] 4.4 Make the chord browser usable from both modes while retaining explicit Free Input submission semantics and direct-selection composer insertion semantics
- [x] 4.5 Build visible insertion slots at every composer boundary plus native pointer drag/drop for new and existing chords
- [x] 4.6 Add keyboard Move before/Move after controls, boundary-disabled semantics, focus following, and polite live announcements
- [x] 4.7 Wire App-level atomic timeline transactions into composer insert/reorder without resurrecting stale drafts or late agent results
- [x] 4.8 Move Share Progression and Improv Insight into the shared Hasher action rail for both modes and both instruments
- [x] 4.9 Keep expanded Improv Insight, Hanz, and any auxiliary panel within Hasher workspace bounds and preserve independent playback/Hanz focus states
- [x] 4.10 Add/update Hasher Playwright coverage for hierarchy, hidden-mood absence, mode continuity, browser placement/contrast, equal responsive controls, actions, insertion, pointer reorder, keyboard reorder, live announcements, stale-agent invalidation, and desktop/tablet/375px containment
- [x] 4.11 Commit the verified Hasher hierarchy and timeline slice with a focused conventional commit

## 5. Guitar Playback, Card Density, and Modifiers

- [x] 5.1 Build Piano and Guitar progression voicings from the current committed timeline and selected per-card render state
- [x] 5.2 Expose one Play/Stop progression control for both instruments and preserve truthful pending, active, stop, failure, and cursor behavior
- [x] 5.3 Update Hanz bridge types, client handler, shared tool schema, and system prompt so `play_progression` supports the active instrument while retaining the exact nine-tool surface
- [x] 5.4 Add/update bridge and voice tests for guitar `started`, `empty`, `already_playing`, `cancelled`, and `unavailable` outcomes without claiming app-computed theory facts
- [x] 5.5 Replace fixed piano card sizing with tested responsive minmax columns that fit two or three cards on ordinary desktop and four only above the readable minimum
- [x] 5.6 Contain Compare Voicings inside its card/grid row across desktop, tablet, and mobile and preserve Escape/focus restoration
- [x] 5.7 Pass active Hasher key/mode, selected index, and adjacent timeline context through chord cards into contextual quick-modifier ranking
- [x] 5.8 Render localized modifier fit scores and reasons when supported and retain the existing generic ordering with no score when context is unknown
- [x] 5.9 Add/update Playwright coverage for guitar transport visibility, selected-shape playback scheduling hooks, plucked timbre contract, card highlighting, instrument/timeline cancellation, 2/3/4-column thresholds, comparison containment, and contextual modifier examples in both modes/instruments
- [x] 5.10 Commit the verified playback, density, comparison, and contextual-modifier slice with a focused conventional commit

## 6. Unified Theory Workspace

- [x] 6.1 Replace separate Circle/Scale/Network top-level navigation with the alliterative Hasher/Tune Toolbox/Fret Finder labels while preserving compatibility routing for prior in-session workspace identifiers and keeping Circle of Fifths unchanged inside the toolbox
- [x] 6.2 Add a controlled `TheoryWorkspace` with one shared context rail and three accessible disclosure headers that retain summaries and actions when collapsed
- [x] 6.3 Keep tool state mounted across collapse/expand, stop hidden Scale audio on collapse, pause graph work when hidden, and preserve session state across workspace round trips
- [x] 6.4 Adapt Circle of Fifths to the shared context and relationship model with non-color-only strength cues, relative/key/chord/function detail, and a visible legend
- [x] 6.5 Add Circle-to-Improv handoff with context transfer, no progression/instrument mutation, and keyboard focus restoration
- [x] 6.6 Adapt Scale Synthesia to the shared root/scale/mood context with Mood always visible and defaulted to Any
- [x] 6.7 Add Scale Synthesia `Use this in Hasher` with exact supported-mode transfer and truthful unsupported-formula fallback without transferring mood
- [x] 6.8 Replace Note Neural Network's hub/spoke rendering with the deterministic clustered graph, bounded pan/zoom/reset controls, label backing/wrapping, edge termination, and selected-node detail
- [x] 6.9 Add the equivalent keyboard/screen-reader semantic node list/detail path and deterministic reduced-motion rendering
- [x] 6.10 Add/update Theory Playwright coverage for shared context propagation, Any mood, disclosure persistence, Scale audio stop, Scale-to-Hasher supported/unsupported handoff, Circle-to-Improv, strength legend/cues, graph legibility, long labels, keyboard path, pan/zoom/reset, and desktop/tablet/375px containment
- [x] 6.11 Commit the verified unified Theory workspace and graph slice with a focused conventional commit

## 7. Onboarding, Fretboard Cleanup, and Localization

- [x] 7.1 Implement a versioned, failure-safe onboarding dismissal helper with explicit-dismiss persistence and session-only fallback when storage is unavailable
- [x] 7.2 Build the minimal Tonari onboarding modal by reusing the established focus trap, Escape, inert/background, focus restoration, internal scrolling, and reduced-motion patterns
- [x] 7.3 Add a persistent labeled Help/About header action that reopens onboarding without clearing the saved dismissal
- [x] 7.4 Add complete English and Japanese copy for the Hasher/Tune Toolbox/Fret Finder navigation, Hasher hierarchy, timeline movement, theory context/relationships, modifier reasons, onboarding, and accessibility announcements
- [x] 7.5 Remove only the standalone Fretboard tuning-readout badge while retaining tuning information in the control and board accessibility semantics
- [x] 7.6 Add/update Playwright coverage for first visit, returning visit, explicit dismiss, reopen, storage failure, focus trap/restoration, Escape, short landscape, reduced motion, locale switching, and absent Fretboard badge with retained tuning semantics
- [x] 7.7 Commit the verified onboarding, localization, and Fretboard cleanup slice with a focused conventional commit

## 8. Integrated Browser and Quality Gates

- [x] 8.1 Run formatting if configured, production build/typecheck, lint, all Vitest tests, and focused Hasher/Theory/voice/Fretboard Playwright suites; fix root causes without skips, `.only`, or `fixme`
- [x] 8.2 Run full Playwright at desktop plus representative tablet/mobile projects and verify zero unexpected console errors, page errors, request failures, document overflow, inaccessible controls, or reduced-motion regressions
- [x] 8.3 Inspect the rendered desktop and 375px implementation against both accepted concept images and record a fidelity ledger for hierarchy, typography, token use, density, containment, and responsive deviations
- [x] 8.4 Exercise Free Input and Progressions end-to-end in Piano and Guitar, including generation, direct selection, browse, reorder, modifiers, playback, share/import, Improv, Hanz focus/playback coexistence, and workspace round trips
- [x] 8.5 Update every row of `docs/hasher_learning_suite_acceptance.md` with exact code paths, test names/results, and after screenshots; leave production evidence pending until deployment
- [x] 8.6 Run an independent code review and fix every actionable correctness, accessibility, performance, localization, and regression finding
- [x] 8.7 Run an independent security diff review covering share/import preservation, local storage, drag payloads, audio/provider boundaries, tool schema drift, and absence of secret or signed-URL exposure; fix every actionable finding
- [x] 8.8 Re-run production build, lint, all Vitest, full Playwright, Worker packaging, and the OpenSpec strict validator on the exact reviewed head

## 9. Publication and Provider Synchronization

- [x] 9.1 Reconcile `docs/long_horizon_plan.md` and append a current-minute `docs/long_horizon_log.md` entry with branch, completed slices, test evidence, risks, and next concrete step
- [x] 9.2 Push the feature branch, open a reviewable PR with What/Why/theory references/concept-vs-rendered screenshots/test summary/risks/follow-ups, and verify the remote head matches the reviewed local SHA
- [x] 9.3 Wait for and inspect every exact-head CI check; diagnose and fix any failure on the feature branch and repeat local/review gates for changed scope
- [x] 9.4 Provision the reviewed guitar-capable ElevenLabs source, then perform fail-closed readback verification of signed auth, exact nine client tools, no built-ins/MCP/workflow/unknown capabilities, and unchanged live identity/TTS settings
- [x] 9.5 Squash-merge only after CI and provider verification are green, then verify remote `main` contains the complete acceptance implementation and no unrelated local files

## 10. OpenSpec Closure, Deployment, and Live Verification

- [x] 10.1 Apply all eight delta specs to canonical `openspec/specs`, move the change to the dated archive path, and run strict OpenSpec validation against the archived/canonical state
- [x] 10.2 Reconcile the final long-horizon plan, log, summary, and acceptance ledger with the squash-merged PR number and exact remote-main SHA
- [x] 10.3 Run the full build, lint, Vitest, Playwright, and Worker packaging gates from the exact merged `main` revision
- [x] 10.4 Create a Cloudflare version from the exact merged `main` SHA, inspect the version, assets, routes, bindings, compatibility date/flags, and secret names, and smoke-test the preview before traffic promotion
- [x] 10.5 Promote traffic to the verified Cloudflare version without changing routes or secrets and confirm the custom domain serves the exact merged asset revision
- [x] 10.6 Verify production in real desktop and mobile browsers: onboarding, both Hasher modes, Browse/context/or hierarchy, both instruments, guitar/piano playback, share/import, reorder, modifiers, Compare containment, Theory handoffs/graph, Fretboard, Hanz coexistence, API health, console, and network
- [x] 10.7 Fill every production-evidence cell in the acceptance ledger, confirm no release-blocking regression remains, and only then mark the persistent goal complete

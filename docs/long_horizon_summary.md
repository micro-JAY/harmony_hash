# Harmony Hash — Long-Horizon Run Summary

## Final state

The piano-voicing roadmap (v2–v5), its inspiration-led Phase 2 feature wave, and the user-directed agent recovery side track are complete on `main` as of 2026-07-13. The canonical milestone status remains in `docs/long_horizon_plan.md`; dated implementation and review evidence remains in `docs/long_horizon_log.md`.

- Latest merged product baseline: `3cf12466bfb14b6fc462e2ce61bd26e391c6983b`.
- Main CI: [run 29250944395](https://github.com/micro-JAY/harmony_hash/actions/runs/29250944395), green on the latest product baseline.
- Latest product gates: local production build and lint pass, Vitest 1,095/1,095; exact-head CI Playwright 102/102.
- Repository search finds no undocumented `TODO`, `FIXME`, `XXX`, or `HACK` in shipped code.
- User-owned untracked `.agents/` and `AGENTS.md` remain outside the product history. Local inspiration images remain untracked; the intentionally tracked `docs/inspiration/README.md` remains unchanged.

## Phase 0 — Baseline and process

| Milestone | Status | Result | Evidence |
|---|---|---|---|
| Scope and run plan | **Done** | Corrected the roadmap contract, established the milestone ledger, and archived the planning change. | [#14](https://github.com/micro-JAY/harmony_hash/pull/14) |
| Lint baseline | **Done** | Removed the inherited lint failures so every later milestone could use a real green local lint gate. | [#15](https://github.com/micro-JAY/harmony_hash/pull/15) |
| Browser test harness | **Done** | Added Playwright, visual baselines, and a parallel CI browser job before the remaining UI milestones. | [#18](https://github.com/micro-JAY/harmony_hash/pull/18) |

## Phase 1 — Piano voicings v2–v5

| Milestone | Status | Shipped behavior | Evidence |
|---|---|---|---|
| v2 — Voice leading | **Done** | Deterministic inversion and octave selection minimizes movement while preserving the C3–B5 range. | [#16](https://github.com/micro-JAY/harmony_hash/pull/16) |
| v3 — Extended styles | **Done** | Drop 3, rootless, and shell voicings with applicability guards and per-card selection. | [#19](https://github.com/micro-JAY/harmony_hash/pull/19) |
| v4 — Spacing | **Done** | Spread and Two-Hand voicings with range-safe engine candidates and UI selection. | [#20](https://github.com/micro-JAY/harmony_hash/pull/20) |
| v5 — Playback | **Done** | Gesture-created Web Audio playback, pure scheduling, stop control, and active-card highlighting. | [#21](https://github.com/micro-JAY/harmony_hash/pull/21) |
| Piano parity | **Done** | Locking, randomization, note/fingering display controls, and shared timeline semantics. | [#22](https://github.com/micro-JAY/harmony_hash/pull/22) |
| Voicing comparison | **Done** | Context-aware compact previews whose selected result exactly matches the displayed candidate. | [#50](https://github.com/micro-JAY/harmony_hash/pull/50) |

All v2–v5 OpenSpec changes are archived and their deltas are represented in the canonical capability specs. Later work follows the user's 2026-07-12 direction to use normal planning while retaining branch, review, test, and exact-head CI gates.

## Phase 2 — Learning and composition tools

| Milestone | Status | Shipped behavior | Evidence |
|---|---|---|---|
| Harmonic suggestions | **Done** | Off, Key, Next, Jazz, and Modal scoring over the shared theory engine with accessible non-color markers. | [#23](https://github.com/micro-JAY/harmony_hash/pull/23), [#30](https://github.com/micro-JAY/harmony_hash/pull/30), [#47](https://github.com/micro-JAY/harmony_hash/pull/47), [#48](https://github.com/micro-JAY/harmony_hash/pull/48) |
| Improv Insight | **Done** | Compact collapsed progression/per-chord scale analysis with motion, tension, palette, style, and four-stop match colors. | [#37](https://github.com/micro-JAY/harmony_hash/pull/37) |
| Progression library | **Done** | Sixty-two named presets that resolve across all twelve keys and feed the shared timeline. | [#38](https://github.com/micro-JAY/harmony_hash/pull/38) |
| Mood and genre lens | **Done** | JSON-driven optional ranking lens shared by Builder, Improv Insight, and Scale Synthesia. | [#41](https://github.com/micro-JAY/harmony_hash/pull/41) |
| Circle of Fifths | **Done** | Lazy workspace with twelve-key selection, signatures, relative minors, modulation cues, and Builder handoff. | [#42](https://github.com/micro-JAY/harmony_hash/pull/42) |
| Scale Synthesia | **Done** | Degree-correct piano/guitar practice for modes, pentatonics, blues, harmonic/melodic minor families, arpeggios, and playback. | [#43](https://github.com/micro-JAY/harmony_hash/pull/43) |
| Fretboard Explorer | **Done** | Horizontal guitar/bass map through fret 15, tunings, handedness, interval/note views, scale families, patterns, and chord overlays. | [#31](https://github.com/micro-JAY/harmony_hash/pull/31), [#32](https://github.com/micro-JAY/harmony_hash/pull/32), [#33](https://github.com/micro-JAY/harmony_hash/pull/33) |
| Note Neural Network | **Done** | Relative/parallel modal graph with four mode families, degree-aware formulas, learning guidance, and Scale Synthesia handoff. | [#44](https://github.com/micro-JAY/harmony_hash/pull/44) |
| Quick chord modifiers | **Done** | Ranked same-root extensions and alterations plus full catalog search, shared by guitar and piano cards. | [#35](https://github.com/micro-JAY/harmony_hash/pull/35) |

The Phase 2 surfaces consume shared pure functions under `src/lib/theory/`. The Circle, Scales, Fretboard, and Network workspaces are lazy-loaded. Responsive coverage exercises desktop, tablet, and 375px mobile layouts; interaction coverage includes pointer, keyboard, reduced motion, internal overflow, playback continuity, timeline locks, and stale-agent invalidation.

## Agent and Hasher side track

| Milestone | Status | Result | Evidence |
|---|---|---|---|
| S.1 — Voice Companion | **Done** | ElevenLabs real-time agent, nine client tools, signed authentication, review fixes, and progression bridge. | [#25](https://github.com/micro-JAY/harmony_hash/pull/25), [#26](https://github.com/micro-JAY/harmony_hash/pull/26), [#27](https://github.com/micro-JAY/harmony_hash/pull/27) |
| S.2 — Agent Builder Recovery | **Done** | OpenAI Responses migration, signed voice repair, compact Hasher actions, on-demand Hanz popup, and responsive UI polish. | [#29](https://github.com/micro-JAY/harmony_hash/pull/29), [#34](https://github.com/micro-JAY/harmony_hash/pull/34), [#46](https://github.com/micro-JAY/harmony_hash/pull/46) |
| S.3 — Lazy Voice Runtime | **Done** | Intent-preloaded ElevenLabs chunk, persistent provider state, accessible loading/failure shell, and 45.7% lower initial JavaScript gzip. | [#53](https://github.com/micro-JAY/harmony_hash/pull/53) |
| S.4 — Hanz Chord Focus | **Done** | Independent tokenized voice focus, non-color marker, simultaneous playback treatment, and complete UI/session/provider/timeline teardown clearing. | [#55](https://github.com/micro-JAY/harmony_hash/pull/55) |
| S.5 — Truthful Hanz Playback & Live Provisioning | **Done** | Explicit playback outcomes, generation-safe audio start/cancellation, honest pending UI, fail-closed current-schema provisioning, and independently verified live nine-tool configuration. | [#57](https://github.com/micro-JAY/harmony_hash/pull/57), [#58](https://github.com/micro-JAY/harmony_hash/pull/58)–[#63](https://github.com/micro-JAY/harmony_hash/pull/63) |

The recovery work retained dictionary validation on both Worker and client boundaries. The Builder was renamed Hasher, its prompt and chord composer were compacted into one workspace, preset analysis remains under Progressions, and Hanz Hasher appears only as an on-demand popup from prompt help.

On 2026-07-13 the production app loaded successfully in a real browser and reported the progression API ready. Starting Hanz fetched the signed URL before the ElevenLabs SDK reached the microphone handshake; the session then stopped at the host's system microphone permission with `Permission denied by system`. This proves the deployed Worker/key path progressed past signed-URL acquisition without exposing the URL, while full live-audio validation still requires granting microphone access to the browser host. A direct command-line probe remains intercepted by Cloudflare's 403 challenge before the Worker and is not a provider-health signal.

Later that day, the source-owned provisioning workflow updated the existing Hanz Hasher agent and a separate verify-only readback confirmed signed authentication, an empty hostname allowlist, exactly nine linked client tools, no built-ins or MCP servers, no active workflow graph, and no unknown capability fields. The guard accepts only exact inert provider defaults; nonempty parameter bindings, omissions, constraints, and tool behavior remain fail-closed. No credential or signed URL was read or printed.

## Complete run PR ledger

This ledger covers every pull request from the start of the documented long-horizon run through its final milestone reconciliation. `Done` means merged; `Cancelled` means deliberately closed without merge and superseded by the cited recovery path.

| PR | Status | Contribution |
|---|---|---|
| [#13](https://github.com/micro-JAY/harmony_hash/pull/13) | **Done** | Initial long-horizon documentation baseline. |
| [#14](https://github.com/micro-JAY/harmony_hash/pull/14) | **Done** | Planning artifacts and scope/cadence corrections. |
| [#15](https://github.com/micro-JAY/harmony_hash/pull/15) | **Done** | Lint baseline cleanup and planning archive. |
| [#16](https://github.com/micro-JAY/harmony_hash/pull/16) | **Done** | Piano v2 voice leading. |
| [#17](https://github.com/micro-JAY/harmony_hash/pull/17) | **Done** | v2 OpenSpec archive and canonical spec deltas. |
| [#18](https://github.com/micro-JAY/harmony_hash/pull/18) | **Done** | Playwright harness and first browser gate. |
| [#19](https://github.com/micro-JAY/harmony_hash/pull/19) | **Done** | Piano v3 extended voicings. |
| [#20](https://github.com/micro-JAY/harmony_hash/pull/20) | **Done** | Piano v4 Spread and Two-Hand voicings. |
| [#21](https://github.com/micro-JAY/harmony_hash/pull/21) | **Done** | Piano v5 Web Audio playback. |
| [#22](https://github.com/micro-JAY/harmony_hash/pull/22) | **Done** | Piano view parity. |
| [#23](https://github.com/micro-JAY/harmony_hash/pull/23) | **Done** | Diatonic suggestion overlay. |
| [#24](https://github.com/micro-JAY/harmony_hash/pull/24) | **Done** | Phase 1/early Phase 2 handoff reconciliation. |
| [#25](https://github.com/micro-JAY/harmony_hash/pull/25) | **Done** | Original ElevenLabs Voice Companion. |
| [#26](https://github.com/micro-JAY/harmony_hash/pull/26) | **Done** | Voice Companion review fixes. |
| [#27](https://github.com/micro-JAY/harmony_hash/pull/27) | **Done** | Signed single-mode ElevenLabs authentication. |
| [#28](https://github.com/micro-JAY/harmony_hash/pull/28) | **Cancelled** | Conflicted OpenAI migration attempt, superseded by #29. |
| [#29](https://github.com/micro-JAY/harmony_hash/pull/29) | **Done** | OpenAI agent recovery, signed voice repair, and compact builder actions. |
| [#30](https://github.com/micro-JAY/harmony_hash/pull/30) | **Done** | Free Input harmonic suggestions. |
| [#31](https://github.com/micro-JAY/harmony_hash/pull/31) | **Done** | Guitar/bass Fretboard Explorer. |
| [#32](https://github.com/micro-JAY/harmony_hash/pull/32) | **Done** | Fretboard tunings and handedness. |
| [#33](https://github.com/micro-JAY/harmony_hash/pull/33) | **Done** | Fretboard patterns and chord overlays. |
| [#34](https://github.com/micro-JAY/harmony_hash/pull/34) | **Done** | Agent-recovery OpenSpec archive. |
| [#35](https://github.com/micro-JAY/harmony_hash/pull/35) | **Done** | Quick chord modifiers. |
| [#36](https://github.com/micro-JAY/harmony_hash/pull/36) | **Done** | Completed feature OpenSpec archive sweep. |
| [#37](https://github.com/micro-JAY/harmony_hash/pull/37) | **Done** | Improv Insight and accessible learning colors. |
| [#38](https://github.com/micro-JAY/harmony_hash/pull/38) | **Done** | Progression library audit and coverage. |
| [#39](https://github.com/micro-JAY/harmony_hash/pull/39) | **Done** | Stacked mood and genre lens implementation. |
| [#40](https://github.com/micro-JAY/harmony_hash/pull/40) | **Done** | Flat-key and degree-correct spelling fixes. |
| [#41](https://github.com/micro-JAY/harmony_hash/pull/41) | **Done** | Mood lens recovery onto main. |
| [#42](https://github.com/micro-JAY/harmony_hash/pull/42) | **Done** | Circle of Fifths workspace. |
| [#43](https://github.com/micro-JAY/harmony_hash/pull/43) | **Done** | Scale Synthesia practice workspace. |
| [#44](https://github.com/micro-JAY/harmony_hash/pull/44) | **Done** | Note Neural Network. |
| [#45](https://github.com/micro-JAY/harmony_hash/pull/45) | **Done** | Note Neural Network merge reconciliation. |
| [#46](https://github.com/micro-JAY/harmony_hash/pull/46) | **Done** | Hasher workspace, Hanz popup, compact tools, and fretboard UI polish. |
| [#47](https://github.com/micro-JAY/harmony_hash/pull/47) | **Done** | Jazz-aware chord suggestions. |
| [#48](https://github.com/micro-JAY/harmony_hash/pull/48) | **Done** | Modal root palette. |
| [#49](https://github.com/micro-JAY/harmony_hash/pull/49) | **Done** | Suggestion-overlay milestone reconciliation. |
| [#50](https://github.com/micro-JAY/harmony_hash/pull/50) | **Done** | Side-by-side piano voicing comparison. |
| [#51](https://github.com/micro-JAY/harmony_hash/pull/51) | **Done** | Piano comparison milestone reconciliation. |
| [#52](https://github.com/micro-JAY/harmony_hash/pull/52) | **Done** | Long-horizon summary and final run-ledger closure. |
| [#53](https://github.com/micro-JAY/harmony_hash/pull/53) | **Done** | Intent-preloaded, on-demand ElevenLabs voice runtime. |
| [#54](https://github.com/micro-JAY/harmony_hash/pull/54) | **Done** | Lazy Voice Runtime milestone reconciliation. |
| [#55](https://github.com/micro-JAY/harmony_hash/pull/55) | **Done** | Accessible Hanz chord focus distinct from playback. |
| [#56](https://github.com/micro-JAY/harmony_hash/pull/56) | **Done** | Hanz chord-focus milestone reconciliation. |
| [#57](https://github.com/micro-JAY/harmony_hash/pull/57) | **Done** | Truthful Hanz playback outcomes and generation-safe audio start. |
| [#58](https://github.com/micro-JAY/harmony_hash/pull/58) | **Done** | Disabled ElevenLabs built-in placeholder classification. |
| [#59](https://github.com/micro-JAY/harmony_hash/pull/59) | **Done** | Inert provider workflow-scaffolding classification. |
| [#60](https://github.com/micro-JAY/harmony_hash/pull/60) | **Done** | Current provider schema defaults plus fail-closed capability hardening. |
| [#61](https://github.com/micro-JAY/harmony_hash/pull/61) | **Done** | Safe compatibility with the deprecated legacy tool mirror. |
| [#62](https://github.com/micro-JAY/harmony_hash/pull/62) | **Done** | Toolbox schema annotation normalization. |
| [#63](https://github.com/micro-JAY/harmony_hash/pull/63) | **Done** | Inert nested parameter-metadata normalization. |

## Quality and safety outcomes

- The browser and Worker share the same chord lookup and response validation; provider output cannot introduce dictionary-invalid chords into the timeline.
- Voice callbacks use the intentional ref-mirror bridge, preserving fresh timeline state without a second store.
- Signed voice URLs are minted server-side; provider keys and signed URLs never enter committed files or test output.
- Security remediation is merged; provider errors are sanitized before logging or display.
- Exact-head merge guards and green CI were used for the final feature and ledger closure PRs.
- The known Vite warning now belongs to the deferred 501.17 kB voice-runtime chunk; the initial app JavaScript fell from 292.37 kB to 158.73 kB gzip (45.7%) without changing Hanz session behavior.

## Deliberately deferred

- Upper-structure-triad piano voicings remain a design decision, not an incomplete v4 implementation. A true UST introduces pitches outside the selected chord's dictionary tones, so it needs an explicit user-facing harmonic contract rather than being mislabeled as another rendering of the original chord.
- A complete production voice conversation still needs microphone permission in the host browser. The signed authentication path itself reached the SDK handshake during the final production check.

## Open questions and dispositions

| Question | Disposition |
|---|---|
| Gate every CI run on `npm run lint`? | **Open — approval required.** Local lint is green and was run for every recent feature, but `.github/workflows/ci.yml` still gates only build/test and Playwright. The run contract classifies a CI behavior change as an operator decision, so this was not changed silently. |
| Lazy-load the ElevenLabs voice runtime? | **Resolved.** PR [#53](https://github.com/micro-JAY/harmony_hash/pull/53) moved the provider, panel, and SDK behind intent preload while preserving provider state, focus behavior, failure containment, and signed-URL handling. |
| Distinguish agent highlight from playback highlight? | **Resolved.** PR [#55](https://github.com/micro-JAY/harmony_hash/pull/55) gives Hanz focus an academy-blue tokenized accent plus an `AudioLines` marker and status text, preserves gold playback emphasis when both states overlap, and clears stale focus across popup, workspace, session, provider, and timeline teardown paths. |
| Distinguish `play_progression` started vs already playing? | **Resolved.** PR [#57](https://github.com/micro-JAY/harmony_hash/pull/57) returns `started`, `already_playing`, `requires_piano`, `empty`, `cancelled`, or `unavailable`; the UI also exposes the bounded audio-start phase truthfully. |
| Add a `provision:voice` npm script? | **Deferred.** The documented command remains functional; this is developer experience only. |
| Replace minimum-distance voice leading with Hungarian one-to-one assignment? | **Resolved — retain minimum distance.** No counterexample emerged through the complete voicing and progression suite; the current deterministic metric is covered and changing it without a failing musical case would add complexity without proven benefit. |
| Tighten the cross-platform screenshot tolerance? | **Resolved — retain current tolerance.** Semantic and MIDI assertions are the strong contracts; the shared macOS/Linux visual tolerance held across the full roadmap without masking a confirmed regression. Reopen only with a concrete false negative. |
| Infer a Free Input key from entered chords? | **Resolved — superseded.** Free Input now has explicit independent key and mode selectors plus visible scoring context, avoiding an opaque guessed-key state. |
| Cache Playwright browsers in CI? | **Deferred.** Browser installation adds time but not correctness risk; caching remains an optional CI-cost optimization. |
| Remove the invalid SVG `height="auto"` output? | **Resolved.** The Hasher/fretboard polish work removed it and the rendered browser console is clean. |
| Ship upper-structure-triad voicings? | **Deferred pending product choice.** USTs add pitches outside the selected chord's dictionary tones and require an explicit harmonic-model contract. |
| Finish a production voice conversation? | **External action.** Grant microphone permission to the browser host, then repeat the Hanz session check without exposing the signed URL. |

## Recommended next-session plan

1. If the operator approves a CI policy change, add `npm run lint` to the required build/test job and verify a deliberately failing lint fixture in a temporary branch.
2. Re-run the production Hanz session after microphone permission is granted and record only connection state, never the signed URL or credential.
3. Treat UST as a design proposal only after choosing whether it mutates chord identity or represents an explicitly selected overlay.

No roadmap milestone is Pending or In Progress. Future work starts as a new bounded feature from this baseline.

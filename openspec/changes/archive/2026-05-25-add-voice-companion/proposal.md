# Add Voice Companion

## Why

Harmony Hash already has a *text* progression agent (`ProgressionAgent.tsx` + `worker/index.ts`):
a musician types a prompt and gets a generated progression. The natural next step is a
**voice-native sibling** — a real-time audio companion a musician can talk to. They describe the
feeling they want and the companion builds/edits the progression on the page; they ask why it
works and it explains the theory, in depth or ELI5.

This is built on the ElevenLabs Agents platform. A pre-built integration package supplied the
ElevenLabs wiring, a client-tool layer, and a panel UI — but it was authored against an *idealized*
builder (a "Chords Explorer" with a key selector, a diatonic/jazz toggle, a next-chord suggestion
engine, and a full Progression Analyzer). **The shipped Harmony Hash app is simpler.** This change
reconciles the package against the real app: it trims the tool surface to what the app genuinely
backs and wires the agent to the live builder state honestly — no fabricated analysis.

> Naming note: this is the **voice companion** (real-time audio). It is unrelated to the repo's
> piano "voicing" features. Branch and files are named `voice-companion` to keep them distinct.

## What Changes

- **New `src/voice/` module** (adapted from the package): the `ProgressionBridge` contract
  (`types.ts`), the canonical client-tool schemas (`toolSchemas.ts`), the browser tool-handler hook
  (`useProgressionAgentTools.ts`), the ElevenLabs provider (`VoiceAgentProvider.tsx`), the panel
  (`VoiceAgentPanel.tsx`), the real bridge adapter (`progressionBridge.ts`), and a barrel
  (`index.ts`).
- **Tool surface trimmed 12 → 9.** Drop `get_chord_suggestions`, `set_key`,
  `set_suggestion_mode` — the shipped app has no next-chord engine, no builder-level key state, and
  no diatonic/jazz toggle (confirmed by reading `src/lib/harmonyBrain.ts` and `src/lib/theory/`).
  Keep `get_progression`, `analyze_progression`, `add_chords`, `replace_progression`,
  `remove_chord`, `clear_progression`, `play_progression`, `randomize_progression`,
  `highlight_chord`.
- **`analyze_progression` reshaped to honest output.** The engine cannot detect a key, derive roman
  numerals, or rank compatible scales from a chord set. The analysis returns only what the app
  computes: chord symbols, each chord's tones (`parseNotes`), and the voice-led piano voicing
  (`computeVoiceLedProgression`). The agent may add general theory it knows but must never attribute
  a key/numeral/scale to the app.
- **`randomize_progression` redefined.** In the shipped app `randomizeAll()` reshuffles the
  *variants/voicings* of existing chords; it does not generate chords. The tool description says so;
  the agent generates new progressions by choosing chord names and calling `replace_progression`.
- **New Worker route `POST /api/voice/signed-url`** inside the existing `worker/index.ts`, mirroring
  the `/api/progression` handler (CORS, origin allowlist, error contract). It mints a short-lived
  ElevenLabs signed URL with a server-held key. Backed by a small `src/lib/elevenLabsAuth.ts` helper.
- **Provisioned ElevenLabs agent** (via `scripts/provision-voice-agent.ts`) registering the trimmed
  9-tool set + the edited `agent/system-prompt.md`. Auth enabled → browser connects via the signed
  URL, never a bare agent id in production.
- **Panel mounted in `App.tsx`** beside the existing playback/randomize controls, restyled from the
  package's coral theme to Tonari semantic tokens (inline `style={{}}`, no per-component CSS file).

## Capabilities

### New Capabilities
- **`voice-companion`** — a real-time voice agent that reads and edits the live progression through
  a scoped client-tool surface, backed by a server-minted signed URL.

### Modified Capabilities
- **`app-shell`** — the builder now hosts the voice companion panel and provider. (No spec delta;
  additive mount only.)

## Impact

- **New deps:** `@elevenlabs/react` (runtime) + `tsx` (devDep, provisioning script runner). The
  package's `@elevenlabs/elevenlabs-js` is **not** installed — the Worker route and provisioning
  script use raw `fetch`.
- **Files added:** `src/voice/*` (7 files), `src/lib/elevenLabsAuth.ts`, `agent/system-prompt.md`,
  `scripts/provision-voice-agent.ts`, `.env.example`. **Modified:** `worker/index.ts`,
  `wrangler.jsonc`, `.dev.vars.example`, `src/App.tsx`, `package.json`.
- **State approach — ref-mirror, not a new store (deliberate).** The progression lives in
  `App.tsx` `useState` (`chords: DisplayChord[]`), funnelled through `handleResult`. There is no
  store object to hand to `createProgressionBridge`. The bridge is built once in `App.tsx` over a
  `chordsRef` mirror + stable callbacks so ElevenLabs tool callbacks (which fire outside React's
  render cycle) always read fresh state. Lifting the progression into Zustand is a larger refactor
  of working, tested core code and is **out of scope**; the ref-mirror is the low-blast-radius
  choice.
- **Security:** `ELEVENLABS_API_KEY` is Worker-only (`.dev.vars` locally, `wrangler secret put` in
  prod) — never in client code, a `VITE_` var, `wrangler.jsonc`, or any committed file. Only the
  non-secret agent id is exposed to the browser as `VITE_HH_VOICE_AGENT_ID`.
- **No new analyzer / next-chord engine** is built. If `harmonyBrain.ts` does not compute it, the
  tool does not ship it.
- **Regression surface:** `App.tsx` (playback, randomize, chord cards), `worker/index.ts`
  (`/api/progression`, shared CORS helper). Both must remain unchanged in behavior.

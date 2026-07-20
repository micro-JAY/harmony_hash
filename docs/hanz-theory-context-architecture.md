# Hanz theory context: accurate answers without large prompts

## Decision

Keep the current repair on ElevenLabs' conversational agent and browser client
tools. Do not add an MCP server, hosted vector database, or a second LLM call.
The browser already owns the authoritative timeline, so a local deterministic
tool is both cheaper and more accurate than serializing the same state through
another service.

## Next tool: `get_harmony_context`

Add this as a tenth client tool in a separate OpenSpec change after spoken audio
is stable. The tool should derive compact facts from the existing harmony engine
and explicit HASHER key/mode state. It should accept a requested topic and depth
instead of returning every possible analysis.

Suggested request:

```json
{ "topic": "continuation | improv | function | secondary_dominant", "depth": "simple | medium | deep" }
```

Suggested bounded response:

```json
{
  "timelineHash": "stable cache key",
  "chords": [{ "symbol": "A7", "tones": ["A", "C#", "E", "G"] }],
  "tonalCenter": { "key": "G", "mode": "major", "source": "explicit | inferred" },
  "functions": [{ "symbol": "A7", "label": "V/V", "target": "D" }],
  "voiceLeading": [{ "from": "C#", "to": "D", "motion": "half-step" }],
  "continuations": [{ "chords": ["D7", "G"], "reasonTag": "secondary-resolution" }],
  "cardIds": ["secondary-dominant-target", "guide-tone-resolution"]
}
```

Return no more than three continuation candidates and no prose paragraphs. Mark
inferred tonal centers explicitly. Cache the result by timeline hash, key, mode,
topic, and depth so repeated follow-up questions do not recompute or resend
unchanged facts.

## Teaching cards instead of broad RAG

Store short, reviewed cards in a local tagged JSON module. Each card should have
an id, aliases, prerequisite tags, a simple explanation, a deep explanation,
and one musical example. Retrieve at most three cards by exact tags emitted by
the deterministic analyzer. This covers secondary dominants, modal interchange,
guide tones, chord-scale choices, cadences, and common-tone voice leading with a
few hundred tokens rather than an embedded knowledge base.

Send a contextual update only when the timeline hash or explicit key/mode
changes. Hanz should call the context tool only for theory, continuation, or
improvisation questions; basic playback and mutation turns keep using the
existing tools. The agent then spends its LLM budget explaining verified facts,
not rediscovering them.

## When MCP or vector search becomes worthwhile

Use MCP only when the same harmony-analysis service must serve multiple apps,
desktop clients, or remote agents. Add vector retrieval only when the reviewed
teaching-card collection is too large or semantically varied for deterministic
tags and aliases. Until then, either layer adds latency, authentication work,
failure modes, and token serialization without improving the browser's source
of truth.

## Evaluation gate

Build a fixed question set covering partial progressions, secondary dominants,
borrowed chords, chord-scale choices, and ambiguous tonal centers. Measure fact
accuracy, unsupported claims, response tokens, tool-call count, and first-audio
latency. Ship the context tool only if it improves accuracy without increasing
median model tokens materially.

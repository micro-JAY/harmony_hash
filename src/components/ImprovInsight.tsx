import { useMemo, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import type { IndexedChord } from "../lib/types";
import {
  filterScaleSuggestionsByMood,
  moodDefinitionFor,
  type MoodId,
} from "../lib/theory";
import {
  rankCompatibleScales,
  SCALE_SUGGESTION_CANDIDATE_COUNT,
  type ScaleSuggestion,
} from "../lib/theory/improvInsight";

interface ImprovInsightChord {
  readonly input: string;
  readonly chord: IndexedChord;
}

interface ImprovInsightProps {
  chords: ReadonlyArray<ImprovInsightChord>;
  moodId: MoodId | null;
}

type InsightMode = "progression" | "chord";

const MODES: ReadonlyArray<{ id: InsightMode; label: string }> = Object.freeze([
  { id: "progression", label: "Whole progression" },
  { id: "chord", label: "Per chord" },
]);

const METADATA_LABELS = Object.freeze([
  ["motion", "Motion"],
  ["tension", "Tension"],
  ["palette", "Palette"],
  ["style", "Style"],
] as const);

function insightTabId(mode: InsightMode): string {
  return `improv-insight-tab-${mode}`;
}

function insightPanelId(mode: InsightMode): string {
  return `improv-insight-panel-${mode}`;
}

function ScaleResult({ suggestion, rank }: { suggestion: ScaleSuggestion; rank: number }) {
  const matchColor = `color-mix(in srgb, var(--music-match-low) ${100 - suggestion.match}%, var(--music-match-high) ${suggestion.match}%)`;
  return (
    <article
      className="grid gap-4 rounded-xl p-4 lg:grid-cols-[minmax(12rem,0.9fr)_minmax(15rem,1.2fr)_minmax(18rem,1.6fr)] lg:items-center"
      style={{
        backgroundColor: "var(--surface-overlay)",
        border: "1px solid var(--border-subtle)",
      }}
      data-scale-result={suggestion.label}
      data-scale-type={suggestion.scaleType}
      data-match={suggestion.match}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="readout" aria-hidden="true">{String(rank).padStart(2, "0")}</span>
          <h3
            className="truncate"
            style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)" }}
          >
            {suggestion.label}
          </h3>
        </div>
        {suggestion.alsoKnownAs ? (
          <p className="mt-1 pl-8 text-sm" style={{ color: "var(--text-muted)" }}>
            Also known as {suggestion.alsoKnownAs}
          </p>
        ) : null}
        <p className="mt-2 pl-8 readout" aria-label={`${suggestion.label} notes`}>
          {suggestion.notes.join(" · ")}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="label-caps">Match</span>
          <strong
            style={{
              color: matchColor,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xl)",
            }}
          >
            {suggestion.match}%
          </strong>
        </div>
        <div
          role="meter"
          aria-label={`${suggestion.label} match`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={suggestion.match}
          className="h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--surface-sunken)" }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${suggestion.match}%`,
              backgroundColor: matchColor,
            }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {suggestion.reasons[0]}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METADATA_LABELS.map(([key, label]) => (
          <div
            key={key}
            className="rounded-lg px-3 py-2"
            style={{
              backgroundColor: "var(--surface-highlight)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <dt className="label-caps" style={{ fontSize: "var(--text-xs)" }}>{label}</dt>
            <dd
              className="mt-1 capitalize"
              style={{
                color: key === "style" ? "var(--text-academy)" : "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
              }}
            >
              {suggestion.metadata[key]}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export default function ImprovInsight({ chords, moodId }: ImprovInsightProps) {
  const [mode, setMode] = useState<InsightMode>("progression");
  const [requestedChordIndex, setRequestedChordIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const selectedChordIndex = Math.min(requestedChordIndex, Math.max(0, chords.length - 1));
  const suggestions = useMemo(() => {
    const analysisChords = mode === "progression"
      ? chords.map((item) => item.chord)
      : chords[selectedChordIndex] ? [chords[selectedChordIndex].chord] : [];
    const candidates = rankCompatibleScales(
      analysisChords,
      moodId ? SCALE_SUGGESTION_CANDIDATE_COUNT : 6,
    );
    return moodId ? filterScaleSuggestionsByMood(candidates, moodId, 6) : candidates;
  }, [chords, mode, moodId, selectedChordIndex]);
  const moodDefinition = moodId ? moodDefinitionFor(moodId) : null;

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentMode: InsightMode) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = MODES.findIndex((item) => item.id === currentMode);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = MODES[(currentIndex + direction + MODES.length) % MODES.length];
    setMode(next.id);
    requestAnimationFrame(() => document.getElementById(insightTabId(next.id))?.focus());
  }

  return (
    <section
      id="improv-insight-panel"
      aria-labelledby="improv-insight-title"
      className="w-full max-w-7xl px-4 pb-2"
      style={{ marginInline: "auto" }}
      data-testid="improv-insight"
      data-insight-mode={mode}
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-mood-id={moodId ?? "none"}
    >
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, var(--surface-raised), var(--surface-overlay))",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between md:p-6">
          <div>
            <span className="label-caps" style={{ color: "var(--text-academy)" }}>Play over this</span>
            <h2 id="improv-insight-title" className="mt-1" style={{ fontSize: "var(--text-2xl)" }}>
              Improv Insight
            </h2>
            <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              Ranked scale paths from the chord tones already on your timeline—not a guessed key.
            </p>
            {moodDefinition ? (
              <p
                className="mt-2 text-sm"
                data-testid="improv-mood-summary"
                style={{ color: "var(--text-academy)" }}
              >
                {moodDefinition.label} lens · showing {moodDefinition.scales.length} preferred scale families
              </p>
            ) : null}
          </div>
          <div
            role="tablist"
            aria-label="Improv Insight scope"
            className="inline-flex self-start rounded-full p-1 sm:self-auto"
            style={{ backgroundColor: "var(--surface-sunken)", border: "1px solid var(--border-subtle)" }}
          >
            {MODES.map((item) => {
              const active = item.id === mode;
              return (
                <button
                  key={item.id}
                  id={insightTabId(item.id)}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={insightPanelId(item.id)}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(item.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, item.id)}
                  className="rounded-full px-4 py-2 text-sm"
                  style={{
                    backgroundColor: active ? "var(--interactive-academy-bg)" : "transparent",
                    border: active ? "1px solid var(--interactive-academy-border)" : "1px solid transparent",
                    color: active ? "var(--interactive-academy-text)" : "var(--text-muted)",
                    fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                    transition: reduceMotion ? "none" : "all var(--duration-normal) var(--ease-out)",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        <div
          id={insightPanelId(mode)}
          role="tabpanel"
          aria-labelledby={insightTabId(mode)}
          className="border-t p-4 md:p-6"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {mode === "chord" ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2" aria-label="Chord to analyze">
              {chords.map((item, index) => {
                const active = index === selectedChordIndex;
                return (
                  <button
                    key={`${item.input}-${index}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRequestedChordIndex(index)}
                    className="shrink-0 rounded-full px-4 py-2"
                    style={{
                      backgroundColor: active ? "var(--interactive-accent-bg)" : "var(--interactive-secondary-bg)",
                      border: `1px solid ${active ? "var(--interactive-accent-border)" : "var(--interactive-secondary-border)"}`,
                      color: active ? "var(--interactive-accent-text)" : "var(--interactive-secondary-text)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {index + 1}. {item.input}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-3" aria-live="polite">
            {suggestions.map((suggestion, index) => (
              <ScaleResult key={`${suggestion.key}-${suggestion.scaleType}`} suggestion={suggestion} rank={index + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

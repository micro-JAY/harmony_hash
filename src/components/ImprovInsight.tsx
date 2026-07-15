import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronDown, CircleHelp, X } from "lucide-react";
import { prefersFlatNotation, splitRootAndQuality } from "../lib/chordData";
import type { IndexedChord } from "../lib/types";
import {
  filterScaleSuggestionsByMood,
  moodDefinitionFor,
  scaleIntervalsFor,
  scaleLearningDefinitionFor,
  type MoodId,
  type ScaleFormulaType,
} from "../lib/theory";
import {
  rankCompatibleScales,
  SCALE_SUGGESTION_CANDIDATE_COUNT,
  type ScaleSuggestion,
} from "../lib/theory/improvInsight";
import { matchColorForPercent } from "./musicVisuals";
import { intervalColor } from "../lib/visual/musicVisuals";
import { useT } from "../i18n/I18nContext";
import AccessibleDialog from "./AccessibleDialog";

interface ImprovInsightChord {
  readonly input: string;
  readonly chord: IndexedChord;
}

interface ImprovInsightProps {
  chords: ReadonlyArray<ImprovInsightChord>;
  moodId: MoodId | null;
  theoryContext?: {
    readonly root: string;
    readonly scaleId: ScaleFormulaType;
  } | null;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onClose?: () => void;
  hideTrigger?: boolean;
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

const IMPROV_ACCENT = "color-mix(in srgb, var(--interactive-soft-text) 68%, var(--text-primary))";

const GLOSSARY = Object.freeze([
  {
    label: "Motion",
    description: "How the scale line tends to move.",
    options: Object.freeze([
      ["Smooth", "Stepwise, connected movement."],
      ["Jumpy", "Larger leaps and skips."],
    ]),
  },
  {
    label: "Tension",
    description: "How the line creates or releases pull.",
    options: Object.freeze([
      ["Rises", "Builds tension."],
      ["Static", "Holds tension."],
      ["Falls", "Releases tension."],
    ]),
  },
  {
    label: "Palette",
    description: "Which notes shape the sound.",
    options: Object.freeze([
      ["Diatonic", "Mostly notes from the home key."],
      ["Chromatic", "Includes notes outside the home key."],
    ]),
  },
  {
    label: "Style",
    description: "The broad musical context.",
    options: Object.freeze([
      ["Tonal", "Functional harmony centered on a key."],
      ["Modal", "Mode-based harmony and color."],
      ["Blues", "Blues and blues-derived language."],
    ]),
  },
] as const);

function insightTabId(mode: InsightMode): string {
  return `improv-insight-tab-${mode}`;
}

function insightPanelId(mode: InsightMode): string {
  return `improv-insight-panel-${mode}`;
}

function ScaleResult({ suggestion, rank }: { suggestion: ScaleSuggestion; rank: number }) {
  const t = useT();
  const matchColor = matchColorForPercent(suggestion.match);
  const intervals = scaleIntervalsFor(suggestion.scaleType);
  return (
    <article
      className="grid min-w-0 gap-3 rounded-lg p-3 lg:grid-cols-[minmax(11rem,1fr)_minmax(9rem,0.72fr)_minmax(17rem,1.12fr)] lg:items-center"
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
            className="min-w-0"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {t(suggestion.label)}
          </h3>
        </div>
        {suggestion.alsoKnownAs ? (
          <p className="mt-1 pl-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("Also known as")} {t(suggestion.alsoKnownAs)}
          </p>
        ) : null}
        <p
          className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-8 readout"
          aria-label={t(`${suggestion.label} notes`)}
        >
          {suggestion.notes.map((note, index) => (
            <span key={`${note}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>·</span> : null}
              <span
                data-scale-note={note}
                data-note-interval={intervals[index]}
                style={{ color: intervalColor(intervals[index]) }}
              >
                {note}
              </span>
            </span>
          ))}
        </p>
      </div>

      <div className="min-w-0 lg:max-w-56">
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <span className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Match")}</span>
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
          aria-label={t(`${suggestion.label} match`)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={suggestion.match}
          className="h-1.5 w-full overflow-hidden rounded-full"
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
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t(suggestion.reasons[0])}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METADATA_LABELS.map(([key, label]) => (
          <div
            key={key}
            className="min-w-0 rounded-lg px-2.5 py-2"
            data-insight-metadata={key}
            style={{
              backgroundColor: "var(--interactive-soft-bg)",
              border: "1px solid var(--interactive-soft-border)",
            }}
          >
            <dt
              className="label-caps"
              style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}
            >
              {t(label)}
            </dt>
            <dd
              className="mt-1 capitalize"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
              }}
            >
              {t(suggestion.metadata[key])}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export default function ImprovInsight({
  chords,
  moodId,
  theoryContext,
  expanded: controlledExpanded,
  onExpandedChange,
  onClose,
  hideTrigger = false,
}: ImprovInsightProps) {
  const t = useT();
  const [mode, setMode] = useState<InsightMode>("progression");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const glossaryTriggerRef = useRef<HTMLButtonElement>(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;

  function setExpanded(next: boolean) {
    if (controlledExpanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  }
  const [requestedChordIndex, setRequestedChordIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const selectedChordIndex = Math.min(requestedChordIndex, Math.max(0, chords.length - 1));
  const suggestions = useMemo(() => {
    const analysisItems = mode === "progression"
      ? chords
      : chords[selectedChordIndex] ? [chords[selectedChordIndex]] : [];
    const candidates = rankCompatibleScales(
      analysisItems.map((item) => item.chord),
      moodId ? SCALE_SUGGESTION_CANDIDATE_COUNT : 6,
      {
        preferFlats: analysisItems.some((item) => {
          const [root] = splitRootAndQuality(item.input.trim());
          return prefersFlatNotation(root);
        }),
      },
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
      aria-label={t("Improv Insight")}
      className="w-full"
      data-testid="improv-insight"
      data-expanded={expanded ? "true" : "false"}
      data-insight-mode={mode}
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-mood-id={moodId ?? "none"}
    >
      {!hideTrigger ? <button
        type="button"
        aria-expanded={expanded}
        aria-controls="improv-insight-panel"
        onClick={() => setExpanded(!expanded)}
      className="hh-disclosure flex w-full items-center justify-between px-4 py-3 text-left"
        style={{
          color: IMPROV_ACCENT,
          backgroundColor: "var(--interactive-soft-bg)",
          borderColor: "var(--interactive-soft-border)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        <span>{t("Improv Insight")}</span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          style={{
            color: "var(--text-muted)",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: reduceMotion ? "none" : "transform var(--duration-fast) var(--ease-out)",
          }}
        />
      </button> : null}

      {expanded ? <div
        id="improv-insight-panel"
        className="hh-panel mx-auto w-full overflow-hidden"
        style={{
          marginTop: "var(--space-3)",
          maxWidth: "var(--layout-content-max)",
          borderColor: "var(--interactive-soft-border)",
        }}
      >
        <header className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="label-caps" style={{ color: IMPROV_ACCENT }}>{t("Play over this")}</span>
            <div className="mt-1 flex items-center gap-2">
              <h2 id="improv-insight-title" className="hh-panel-title">
                {t("Improv Insight")}
              </h2>
              <button
                ref={glossaryTriggerRef}
                type="button"
                className="hh-icon-button"
                aria-label={t("About Improv Insight vocabulary")}
                onClick={() => setGlossaryOpen(true)}
                style={{
                  minWidth: "var(--control-min-height)",
                  color: IMPROV_ACCENT,
                  backgroundColor: "var(--interactive-soft-bg)",
                  borderColor: "var(--interactive-soft-border)",
                }}
              >
                <CircleHelp size={17} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              {t("Ranked scale paths from the chord tones already on your timeline—not a guessed key.")}
            </p>
            {moodDefinition ? (
              <p
                className="mt-2 text-sm"
                data-testid="improv-mood-summary"
                style={{ color: IMPROV_ACCENT }}
              >
                {t(`${moodDefinition.label} lens · showing ${moodDefinition.scales.length} preferred scale families`)}
              </p>
            ) : null}
            {theoryContext ? (
              <p className="mt-2 text-sm" data-testid="improv-theory-context" style={{ color: IMPROV_ACCENT }}>
                {t("Circle context")}: {theoryContext.root} {t(scaleLearningDefinitionFor(theoryContext.scaleId).label)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div
              role="tablist"
              aria-label={t("Improv Insight scope")}
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
                      backgroundColor: active ? "var(--interactive-soft-bg)" : "transparent",
                      border: active ? "1px solid var(--interactive-soft-border)" : "1px solid transparent",
                      color: active ? IMPROV_ACCENT : "var(--text-secondary)",
                      fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                      transition: reduceMotion ? "none" : "all var(--duration-normal) var(--ease-out)",
                    }}
                  >
                    {t(item.label)}
                  </button>
                );
              })}
            </div>
            {onClose ? (
              <button type="button" className="hh-icon-button" aria-label={t("Close Improv Insight")} onClick={onClose}>
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </header>

        <div
          id={insightPanelId(mode)}
          role="tabpanel"
          aria-labelledby={insightTabId(mode)}
          className="border-t p-3 md:p-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {mode === "chord" ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2" aria-label={t("Chord to analyze")}>
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

          <div className="grid min-w-0 gap-2.5" aria-live="polite">
            {suggestions.length === 0 ? (
              <p className="hh-empty-state" role="status">
                {t("Add chords in Hasher to rank improvisation paths against the timeline.")}
              </p>
            ) : null}
            {suggestions.map((suggestion, index) => (
              <ScaleResult key={`${suggestion.key}-${suggestion.scaleType}`} suggestion={suggestion} rank={index + 1} />
            ))}
          </div>
        </div>
      </div> : null}

      {glossaryOpen ? (
        <AccessibleDialog
          title={t("About the vocabulary")}
          description={t("A quick guide to the four descriptions attached to every scale path.")}
          closeLabel={t("Close Improv Insight vocabulary")}
          onRequestClose={() => setGlossaryOpen(false)}
          returnFocusRef={glossaryTriggerRef}
          maxWidth="42rem"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            {GLOSSARY.map((group) => (
              <div
                key={group.label}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--interactive-soft-bg)",
                  border: "1px solid var(--interactive-soft-border)",
                }}
              >
                <dt className="label-caps" style={{ color: IMPROV_ACCENT }}>
                  {t(group.label)}
                </dt>
                <dd className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t(group.description)}
                </dd>
                <dd className="mt-3 grid gap-2">
                  {group.options.map(([option, description]) => (
                    <div key={option} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 text-sm">
                      <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {t(option)}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>{t(description)}</span>
                    </div>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </AccessibleDialog>
      ) : null}
    </section>
  );
}

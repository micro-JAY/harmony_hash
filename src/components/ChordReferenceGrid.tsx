import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lookupChord } from "../lib/chordData";
import {
  findLastResolvedChord,
  applyMoodToHarmonicFit,
  modalRootLegend,
  moodDefinitionFor,
  scoreChordKeyFit,
  scoreJazzChordFit,
  scoreModalChordFit,
  scoreNextChordFit,
} from "../lib/theory";
import type {
  HarmonicFitResult,
  HarmonyContext,
  MoodHarmonicFitResult,
  MoodId,
} from "../lib/theory";
import type { ScaleType } from "../lib/types";
import { fretboardIntervalColor } from "./fretboardVisuals";

export type SuggestionMode = "off" | "key" | "next" | "jazz" | "modal";

export type KeyContext = HarmonyContext;

const MODE_OPTIONS: ReadonlyArray<{ value: SuggestionMode; label: string }> = [
  { value: "off", label: "Off" },
  { value: "key", label: "Key" },
  { value: "next", label: "Next" },
  { value: "jazz", label: "Jazz" },
  { value: "modal", label: "Modal" },
];

const SCALE_TYPE_LABELS: Readonly<Record<ScaleType, string>> = {
  major: "major",
  natural_minor: "natural minor",
  harmonic_minor: "harmonic minor",
  dorian: "Dorian",
  mixolydian: "Mixolydian",
  lydian: "Lydian",
  phrygian: "Phrygian",
};

const FIT_TIER_VISUALS = {
  strong: {
    background: "color-mix(in srgb, var(--music-match-high) 14%, transparent)",
    border: "color-mix(in srgb, var(--music-match-high) 42%, transparent)",
    badge: "var(--music-match-high)",
    shadow: "none",
    jazzGlow: "0 0 0 1px color-mix(in srgb, var(--music-match-high) 48%, transparent), 0 0 14px color-mix(in srgb, var(--music-match-high) 28%, transparent)",
  },
  good: {
    background: "color-mix(in srgb, var(--music-match-good) 14%, transparent)",
    border: "color-mix(in srgb, var(--music-match-good) 42%, transparent)",
    badge: "var(--music-match-good)",
    shadow: "none",
    jazzGlow: "0 0 10px color-mix(in srgb, var(--music-match-good) 22%, transparent)",
  },
  color: {
    background: "color-mix(in srgb, var(--music-match-mid) 14%, transparent)",
    border: "color-mix(in srgb, var(--music-match-mid) 42%, transparent)",
    badge: "var(--music-match-mid)",
    shadow: "none",
    jazzGlow: "0 0 7px color-mix(in srgb, var(--music-match-mid) 16%, transparent)",
  },
  outside: {
    background: "color-mix(in srgb, var(--music-match-low) 10%, transparent)",
    border: "color-mix(in srgb, var(--music-match-low) 34%, transparent)",
    badge: "var(--music-match-low)",
    shadow: "none",
    jazzGlow: "none",
  },
} as const;

const MODAL_TIER_STRENGTH = {
  strong: { fill: 24, border: 68 },
  good: { fill: 18, border: 56 },
  color: { fill: 13, border: 44 },
  outside: { fill: 8, border: 32 },
} as const;

const GRID_PANEL_ID = "chord-reference-grid-panel";

// ─── Quality Group Type ─────────────────────────────────────────────

type QualityGroup = "basic" | "9ths+" | "sus" | "alt";

// ─── Root Colors (intentional chromatic identity — not design tokens) ─

const ROOT_COLORS: Record<string, string> = {
  "C":  "#B8D4F0", "C#": "#A3C6E8", "D":  "#8FB8E0", "Eb": "#7AAAD8",
  "E":  "#669CCF", "F":  "#528EC7", "F#": "#3E80BF", "G":  "#2E6FAF",
  "Ab": "#1F5E9F", "A":  "#154E8F", "Bb": "#0C3F7F", "B":  "#05306F",
};

// ─── Quality Candidates (checked at runtime against the chord index) ─

const QUALITY_CANDIDATES = [
  { label: "M",     suffix: "",      group: "basic" as const },
  { label: "m",     suffix: "m",     group: "basic" as const },
  { label: "dim",   suffix: "dim",   group: "alt"   as const },
  { label: "aug",   suffix: "aug",   group: "alt"   as const },
  { label: "sus2",  suffix: "sus2",  group: "sus"   as const },
  { label: "sus4",  suffix: "sus4",  group: "sus"   as const },
  { label: "6",     suffix: "6",     group: "basic" as const },
  { label: "m6",    suffix: "m6",    group: "basic" as const },
  { label: "7",     suffix: "7",     group: "basic" as const },
  { label: "maj7",  suffix: "maj7",  group: "basic" as const },
  { label: "m7",    suffix: "m7",    group: "basic" as const },
  { label: "9",     suffix: "9",     group: "9ths+" as const },
  { label: "11",    suffix: "11",    group: "9ths+" as const },
  { label: "maj11", suffix: "maj11", group: "9ths+" as const },
  { label: "m11",   suffix: "m11",   group: "9ths+" as const },
  { label: "dim7",  suffix: "dim7",  group: "alt"   as const },
  { label: "m7b5",  suffix: "m7b5",  group: "alt"   as const },
  { label: "7b9",   suffix: "7b9",   group: "alt"   as const },
  { label: "7#9",   suffix: "7#9",   group: "alt"   as const },
  { label: "7b5",   suffix: "7b5",   group: "alt"   as const },
  { label: "7#5",   suffix: "7#5",   group: "alt"   as const },
  { label: "aug7",  suffix: "+7",    group: "alt"   as const },
  { label: "add9",  suffix: "add9",  group: "9ths+" as const },
  { label: "madd9", suffix: "madd9", group: "9ths+" as const },
  { label: "maj9",  suffix: "maj9",  group: "9ths+" as const },
  { label: "m9",    suffix: "m9",    group: "9ths+" as const },
  { label: "7sus4", suffix: "7sus4", group: "sus"   as const },
  { label: "13",    suffix: "13",    group: "9ths+" as const },
];

// ─── Runtime-Derived Columns & Rows ─────────────────────────────────

// Use C as the probe root — all valid qualities exist on every root
const QUALITIES = QUALITY_CANDIDATES.filter(
  (q) => lookupChord("C" + q.suffix) !== undefined
);

// Display order for the 12 chromatic roots
const ROOT_DISPLAY_ORDER = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

// Only include roots that actually exist in the index
const ROOTS = ROOT_DISPLAY_ORDER.filter(
  (r) => lookupChord(r) !== undefined
);

// ─── Group Labels ───────────────────────────────────────────────────

const GROUP_LABELS: { id: QualityGroup | "all"; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "9ths+", label: "9ths+" },
  { id: "sus",   label: "Sus" },
  { id: "alt",   label: "Alt" },
  { id: "all",   label: "All" },
];

// ─── Props ──────────────────────────────────────────────────────────

interface ChordReferenceGridProps {
  chords: ReadonlyArray<string>;
  onChordAdd: (chordName: string) => void;
  onUndo: () => void;
  /**
   * Optional key + scale context used by Key and Next suggestions.
   * When absent or when mode is "off", the grid keeps its baseline
   * appearance and interaction behavior.
   */
  keyContext?: KeyContext;
  moodId?: MoodId | null;
}

// ─── Component ──────────────────────────────────────────────────────

export default function ChordReferenceGrid({
  chords,
  onChordAdd,
  onUndo,
  keyContext,
  moodId,
}: ChordReferenceGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<QualityGroup | "all">(() => {
    const visited = localStorage.getItem("harmony_visited");
    if (!visited) {
      localStorage.setItem("harmony_visited", "1");
      return "basic";
    }
    return "basic";
  });
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>("off");
  const chordHistory = useMemo(
    () => chords.flatMap((chordName) => {
      const chord = lookupChord(chordName);
      return chord ? [chord] : [];
    }),
    [chords],
  );
  const previousChord = chordHistory.at(-1)
    ?? findLastResolvedChord(chords.join(" "));
  const contextKey = keyContext?.key;
  const contextScaleType = keyContext?.scaleType;
  const modalLegend = useMemo(() => {
    if (suggestionMode !== "modal" || !contextKey || !contextScaleType) return [];
    return modalRootLegend({ key: contextKey, scaleType: contextScaleType });
  }, [contextKey, contextScaleType, suggestionMode]);
  const scoreByChord = useMemo(() => {
    const scores = new Map<string, HarmonicFitResult | MoodHarmonicFitResult>();
    if (suggestionMode === "off" || !contextKey || !contextScaleType) return scores;

    const context: HarmonyContext = { key: contextKey, scaleType: contextScaleType };
    for (const root of ROOTS) {
      for (const quality of QUALITIES) {
        const chordName = quality.suffix === "" ? root : `${root}${quality.suffix}`;
        const chord = lookupChord(chordName);
        if (!chord) continue;
        const baseFit = suggestionMode === "modal"
          ? scoreModalChordFit(chord, context)
          : suggestionMode === "jazz"
          ? scoreJazzChordFit(chord, context, chordHistory)
          : suggestionMode === "next"
            ? scoreNextChordFit(chord, context, previousChord)
            : scoreChordKeyFit(chord, context);
        scores.set(chordName, moodId
          ? applyMoodToHarmonicFit(baseFit, chord, context, moodId)
          : baseFit);
      }
    }
    return scores;
  }, [chordHistory, contextKey, contextScaleType, moodId, previousChord, suggestionMode]);
  const overlayActive = suggestionMode !== "off" && !!contextKey && !!contextScaleType;
  const contextLabel = contextKey && contextScaleType
    ? `${contextKey} ${SCALE_TYPE_LABELS[contextScaleType]}`
    : "No key context";
  const baseModeSummary = suggestionMode === "modal"
    ? `Modal roots across ${contextLabel} · fill maps root modes; % tracks chord-tone fit.`
    : suggestionMode === "jazz"
    ? previousChord
      ? `Jazz movement after ${previousChord.displayName} in ${contextLabel}`
      : `Jazz vocabulary in ${contextLabel}. Add a chord to reveal cadence paths.`
    : suggestionMode === "next"
      ? previousChord
        ? `Ranking what follows ${previousChord.displayName} in ${contextLabel}`
        : `Key fit in ${contextLabel}. Add a chord to rank what follows.`
      : `Key fit in ${contextLabel}`;
  const modeSummary = moodId
    ? `${baseModeSummary} · ${moodDefinitionFor(moodId).label} lens`
    : baseModeSummary;

  // Reset filter and history when grid collapses
  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (!next) {
      setActiveGroup("basic");
    }
  }

  // ── Filtered qualities based on active group ──
  const visibleQualities =
    activeGroup === "all"
      ? QUALITIES
      : QUALITIES.filter((q) => q.group === activeGroup);

  // ── Insert handler ──
  function handleChordInsert(chordName: string) {
    onChordAdd(chordName);
    setFlashCell(chordName);
    setTimeout(() => setFlashCell(null), 300);
  }

  // ── Undo handler — pops the last inserted chord ──
  function handleUndo() {
    onUndo();
  }

  const canUndo = chords.length > 0;

  // ── Group filter handler ──
  function handleGroupSelect(group: QualityGroup | "all") {
    setActiveGroup(group === activeGroup && group !== "all" ? "all" : group);
  }

  const colCount = visibleQualities.length;

  return (
    <div className="mt-3">
      {/* Toggle + Undo Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls={GRID_PANEL_ID}
        className="hh-disclosure-toggle"
        style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-raised)",
            fontSize: "var(--text-xs)",
            lineHeight: 1.4,
          }}
        >
          {isOpen ? "Hide grid \u2191" : "Browse chords \u2193"}
        </button>

        <AnimatePresence>
          {canUndo && (
            <motion.button
              type="button"
              initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -4 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
              onClick={handleUndo}
              style={{
                background: "none",
                border: "none",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              &#8617; undo
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Grid Panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={GRID_PANEL_ID}
            role="region"
            aria-label="Chord suggestions"
            data-testid="chord-grid-panel"
            data-mood-id={moodId ?? "none"}
            data-reduced-motion={shouldReduceMotion ? "true" : "false"}
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: "easeInOut" }}
            className="hh-chord-grid-panel mt-3 rounded-xl p-3 md:p-4"
            style={{
              overflow: "hidden",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Suggestion mode + context summary. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                padding: "var(--space-1) 0 var(--space-2)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "var(--tracking-caps)",
                  textTransform: "uppercase",
                }}
              >
                Suggest
              </span>
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: "var(--radius-full)",
                  padding: "var(--space-1)",
                  background: "var(--surface-overlay)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {MODE_OPTIONS.map((opt) => {
                  const active = suggestionMode === opt.value;
                  const disabled = opt.value !== "off" && !keyContext;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSuggestionMode(opt.value)}
                      aria-pressed={active}
                      aria-label={`${opt.label} chord suggestions`}
                      style={{
                        minHeight: "2rem",
                        padding: "var(--space-1) var(--space-3)",
                        borderRadius: "var(--radius-full)",
                        border: active ? "1px solid var(--interactive-accent-border)" : "1px solid transparent",
                        background: active ? "var(--interactive-accent-bg)" : "transparent",
                        color: disabled
                          ? "var(--interactive-disabled-text)"
                          : active
                            ? "var(--interactive-accent-text)"
                            : "var(--text-muted)",
                        fontSize: "var(--text-xs)",
                        fontFamily: "var(--font-body)",
                        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {overlayActive && (
                <span
                  aria-live="polite"
                  data-testid="suggestion-summary"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {modeSummary}
                </span>
              )}
            </div>

            {overlayActive && suggestionMode === "modal" ? (
              <div
                role="group"
                aria-label="Modal root legend"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                gap: "var(--space-2) var(--space-3)",
                padding: "var(--space-2) 0 var(--space-1)",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {modalLegend.map((item) => (
                  <span
                    key={item.degree}
                    aria-label={`Scale degree ${item.degree}: ${item.label}`}
                    data-modal-legend-id={item.scaleId}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: fretboardIntervalColor(item.paletteInterval) }}
                    />
                    M{item.degree} · {item.label}
                  </span>
                ))}
                <span>Outside roots keep the low-fit cue.</span>
              </div>
            ) : overlayActive && (
              <div
                role="group"
                aria-label="Fit score legend"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-2) var(--space-3)",
                  padding: "var(--space-2) 0 var(--space-1)",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                }}
              >
                <span style={{ color: "var(--music-match-high)" }}>85–100 strong</span>
                <span style={{ color: "var(--music-match-good)" }}>70–84 good</span>
                <span style={{ color: "var(--music-match-mid)" }}>50–69 color</span>
                <span style={{ color: "var(--music-match-low)" }}>0–49 outside</span>
              </div>
            )}

            {/* Group Filter Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                padding: "var(--space-3) 0 var(--space-2)",
              }}
            >
              {GROUP_LABELS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGroupSelect(g.id)}
                    aria-pressed={active}
                    style={{
                      fontSize: "var(--text-xs)",
                      minHeight: "2rem",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-full)",
                      border: active
                        ? "1px solid var(--border-default)"
                        : "1px solid var(--border-subtle)",
                      background: active ? "var(--surface-raised)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: active ? "var(--weight-semibold)" : "normal",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      lineHeight: 1.4,
                    }}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            <div
              data-testid="chord-grid-scroll"
              style={{ overflowX: "auto", paddingBottom: "var(--space-1)" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `28px repeat(${colCount}, minmax(48px, 1fr))`,
                  gap: "var(--space-1)",
                }}
              >
                {/* Header Row: empty corner + quality labels */}
                <div />
                {visibleQualities.map((q) => (
                  <div
                    key={q.label}
                    style={{
                      fontSize: "var(--text-xs)",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-raised)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.02em",
                      textAlign: "center",
                      userSelect: "none",
                    }}
                  >
                    {q.label}
                  </div>
                ))}

                {/* Data Rows */}
                {ROOTS.map((root) => {
                  const rootColor = ROOT_COLORS[root] ?? "var(--text-secondary)";
                  return (
                    <div key={root} style={{ display: "contents" }}>
                      {/* Root label */}
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-bold)",
                          textAlign: "right",
                          paddingRight: "2px",
                          color: rootColor,
                          alignSelf: "center",
                          userSelect: "none",
                        }}
                      >
                        {root}
                      </span>

                      {/* Chord cells */}
                      {visibleQualities.map((q) => {
                        const chordName =
                          q.suffix === "" ? root : `${root}${q.suffix}`;
                        const resolved = lookupChord(chordName);
                        if (!resolved) return <div key={q.label} />;

                        const fitResult = scoreByChord.get(chordName);
                        const fitVisual = fitResult
                          ? FIT_TIER_VISUALS[fitResult.tier]
                          : undefined;
                        const modalColor = suggestionMode === "modal" && fitResult?.modal
                          ? fretboardIntervalColor(fitResult.modal.paletteInterval)
                          : undefined;
                        const modalStrength = fitResult
                          ? MODAL_TIER_STRENGTH[fitResult.tier]
                          : MODAL_TIER_STRENGTH.outside;
                        const modalRootOutside = suggestionMode === "modal" && !modalColor;
                        const baseBackground = modalColor
                          ? `color-mix(in srgb, ${modalColor} ${modalStrength.fill}%, var(--surface-base))`
                          : modalRootOutside
                            ? FIT_TIER_VISUALS.outside.background
                            : fitVisual?.background ?? "var(--surface-base)";
                        const baseBorder = modalColor
                          ? `color-mix(in srgb, ${modalColor} ${modalStrength.border}%, transparent)`
                          : modalRootOutside
                            ? FIT_TIER_VISUALS.outside.border
                            : fitVisual?.border ?? "var(--border-subtle)";
                        const baseBadge = modalColor
                          ?? (modalRootOutside
                            ? FIT_TIER_VISUALS.outside.badge
                            : fitVisual?.badge);
                        const baseShadow = suggestionMode === "jazz"
                          ? fitVisual?.jazzGlow ?? "none"
                          : fitVisual?.shadow ?? "none";
                        const accessibleLabel = fitResult
                          ? `${chordName}, ${fitResult.score}% fit, ${fitResult.tier}. ${fitResult.reasons.join(". ")}`
                          : chordName;
                        const isFlashing = flashCell === chordName;
                        const flashStyle: React.CSSProperties = isFlashing
                          ? {
                              background: rootColor,
                              color: "var(--text-primary)",
                              boxShadow: `${rootColor}80 0px 0px 8px`,
                              borderColor: rootColor,
                            }
                          : {};

                        return (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => handleChordInsert(chordName)}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "copy";
                              event.dataTransfer.setData("text/plain", chordName);
                            }}
                            aria-label={accessibleLabel}
                            title={fitResult ? accessibleLabel : undefined}
                            data-chord-name={chordName}
                            data-fit-score={fitResult?.score}
                            data-fit-tier={fitResult?.tier}
                            data-fit-basis={fitResult?.basis}
                            data-modal-id={fitResult?.modal?.scaleId}
                            data-modal-degree={fitResult?.modal?.degree}
                            data-modal-interval={fitResult?.modal?.rootInterval}
                            data-modal-palette-interval={fitResult?.modal?.paletteInterval}
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: fitResult ? "1px" : 0,
                              padding: fitResult
                                ? "var(--space-1) var(--space-2)"
                                : "var(--space-2)",
                              minWidth: "48px",
                              minHeight: "44px",
                              borderRadius: "var(--radius-md)",
                              fontSize: "var(--text-sm)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: "var(--weight-bold)",
                              letterSpacing: "0.03em",
                              lineHeight: 1.05,
                              cursor: "pointer",
                              userSelect: "none",
                              touchAction: "manipulation",
                              background: baseBackground,
                              color: "var(--text-secondary)",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              borderColor: baseBorder,
                              boxShadow: baseShadow,
                              transition: shouldReduceMotion
                                ? "none"
                                : "background var(--duration-fast), border var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast)",
                              ...flashStyle,
                            }}
                            onMouseEnter={(e) => {
                              if (flashCell !== chordName) {
                                e.currentTarget.style.background = fitResult
                                  ? baseBackground
                                  : "var(--surface-raised)";
                                e.currentTarget.style.borderColor =
                                  baseBadge ?? "var(--border-strong)";
                                e.currentTarget.style.boxShadow = baseShadow;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (flashCell !== chordName) {
                                e.currentTarget.style.background =
                                  baseBackground;
                                e.currentTarget.style.borderColor =
                                  baseBorder;
                                e.currentTarget.style.boxShadow = baseShadow;
                              }
                            }}
                          >
                            <span>{chordName}</span>
                            {fitResult && (
                              <span
                                aria-hidden="true"
                                style={{
                                  color: baseBadge,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--weight-semibold)",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {suggestionMode === "modal"
                                  ? `${fitResult.modal ? `M${fitResult.modal.degree}` : "OUT"} · ${fitResult.score}%`
                                  : `${fitResult.score}%`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

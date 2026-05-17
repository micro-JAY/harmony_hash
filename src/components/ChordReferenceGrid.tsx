import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { lookupChord } from "../lib/chordData";
import { isRootDiatonic } from "../lib/theory";
import type { ScaleType } from "../lib/types";

export type SuggestionMode = "off" | "diatonic";

export interface KeyContext {
  key: string;
  scaleType: ScaleType;
}

const MODE_OPTIONS: ReadonlyArray<{ value: SuggestionMode; label: string }> = [
  { value: "off", label: "Off" },
  { value: "diatonic", label: "Diatonic" },
];

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
  inputValue: string;
  setInputValue: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /**
   * Optional key + scale context used by the suggestion overlay's
   * Diatonic mode. When absent or when mode is "off", the grid
   * renders every cell at full opacity (current default behavior).
   */
  keyContext?: KeyContext;
}

// ─── Component ──────────────────────────────────────────────────────

export default function ChordReferenceGrid({
  inputValue,
  setInputValue,
  inputRef,
  keyContext,
}: ChordReferenceGridProps) {
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
  const [insertHistory, setInsertHistory] = useState<string[]>([]);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>("off");

  // Pre-compute diatonic status per root once per render; cell renders
  // pull from this rather than re-evaluating in each cell loop.
  const diatonicByRoot = new Map<string, boolean>();
  if (suggestionMode === "diatonic" && keyContext) {
    for (const root of ROOTS) {
      diatonicByRoot.set(root, isRootDiatonic(root, keyContext.key, keyContext.scaleType));
    }
  }
  const overlayActive = suggestionMode === "diatonic" && !!keyContext;

  // Reset filter and history when grid collapses
  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (!next) {
      setActiveGroup("basic");
      setInsertHistory([]);
    }
  }

  // ── Filtered qualities based on active group ──
  const visibleQualities =
    activeGroup === "all"
      ? QUALITIES
      : QUALITIES.filter((q) => q.group === activeGroup);

  // ── Insert handler ──
  function handleChordInsert(chordName: string) {
    const current = inputValue.trim();
    const next = current ? `${current} ${chordName}` : chordName;
    setInputValue(next);
    inputRef.current?.focus();
    setFlashCell(chordName);
    setTimeout(() => setFlashCell(null), 300);
    setInsertHistory((prev) => [...prev, chordName]);
  }

  // ── Undo handler — pops the last inserted chord ──
  function handleUndo() {
    if (!insertHistory.length) return;
    const last = insertHistory[insertHistory.length - 1];
    const tokens = inputValue.trimEnd().split(" ");
    const idx = tokens.lastIndexOf(last);
    if (idx !== -1) tokens.splice(idx, 1);
    setInputValue(tokens.join(" "));
    setInsertHistory((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  }

  const canUndo = insertHistory.length > 0 && inputValue.trim().length > 0;

  // ── Group filter handler ──
  function handleGroupSelect(group: QualityGroup | "all") {
    setActiveGroup(group === activeGroup && group !== "all" ? "all" : group);
  }

  const colCount = visibleQualities.length;

  return (
    <div style={{ marginTop: "12px" }}>
      {/* Toggle + Undo Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={handleToggle}
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-raised)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-xs)",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            lineHeight: 1.4,
          }}
        >
          {isOpen ? "Hide grid \u2191" : "Browse chords \u2193"}
        </button>

        <AnimatePresence>
          {canUndo && (
            <motion.button
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Suggestion-mode toggle (Off / Diatonic). Disabled when
                no keyContext is available (Free Input with no key inferred). */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 0 2px",
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
                  borderRadius: "999px",
                  padding: "2px",
                  background: "var(--surface-overlay)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {MODE_OPTIONS.map((opt) => {
                  const active = suggestionMode === opt.value;
                  const disabled = opt.value === "diatonic" && !keyContext;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSuggestionMode(opt.value)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
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
              {overlayActive && keyContext && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  in {keyContext.key} {keyContext.scaleType.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Group Filter Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                padding: "10px 0 8px",
              }}
            >
              {GROUP_LABELS.map((g) => {
                const active = activeGroup === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleGroupSelect(g.id)}
                    style={{
                      fontSize: "var(--text-xs)",
                      padding: "3px 8px",
                      borderRadius: "999px",
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
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `20px repeat(${colCount}, minmax(44px, 1fr))`,
                  gap: "3px",
                }}
              >
                {/* Header Row: empty corner + quality labels */}
                <div />
                {visibleQualities.map((q) => (
                  <div
                    key={q.label}
                    style={{
                      fontSize: "9px",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-raised)",
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
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
                  // When the suggestion overlay is on, dim non-diatonic rows
                  // so the diatonic ones (1/IV/V/vi/etc.) stand out.
                  const isDiatonic = overlayActive ? diatonicByRoot.get(root) ?? false : true;
                  const rowOpacity = overlayActive && !isDiatonic ? 0.35 : 1;
                  return (
                    <div key={root} style={{ display: "contents", opacity: rowOpacity }}>
                      {/* Root label */}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textAlign: "right",
                          paddingRight: "2px",
                          color: rootColor,
                          alignSelf: "center",
                          userSelect: "none",
                          opacity: rowOpacity,
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

                        const isFlashing = flashCell === chordName;
                        const flashStyle: React.CSSProperties = isFlashing
                          ? {
                              background: rootColor,
                              color: "#fff",
                              boxShadow: `${rootColor}80 0px 0px 8px`,
                              borderColor: rootColor,
                            }
                          : {};

                        return (
                          <button
                            key={q.label}
                            onClick={() => handleChordInsert(chordName)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "4px 7px",
                              minWidth: "42px",
                              minHeight: "30px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              letterSpacing: "0.03em",
                              cursor: "pointer",
                              userSelect: "none",
                              touchAction: "manipulation",
                              background: "var(--surface-base)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-subtle)",
                              boxShadow: "none",
                              transition:
                                "background 0.15s, border 0.15s, color 0.15s, box-shadow 0.15s",
                              ...flashStyle,
                            }}
                            onMouseEnter={(e) => {
                              if (flashCell !== chordName) {
                                e.currentTarget.style.background =
                                  "var(--surface-raised)";
                                e.currentTarget.style.borderColor =
                                  "var(--border-default)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (flashCell !== chordName) {
                                e.currentTarget.style.background =
                                  "var(--surface-base)";
                                e.currentTarget.style.borderColor =
                                  "var(--border-subtle)";
                              }
                            }}
                          >
                            {chordName}
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

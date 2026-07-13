import { lazy, Suspense, useState, useRef, type DragEvent, type MutableRefObject } from "react";
import { AnimatePresence } from "framer-motion";
import type { ParseResult, TonalityId, Progression, ScaleType } from "../lib/types";
import { transposeNumeralString, ALL_KEYS } from "../lib/harmonyBrain";
import { lookupChord } from "../lib/chordData";
import type { IndexedChord } from "../lib/types";
import { PROGRESSION_LIBRARY } from "../data/progressions";
import MinorBlendModal from "./MinorBlendModal";
import ChordReferenceGrid from "./ChordReferenceGrid";
import ProgressionAgent from "./ProgressionAgent";
import { useT } from "../i18n/I18nContext";
import type { MoodId } from "../lib/theory";
import MoodFilter from "./MoodFilter";

const ImprovInsight = lazy(() => import("./ImprovInsight"));

interface ProgressionInputProps {
  onResult: (chords: Array<{ input: string; chord: IndexedChord }>, errors: ParseResult["errors"]) => void;
  timelineVersion: number;
  timelineVersionRef: MutableRefObject<number>;
  moodId: MoodId | null;
  onMoodChange: (moodId: MoodId | null) => void;
  chords: ReadonlyArray<{ input: string; chord: IndexedChord }>;
  onRequestVoice: () => void;
}

interface SelectedProgression {
  tonalityId: TonalityId;
  subgroupIdx: number;
  progressionIdx: number;
  progression: Progression;
  scaleType: ScaleType;
}

const FREE_MODE_OPTIONS: ReadonlyArray<{ value: ScaleType; label: string }> = [
  { value: "major", label: "Major" },
  { value: "natural_minor", label: "Natural Minor" },
  { value: "harmonic_minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "lydian", label: "Lydian" },
  { value: "phrygian", label: "Phrygian" },
];

export default function ProgressionInput({
  onResult,
  timelineVersion,
  timelineVersionRef,
  moodId,
  onMoodChange,
  chords,
  onRequestVoice,
}: ProgressionInputProps) {
  const t = useT();
  const [composedChords, setComposedChords] = useState<string[]>([]);
  const [freeKey, setFreeKey] = useState("C");
  const [freeScaleType, setFreeScaleType] = useState<ScaleType>("major");
  const [selected, setSelected] = useState<SelectedProgression | null>(null);
  const [selectedKey, setSelectedKey] = useState("C");
  const [errors, setErrors] = useState<ParseResult["errors"]>([]);
  const [activeTab, setActiveTab] = useState<"free" | "preset">("free");
  const [activeTonality, setActiveTonality] = useState<TonalityId>("major");
  const [minorHelpOpen, setMinorHelpOpen] = useState(false);
  const cancellationVersionRef = useRef(0);
  const agentCancellationVersion = 0;

  const activeGroup = PROGRESSION_LIBRARY.find((g) => g.id === activeTonality)!;

  function addComposedChord(chordName: string) {
    if (!lookupChord(chordName)) return;
    setComposedChords((current) => [...current, chordName]);
  }

  function handleComposerSubmit() {
    if (composedChords.length === 0) return;
    const resolved = composedChords.flatMap((input) => {
      const chord = lookupChord(input);
      return chord ? [{ input, chord }] : [];
    });
    setErrors([]);
    onResult(resolved, []);
  }

  function handleComposerDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addComposedChord(event.dataTransfer.getData("text/plain"));
  }

  function handleProgressionSelect(
    subgroupIdx: number,
    progressionIdx: number,
    progression: Progression,
    scaleType: ScaleType
  ) {
    const sel: SelectedProgression = {
      tonalityId: activeTonality,
      subgroupIdx,
      progressionIdx,
      progression,
      scaleType,
    };
    setSelected(sel);
    applyProgression(progression, scaleType, selectedKey);
  }

  function handleKeyChange(key: string) {
    setSelectedKey(key);
    if (selected) {
      applyProgression(selected.progression, selected.scaleType, key);
    }
  }

  function handleTonalityChange(tonalityId: TonalityId) {
    setActiveTonality(tonalityId);
    setSelected(null);
  }

  function applyProgression(progression: Progression, scaleType: ScaleType, key: string) {
    const chordNames = transposeNumeralString(progression.numerals, key, scaleType);
    const resolved: Array<{ input: string; chord: IndexedChord }> = [];
    const errs: ParseResult["errors"] = [];

    chordNames.forEach((name, i) => {
      const chord = lookupChord(name);
      if (chord) {
        resolved.push({ input: name, chord });
      } else {
        errs.push({ index: i, input: name, message: `Could not resolve: "${name}"` });
      }
    });

    setErrors(errs);
    onResult(resolved, errs);
  }

  function isActive(subgroupIdx: number, progressionIdx: number): boolean {
    return (
      selected !== null &&
      selected.tonalityId === activeTonality &&
      selected.subgroupIdx === subgroupIdx &&
      selected.progressionIdx === progressionIdx
    );
  }

  return (
    <section className="w-full max-w-6xl mx-auto px-4">
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4">
        {(["free", "preset"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
            }}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              fontWeight: activeTab === tab ? "var(--weight-semibold)" : "var(--weight-regular)",
              backgroundColor: activeTab === tab ? "var(--surface-overlay)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              border: activeTab === tab ? "1px solid var(--border-subtle)" : "1px solid transparent",
              transitionDuration: "var(--duration-normal)",
            }}
          >
            {tab === "free" ? t("freeInput") : t("progressions")}
          </button>
        ))}
      </div>

      <ProgressionAgent
        onResult={onResult}
        timelineVersion={timelineVersion}
        timelineVersionRef={timelineVersionRef}
        cancellationVersion={agentCancellationVersion}
        cancellationVersionRef={cancellationVersionRef}
        placeholder={t("agentPromptPlaceholder")}
        onRequestHelp={onRequestVoice}
      />

      <MoodFilter value={moodId} onChange={onMoodChange} />

      {/* Dictionary-backed composer. Click is the primary keyboard/mobile path;
          drag and drop is an additive pointer shortcut. */}
      {activeTab === "free" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div
              role="list"
              aria-label="Chord progression composer"
              data-testid="chord-composer"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleComposerDrop}
              className="w-full min-w-0 flex-1 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "var(--surface-overlay)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                minHeight: "3rem",
              }}
            >
              {composedChords.length === 0 ? (
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                  Choose chords from the grid, or drag them here.
                </span>
              ) : composedChords.map((chordName, index) => (
                <span
                  key={`${chordName}-${index}`}
                  role="listitem"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1"
                  style={{
                    backgroundColor: "var(--interactive-accent-bg)",
                    border: "1px solid var(--interactive-accent-border)",
                    color: "var(--interactive-accent-text)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {chordName}
                  <button
                    type="button"
                    aria-label={`Remove ${chordName} at position ${index + 1}`}
                    onClick={() => setComposedChords((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    style={{ color: "inherit", background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {composedChords.length > 0 ? (
                <button
                  type="button"
                  aria-label="Clear composed chords"
                  onClick={() => setComposedChords([])}
                  className="ml-auto rounded-md px-2 py-1 text-xs"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <button
              onClick={handleComposerSubmit}
              aria-label="Run chord composer"
              disabled={composedChords.length === 0}
              className="w-full px-6 py-3 rounded-lg font-semibold transition-all sm:w-auto"
              style={{
                backgroundColor: composedChords.length > 0 ? "var(--interactive-accent-bg)" : "var(--interactive-disabled-bg)",
                color: composedChords.length > 0 ? "var(--interactive-accent-text)" : "var(--interactive-disabled-text)",
                border: `1px solid ${composedChords.length > 0 ? "var(--interactive-accent-border)" : "var(--interactive-disabled-border)"}`,
                fontWeight: "var(--weight-semibold)",
                transitionDuration: "var(--duration-normal)",
                cursor: composedChords.length > 0 ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-accent-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-accent-bg)";
              }}
            >
              Run
            </button>
          </div>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
            role="group"
            aria-label="Free Input harmony context"
          >
            <label
              htmlFor="free-input-key"
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}
            >
              Key
              <select
                id="free-input-key"
                aria-label="Free Input key"
                value={freeKey}
                onChange={(event) => setFreeKey(event.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {ALL_KEYS.map((key) => (
                  <option key={key.value} value={key.value}>
                    {key.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              htmlFor="free-input-mode"
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}
            >
              Mode
              <select
                id="free-input-mode"
                aria-label="Free Input mode"
                value={freeScaleType}
                onChange={(event) => setFreeScaleType(event.target.value as ScaleType)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {FREE_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
              Suggestions follow the last chord in the composer.
            </span>
          </div>
        </div>
      )}

      {/* Chord Reference Grid — stays available while extending a result. */}
      {activeTab === "free" && (
        <ChordReferenceGrid
          chords={composedChords}
          onChordAdd={addComposedChord}
          onUndo={() => setComposedChords((current) => current.slice(0, -1))}
          keyContext={{ key: freeKey, scaleType: freeScaleType }}
          moodId={moodId}
        />
      )}

      {/* Progression presets and analysis tools. */}
      {activeTab === "preset" && (
        <div
          className="flex flex-col gap-4"
        >
          <details
            className="rounded-lg"
            style={{
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface-overlay)",
            }}
          >
            <summary
              className="px-4 py-3 cursor-pointer select-none text-sm flex items-center gap-2"
              style={{
                color: "var(--text-secondary)",
                fontWeight: "var(--weight-medium)",
                listStyle: "none",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRight: "2px solid currentColor",
                  borderBottom: "2px solid currentColor",
                  transform: "rotate(-45deg)",
                  transition: "transform var(--duration-normal) var(--ease-out)",
                }}
                className="progression-agent-disclosure"
              />
              {t("orPickPreset")}
            </summary>
            <div
              className="px-4 pb-4 pt-2 flex flex-col gap-4"
              style={{
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
          {/* Key + Tonality Selectors */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label
                className="text-sm"
                style={{ color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}
              >
                {t("key")}
              </label>
              <select
                aria-label="Progression key"
                value={selectedKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {ALL_KEYS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label
                className="text-sm"
                style={{ color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}
              >
                {t("tonality")}
              </label>
              <select
                aria-label="Progression tonality"
                value={activeTonality}
                onChange={(e) => handleTonalityChange(e.target.value as TonalityId)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {PROGRESSION_LIBRARY.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
              {activeTonality === "minor" && (
                <button
                  className="minor-help-btn"
                  onClick={() => setMinorHelpOpen(true)}
                  aria-label="What is the Minor Blend?"
                  title="What is the Minor Blend?"
                  style={{
                    width: "22px",
                    height: "22px",
                    backgroundColor: "var(--surface-overlay)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "50%",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)",
                    cursor: "help",
                    transition: "all var(--duration-normal) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-accent)";
                    e.currentTarget.style.borderColor = "var(--interactive-accent-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                  }}
                >
                  ?
                </button>
              )}
            </div>
          </div>

          {/* Subgroups + Progression Buttons */}
          <div className="flex flex-col gap-4">
            {activeGroup.subgroups.map((subgroup, sIdx) => {
              const scaleType = subgroup.scaleType ?? activeGroup.scaleType;
              return (
                <div key={sIdx}>
                  <h3
                    className="text-xs uppercase mb-2"
                    style={{
                      color: "var(--text-muted)",
                      letterSpacing: "var(--tracking-caps)",
                      fontWeight: "var(--weight-semibold)",
                    }}
                  >
                    {subgroup.label}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {subgroup.progressions.map((p, pIdx) => {
                      const active = isActive(sIdx, pIdx);
                      return (
                        <button
                          key={pIdx}
                          aria-label={`${p.name}: ${p.numerals}`}
                          onClick={() => handleProgressionSelect(sIdx, pIdx, p, scaleType)}
                          title={p.name}
                          className="px-3 py-1.5 rounded-lg text-sm transition-all"
                          style={{
                            backgroundColor: active
                              ? "var(--interactive-accent-bg)"
                              : "var(--surface-overlay)",
                            color: active
                              ? "var(--interactive-accent-text)"
                              : "var(--text-secondary)",
                            border: active
                              ? "1px solid var(--interactive-accent-border)"
                              : "1px solid var(--border-subtle)",
                            fontFamily: "var(--font-mono)",
                            fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                            transitionDuration: "var(--duration-normal)",
                          }}
                        >
                          {p.numerals}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
            </div>
          </details>

          {chords.length > 0 ? (
            <Suspense fallback={<span className="readout">Loading Improv Insight…</span>}>
              <ImprovInsight chords={chords} moodId={moodId} />
            </Suspense>
          ) : null}
        </div>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <div
          className="mt-3 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--status-error-bg)",
            color: "var(--status-error-text)",
            border: "1px solid var(--status-error-border)",
          }}
        >
          {errors.map((err, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span style={{ fontFamily: "var(--font-mono)" }}>{err.input}</span> — {err.message}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {minorHelpOpen && <MinorBlendModal onClose={() => setMinorHelpOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}

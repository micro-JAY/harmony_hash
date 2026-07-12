import { useState, useRef, type MutableRefObject } from "react";
import { AnimatePresence } from "framer-motion";
import type { ParseResult, TonalityId, Progression, ScaleType } from "../lib/types";
import { parseChordInput, transposeNumeralString, ALL_KEYS } from "../lib/harmonyBrain";
import { lookupChord } from "../lib/chordData";
import type { IndexedChord } from "../lib/types";
import { PROGRESSION_LIBRARY } from "../data/progressions";
import MinorBlendModal from "./MinorBlendModal";
import ChordReferenceGrid from "./ChordReferenceGrid";
import ProgressionAgent from "./ProgressionAgent";
import { useT } from "../i18n/I18nContext";

interface ProgressionInputProps {
  onResult: (chords: Array<{ input: string; chord: IndexedChord }>, errors: ParseResult["errors"]) => void;
  chordsEmpty: boolean;
  timelineVersion: number;
  timelineVersionRef: MutableRefObject<number>;
}

interface SelectedProgression {
  tonalityId: TonalityId;
  subgroupIdx: number;
  progressionIdx: number;
  progression: Progression;
  scaleType: ScaleType;
}

export default function ProgressionInput({
  onResult,
  chordsEmpty,
  timelineVersion,
  timelineVersionRef,
}: ProgressionInputProps) {
  const t = useT();
  const [freeText, setFreeText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedProgression | null>(null);
  const [selectedKey, setSelectedKey] = useState("C");
  const [errors, setErrors] = useState<ParseResult["errors"]>([]);
  const [activeTab, setActiveTab] = useState<"free" | "preset">("free");
  const [activeTonality, setActiveTonality] = useState<TonalityId>("major");
  const [minorHelpOpen, setMinorHelpOpen] = useState(false);
  const cancellationVersionRef = useRef(0);
  const [agentCancellationVersion, setAgentCancellationVersion] = useState(0);
  const [hasOpenedProgressions, setHasOpenedProgressions] = useState(false);

  const activeGroup = PROGRESSION_LIBRARY.find((g) => g.id === activeTonality)!;

  function cancelAgentRequest() {
    const nextVersion = cancellationVersionRef.current + 1;
    cancellationVersionRef.current = nextVersion;
    setAgentCancellationVersion(nextVersion);
  }

  function handleFreeTextSubmit() {
    if (!freeText.trim()) return;
    const result = parseChordInput(freeText);
    setErrors(result.errors);
    onResult(
      result.chords.map((c) => ({ input: c.input, chord: c.chord })),
      result.errors
    );
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
              if (tab === "preset") {
                setHasOpenedProgressions(true);
              }
              if (tab === "free" && activeTab === "preset") {
                cancelAgentRequest();
              }
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

      {/* Free Text Input */}
      {activeTab === "free" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFreeTextSubmit()}
            placeholder={t("freeInputHint")}
            className="w-full min-w-0 flex-1 px-4 py-3 rounded-lg text-base outline-none transition-all"
            style={{
              backgroundColor: "var(--surface-overlay)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-base)",
            }}
          />
          <button
            onClick={handleFreeTextSubmit}
            className="w-full px-6 py-3 rounded-lg font-semibold transition-all sm:w-auto"
            style={{
              backgroundColor: "var(--interactive-accent-bg)",
              color: "var(--interactive-accent-text)",
              border: "1px solid var(--interactive-accent-border)",
              fontWeight: "var(--weight-semibold)",
              transitionDuration: "var(--duration-normal)",
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
      )}

      {/* Chord Reference Grid — Free Input empty state only */}
      {activeTab === "free" && chordsEmpty && (
        <ChordReferenceGrid
          inputValue={freeText}
          setInputValue={setFreeText}
          inputRef={inputRef}
          keyContext={{ key: selectedKey, scaleType: activeGroup.scaleType }}
        />
      )}

      {/* Agent + Progression Browser */}
      {hasOpenedProgressions && (
        <div
          className={activeTab === "preset" ? "flex flex-col gap-4" : "hidden"}
        >
          <ProgressionAgent
            onResult={onResult}
            timelineVersion={timelineVersion}
            timelineVersionRef={timelineVersionRef}
            cancellationVersion={agentCancellationVersion}
            cancellationVersionRef={cancellationVersionRef}
            placeholder={t("agentPromptPlaceholder")}
          />

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

import { useState } from "react";
import type { ParseResult, PresetProgression } from "../lib/types";
import { parseChordInput, transposeProgression, PRESET_PROGRESSIONS, ALL_KEYS } from "../lib/harmonyBrain";
import { lookupChord } from "../lib/chordData";
import type { IndexedChord } from "../lib/types";

interface ProgressionInputProps {
  onResult: (chords: Array<{ input: string; chord: IndexedChord }>, errors: ParseResult["errors"]) => void;
}

export default function ProgressionInput({ onResult }: ProgressionInputProps) {
  const [freeText, setFreeText] = useState("");
  const [selectedProgression, setSelectedProgression] = useState<PresetProgression | null>(null);
  const [selectedKey, setSelectedKey] = useState("C");
  const [errors, setErrors] = useState<ParseResult["errors"]>([]);
  const [activeTab, setActiveTab] = useState<"free" | "preset">("free");

  function handleFreeTextSubmit() {
    if (!freeText.trim()) return;
    const result = parseChordInput(freeText);
    setErrors(result.errors);
    onResult(
      result.chords.map((c) => ({ input: c.input, chord: c.chord })),
      result.errors
    );
  }

  function handlePresetSelect(progression: PresetProgression) {
    setSelectedProgression(progression);
    applyPreset(progression, selectedKey);
  }

  function handleKeyChange(key: string) {
    setSelectedKey(key);
    if (selectedProgression) {
      applyPreset(selectedProgression, key);
    }
  }

  function applyPreset(progression: PresetProgression, key: string) {
    const chordNames = transposeProgression(progression.numerals, key, progression.scaleType);
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

  // Group progressions by category
  const grouped = PRESET_PROGRESSIONS.reduce<Record<string, PresetProgression[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4">
        {(["free", "preset"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              fontWeight: activeTab === tab ? "var(--weight-semibold)" : "var(--weight-regular)",
              backgroundColor: activeTab === tab ? "var(--surface-overlay)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              border: activeTab === tab ? "1px solid var(--border-subtle)" : "1px solid transparent",
              transitionDuration: "var(--duration-normal)",
            }}
          >
            {tab === "free" ? "Free Input" : "Progressions"}
          </button>
        ))}
      </div>

      {/* Free Text Input */}
      {activeTab === "free" && (
        <div className="flex gap-3">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFreeTextSubmit()}
            placeholder="Cmaj7 Dm7 G7 C ..."
            className="flex-1 px-4 py-3 rounded-lg text-base outline-none transition-all"
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
            className="px-6 py-3 rounded-lg font-semibold transition-all"
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

      {/* Preset Progression Picker */}
      {activeTab === "preset" && (
        <div className="flex flex-col gap-4">
          {/* Key Selector */}
          <div className="flex items-center gap-3">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}
            >
              Key
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

          {/* Progression Groups */}
          <div className="flex flex-col gap-3">
            {Object.entries(grouped).map(([category, progressions]) => (
              <div key={category}>
                <h3
                  className="text-xs uppercase mb-2"
                  style={{
                    color: "var(--text-muted)",
                    letterSpacing: "var(--tracking-caps)",
                    fontWeight: "var(--weight-semibold)",
                  }}
                >
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {progressions.map((p) => {
                    const isActive = selectedProgression?.name === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => handlePresetSelect(p)}
                        className="px-3 py-1.5 rounded-lg text-sm transition-all"
                        style={{
                          backgroundColor: isActive
                            ? "var(--interactive-accent-bg)"
                            : "var(--surface-overlay)",
                          color: isActive
                            ? "var(--interactive-accent-text)"
                            : "var(--text-secondary)",
                          border: isActive
                            ? "1px solid var(--interactive-accent-border)"
                            : "1px solid var(--border-subtle)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: isActive ? "var(--weight-semibold)" : "var(--weight-regular)",
                          transitionDuration: "var(--duration-normal)",
                        }}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
    </section>
  );
}

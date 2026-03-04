import { useState } from "react";
import type { Instrument, IndexedChord } from "../lib/types";
import { formatNoteForDisplay, getSvgPath, parseNotes, prefersFlatNotation } from "../lib/chordData";
import { computeVoicing } from "../lib/harmonyBrain";
import PianoKeyboard from "./PianoKeyboard";

interface ChordCardProps {
  chord: IndexedChord;
  instrument: Instrument;
  displayName: string;
  variantOverride?: number;  // For randomize
}

function extractDisplayRoot(chordName: string): string {
  const match = chordName.match(/^([A-G](?:#|b)?)/);
  return match ? match[1] : chordName;
}

export default function ChordCard({ chord, instrument, displayName, variantOverride }: ChordCardProps) {
  const [currentVariant, setCurrentVariant] = useState(1);
  const variant = variantOverride ?? currentVariant;
  const maxVariants = chord.variationCount;

  function prevVariant() {
    setCurrentVariant((v) => (v <= 1 ? maxVariants : v - 1));
  }

  function nextVariant() {
    setCurrentVariant((v) => (v >= maxVariants ? 1 : v + 1));
  }

  // Piano voicing
  const noteNames = parseNotes(chord.entry);
  const voicing = computeVoicing(noteNames);
  const preferFlats = prefersFlatNotation(extractDisplayRoot(displayName));
  const formattedNoteNames = noteNames.map((noteName) => formatNoteForDisplay(noteName, preferFlats));

  return (
    <div
      className="flex flex-col items-center rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--surface-raised)",
        border: "1px solid var(--border-subtle)",
        minWidth: instrument === "piano" ? "440px" : "200px",
        transition: `all var(--duration-normal) var(--ease-out)`,
      }}
    >
      {/* Chord Name */}
      <div
        className="w-full text-center py-3 px-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h3
          className="text-lg font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          {displayName}
        </h3>
        {chord.entry["Usage Notes"] && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            {chord.entry["Usage Notes"]}
          </p>
        )}
      </div>

      {/* Visualization */}
      <div className="p-4 flex flex-col items-center gap-2">
        {instrument === "guitar" ? (
          <>
            {chord.svgBasePath ? (
              <img
                src={getSvgPath(chord, variant)}
                alt={`${displayName} guitar chord diagram`}
                className="w-44 h-auto"
                style={{ filter: "invert(0.9) hue-rotate(10deg) brightness(1.1)" }}
              />
            ) : (
              <div
                className="w-44 h-44 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--surface-overlay)", color: "var(--text-muted)" }}
              >
                No diagram
              </div>
            )}

            {/* Variant cycling */}
            {maxVariants > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={prevVariant}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                  style={{
                    backgroundColor: "var(--interactive-secondary-bg)",
                    border: "1px solid var(--interactive-secondary-border)",
                    color: "var(--interactive-secondary-text)",
                    transitionDuration: "var(--duration-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--interactive-secondary-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--interactive-secondary-bg)";
                  }}
                >
                  ‹
                </button>
                <span
                  className="text-xs tabular-nums"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    minWidth: "3ch",
                    textAlign: "center",
                  }}
                >
                  {variant} / {maxVariants}
                </span>
                <button
                  onClick={nextVariant}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                  style={{
                    backgroundColor: "var(--interactive-secondary-bg)",
                    border: "1px solid var(--interactive-secondary-border)",
                    color: "var(--interactive-secondary-text)",
                    transitionDuration: "var(--duration-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--interactive-secondary-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--interactive-secondary-bg)";
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <PianoKeyboard voicedNotes={voicing.notes} />
            <div className="flex gap-2 mt-1">
              {voicing.voicingType === "drop2" && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--interactive-warm-bg)",
                    color: "var(--interactive-warm-text)",
                    border: "1px solid var(--interactive-warm-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Drop 2
                </span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--surface-highlight)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formattedNoteNames.join(" – ")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

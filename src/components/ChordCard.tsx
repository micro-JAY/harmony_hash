import { useMemo, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import type {
  Instrument,
  IndexedChord,
  GuitarDisplayMode,
  PianoDisplayMode,
  VoicedChord,
  VoicingStyle,
} from "../lib/types";
import { formatNoteForDisplay, parseNotes, prefersFlatNotation } from "../lib/chordData";
import { isVoicingStyleAvailable } from "../lib/harmonyBrain";
import type { ChordModifierOption } from "../lib/chordModifiers";
import GuitarChordDiagram from "./GuitarChordDiagram";
import PianoKeyboard from "./PianoKeyboard";
import ChordModifier from "./ChordModifier";
import PianoVoicingComparison, { PIANO_STYLE_OPTIONS } from "./PianoVoicingComparison";

interface ChordCardProps {
  chord: IndexedChord;
  instrument: Instrument;
  displayName: string;
  variant: number;
  onVariantChange: (variant: number) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  voicing: VoicedChord;
  priorVoicing?: VoicedChord;
  pianoStyle: VoicingStyle;
  onPianoStyleChange: (style: VoicingStyle) => void;
  onChordChange: (option: ChordModifierOption) => void;
  /** True when this card is the currently-sounding chord during playback. */
  isPlaying?: boolean;
}

const VOICING_TYPE_LABEL: Partial<Record<VoicedChord["voicingType"], string>> = {
  drop2: "Drop 2",
  drop3: "Drop 3",
  rootless: "Rootless",
  shell: "Shell",
  spread: "Spread",
  "two-hand": "Two-Hand",
};

const EMPTY_PRIOR_NOTES: VoicedChord["notes"] = [];

function extractDisplayRoot(chordName: string): string {
  const match = chordName.match(/^([A-G](?:#|b)?)/);
  return match ? match[1] : chordName;
}

export default function ChordCard({
  chord,
  instrument,
  displayName,
  variant,
  onVariantChange,
  isLocked,
  onToggleLock,
  voicing,
  priorVoicing,
  pianoStyle,
  onPianoStyleChange,
  onChordChange,
  isPlaying = false,
}: ChordCardProps) {
  const maxVariants = chord.variationCount;
  const boundedVariant = Math.min(Math.max(variant, 1), Math.max(maxVariants, 1));
  const [guitarDisplay, setGuitarDisplay] = useState<GuitarDisplayMode>("fingering");
  const [pianoDisplay, setPianoDisplay] = useState<PianoDisplayMode>("notes");
  const [comparisonOpen, setComparisonOpen] = useState(false);

  function prevVariant() {
    if (maxVariants <= 1) return;
    const nextVariant = boundedVariant <= 1 ? maxVariants : boundedVariant - 1;
    onVariantChange(nextVariant);
  }

  function nextVariant() {
    if (maxVariants <= 1) return;
    const nextVariant = boundedVariant >= maxVariants ? 1 : boundedVariant + 1;
    onVariantChange(nextVariant);
  }

  const noteNames = useMemo(() => parseNotes(chord.entry), [chord.entry]);
  const preferFlats = prefersFlatNotation(extractDisplayRoot(displayName));
  const formattedNoteNames = noteNames.map((noteName) => formatNoteForDisplay(noteName, preferFlats));

  return (
    <div
      data-testid="chord-card"
      className={`relative flex max-w-full flex-col items-center overflow-hidden rounded-xl ${
        instrument === "piano"
          ? comparisonOpen
            ? "w-full min-w-0 md:col-span-2 lg:basis-full"
            : "w-full min-w-0 lg:w-auto lg:min-w-[440px]"
          : "w-full min-w-0 lg:w-auto lg:min-w-[200px]"
      }`}
      data-playing={isPlaying ? "true" : undefined}
      style={{
        backgroundColor: "var(--surface-raised)",
        border: `1px solid ${isPlaying ? "var(--border-accent)" : "var(--border-subtle)"}`,
        transition: `all var(--duration-normal) var(--ease-out)`,
        boxShadow: isPlaying ? "var(--glow-accent)" : "none",
      }}
    >
      <button
        type="button"
        aria-label={isLocked ? "Unlock chord card" : "Lock chord card"}
        title={isLocked ? "Unlock" : "Lock"}
        onClick={onToggleLock}
        className="absolute top-2 right-2 rounded-md p-1 transition-colors"
        style={{
          backgroundColor: "var(--surface-highlight)",
          border: `1px solid ${isLocked ? "var(--border-accent)" : "var(--border-subtle)"}`,
          color: isLocked ? "var(--text-accent)" : "var(--text-muted)",
          zIndex: 2,
        }}
      >
        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>

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
      <div className="flex w-full min-w-0 flex-col items-center gap-2 p-4">
        <ChordModifier
          chord={chord}
          displayName={displayName}
          onSelect={onChordChange}
        />
        {instrument === "guitar" ? (
          <>
            {/* Guitar display mode toggle */}
            <div
              className="flex rounded-full p-0.5 self-end"
              style={{
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {(["fingering", "intervals", "notes"] as const).map((mode) => {
                const active = guitarDisplay === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGuitarDisplay(mode)}
                    className="px-2.5 py-1 text-xs rounded-full transition-all"
                    style={{
                      backgroundColor: active
                        ? "var(--interactive-accent-bg)"
                        : "transparent",
                      color: active
                        ? "var(--interactive-accent-text)"
                        : "var(--text-muted)",
                      border: active
                        ? "1px solid var(--interactive-accent-border)"
                        : "1px solid transparent",
                      fontWeight: active
                        ? "var(--weight-semibold)"
                        : "var(--weight-regular)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {mode === "fingering" ? "Fingering" : mode === "intervals" ? "Intervals" : "Notes"}
                  </button>
                );
              })}
            </div>

            {chord.svgBasePath ? (
              <GuitarChordDiagram
                chord={chord}
                variant={boundedVariant}
                displayMode={guitarDisplay}
                preferFlats={preferFlats}
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
                  type="button"
                  aria-label="Previous guitar variant"
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
                  {boundedVariant} / {maxVariants}
                </span>
                <button
                  type="button"
                  aria-label="Next guitar variant"
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
            {/* Piano voicing-style toggle (v3): Auto / Drop 2 / Drop 3 / Rootless / Shell */}
            <div
              className="flex flex-wrap rounded-full p-0.5 self-end gap-0.5"
              style={{
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {PIANO_STYLE_OPTIONS.map((opt) => {
                const applicable = isVoicingStyleAvailable(noteNames, opt.value);
                const active = pianoStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    disabled={!applicable}
                    onClick={() => onPianoStyleChange(opt.value)}
                    className="px-2.5 py-1 text-xs rounded-full transition-all"
                    style={{
                      backgroundColor: active
                        ? "var(--interactive-accent-bg)"
                        : "transparent",
                      color: !applicable
                        ? "var(--interactive-disabled-text)"
                        : active
                          ? "var(--interactive-accent-text)"
                          : "var(--text-muted)",
                      border: active
                        ? "1px solid var(--interactive-accent-border)"
                        : "1px solid transparent",
                      fontWeight: active
                        ? "var(--weight-semibold)"
                        : "var(--weight-regular)",
                      fontFamily: "var(--font-body)",
                      cursor: applicable ? "pointer" : "not-allowed",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full max-w-full overflow-x-auto lg:w-auto lg:max-w-none lg:overflow-x-visible">
              <PianoKeyboard
                voicedNotes={voicing.notes}
                displayMode={pianoDisplay}
                preferFlats={preferFlats}
                rootNote={noteNames[0] ?? ""}
              />
            </div>
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 mt-1">
              {/* Notes / Fingering display toggle (per-card). */}
              <div
                className="flex rounded-full p-0.5"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {(["notes", "fingering"] as const).map((mode) => {
                  const active = pianoDisplay === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPianoDisplay(mode)}
                      className="px-2 py-0.5 text-xs rounded-full transition-all"
                      style={{
                        backgroundColor: active
                          ? "var(--interactive-accent-bg)"
                          : "transparent",
                        color: active
                          ? "var(--interactive-accent-text)"
                          : "var(--text-muted)",
                        fontWeight: active
                          ? "var(--weight-semibold)"
                          : "var(--weight-regular)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {mode === "notes" ? "Notes" : "Fingering"}
                    </button>
                  );
                })}
              </div>
              {VOICING_TYPE_LABEL[voicing.voicingType] && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--interactive-warm-bg)",
                    color: "var(--interactive-warm-text)",
                    border: "1px solid var(--interactive-warm-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {VOICING_TYPE_LABEL[voicing.voicingType]}
                </span>
              )}
              <span
                className="max-w-full break-words text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--surface-highlight)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {formattedNoteNames.join(" – ")}
              </span>
            </div>
            <PianoVoicingComparison
              displayName={displayName}
              noteNames={noteNames}
              priorNotes={priorVoicing?.notes ?? EMPTY_PRIOR_NOTES}
              preferFlats={preferFlats}
              currentStyle={pianoStyle}
              expanded={comparisonOpen}
              onExpandedChange={setComparisonOpen}
              onStyleChange={onPianoStyleChange}
            />
          </>
        )}
      </div>
    </div>
  );
}

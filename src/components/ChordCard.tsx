import { useMemo, useState } from "react";
import type {
  Instrument,
  IndexedChord,
  GuitarDisplayMode,
  VoicedChord,
  VoicingStyle,
} from "../lib/types";
import { formatNoteForDisplay, parseNotes, prefersFlatNotation } from "../lib/chordData";
import { isVoicingStyleAvailable } from "../lib/harmonyBrain";
import type { ChordModifierOption } from "../lib/chordModifiers";
import GuitarChordDiagram from "./GuitarChordDiagram";
import PianoKeyboard from "./PianoKeyboard";
import ChordModifier from "./ChordModifier";
import ChordCardFrame from "./ChordCardFrame";
import PianoVoicingComparison, { PIANO_STYLE_OPTIONS } from "./PianoVoicingComparison";
import { useT } from "../i18n/I18nContext";
import type { GuitarMidiVoicing } from "../lib/guitarPlayback";
import type { HarmonyContext } from "../lib/theory";
import { classifyChordFamily } from "../lib/visual/chordFamily";

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
  onGuitarPlaybackVoicingChange?: (voicing: GuitarMidiVoicing | null) => void;
  harmonyContext?: HarmonyContext;
  timelineIndex?: number;
  timelineChords?: ReadonlyArray<IndexedChord>;
  /** True when this card is the currently-sounding chord during playback. */
  isPlaying?: boolean;
  /** True when Hanz is calling attention to this chord during a voice session. */
  isAgentHighlighted?: boolean;
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
  onGuitarPlaybackVoicingChange,
  harmonyContext,
  timelineIndex,
  timelineChords,
  isPlaying = false,
  isAgentHighlighted = false,
}: ChordCardProps) {
  const t = useT();
  const maxVariants = chord.variationCount;
  const boundedVariant = Math.min(Math.max(variant, 1), Math.max(maxVariants, 1));
  const [guitarDisplay, setGuitarDisplay] = useState<GuitarDisplayMode>("fingering");
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
  const availablePianoStyles = useMemo(
    () => PIANO_STYLE_OPTIONS.filter((option) => isVoicingStyleAvailable(noteNames, option.value)),
    [noteNames],
  );
  const hasPianoComparisons = availablePianoStyles.some((option) => option.value !== "auto");
  const preferFlats = prefersFlatNotation(extractDisplayRoot(displayName));
  const formattedNoteNames = noteNames.map((noteName) => formatNoteForDisplay(noteName, preferFlats));
  const voicingTypeLabel = VOICING_TYPE_LABEL[voicing.voicingType];

  return (
    <ChordCardFrame
      displayName={displayName}
      titleFamily={classifyChordFamily(chord)}
      usageNotes={chord.entry["Usage Notes"]}
      isLocked={isLocked}
      onToggleLock={onToggleLock}
      isPlaying={isPlaying}
      isAgentHighlighted={isAgentHighlighted}
    >
      {/* Visualization */}
      <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 p-4">
        {instrument === "guitar" ? (
          <div className="hh-guitar-card-toolbar" data-testid="guitar-card-toolbar">
            <div className="hh-guitar-card-toolbar__modifier">
              <ChordModifier
                chord={chord}
                displayName={displayName}
                onSelect={onChordChange}
                context={harmonyContext}
                selectedIndex={timelineIndex ?? 0}
                timeline={timelineChords ?? [chord]}
              />
            </div>
            <div
              role="group"
              aria-label={t(`Guitar labels for ${displayName}`)}
              data-testid="guitar-label-modes"
              className="hh-guitar-card-toolbar__modes flex rounded-full p-0.5"
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
                    className="min-h-9 rounded-full px-2.5 py-1 text-xs transition-all"
                    style={{
                      backgroundColor: active
                        ? "var(--interactive-accent-bg)"
                        : "transparent",
                      color: active
                        ? "var(--interactive-accent-text)"
                        : "var(--text-secondary)",
                      border: active
                        ? "1px solid var(--interactive-accent-border)"
                        : "1px solid transparent",
                      fontWeight: active
                        ? "var(--weight-semibold)"
                        : "var(--weight-regular)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {t(mode === "fingering" ? "Fingering" : mode === "intervals" ? "Intervals" : "Notes")}
                  </button>
                );
              })}
            </div>
            <span className="hh-guitar-card-toolbar__balance" aria-hidden="true" />
          </div>
        ) : (
          <ChordModifier
            chord={chord}
            displayName={displayName}
            onSelect={onChordChange}
            context={harmonyContext}
            selectedIndex={timelineIndex ?? 0}
            timeline={timelineChords ?? [chord]}
          />
        )}
        {instrument === "guitar" ? (
          <>
            {chord.svgBasePath ? (
              <GuitarChordDiagram
                chord={chord}
                variant={boundedVariant}
                displayMode={guitarDisplay}
                preferFlats={preferFlats}
                onPlaybackVoicingChange={onGuitarPlaybackVoicingChange}
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
                  aria-label={t("Previous guitar variant")}
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
                  aria-label={t("Next guitar variant")}
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
            <div className="w-full max-w-full overflow-visible">
              <PianoKeyboard
                voicedNotes={voicing.notes}
                displayMode="notes"
                preferFlats={preferFlats}
                rootNote={noteNames[0] ?? ""}
                colorMode="interval"
              />
            </div>
            {/* Only styles with an in-range voicing are useful choices for this chord. */}
            <div
              role="group"
              aria-label={t(`Piano voicing style for ${displayName}`)}
              data-testid="piano-style-selector"
              className="flex w-full flex-wrap items-stretch justify-center gap-1 rounded-lg p-1"
              style={{
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {availablePianoStyles.map((opt) => {
                const active = pianoStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    title={t(opt.label)}
                    onClick={() => onPianoStyleChange(opt.value)}
                    className="min-h-8 flex-none rounded-md px-2 py-1 text-xs leading-tight transition-all"
                    style={{
                      backgroundColor: active
                        ? "var(--interactive-accent-bg)"
                        : "transparent",
                      color: active
                        ? "var(--interactive-accent-text)"
                        : "var(--text-secondary)",
                      border: active
                        ? "1px solid var(--interactive-accent-border)"
                        : "1px solid transparent",
                      fontWeight: active
                        ? "var(--weight-semibold)"
                        : "var(--weight-regular)",
                      fontFamily: "var(--font-body)",
                      cursor: "pointer",
                    }}
                  >
                    <span className="block whitespace-nowrap">{t(opt.label)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 mt-1">
              {voicingTypeLabel && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--interactive-warm-bg)",
                    color: "var(--interactive-warm-text)",
                    border: "1px solid var(--interactive-warm-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t(voicingTypeLabel)}
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
            {hasPianoComparisons ? (
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
            ) : null}
          </>
        )}
      </div>
    </ChordCardFrame>
  );
}

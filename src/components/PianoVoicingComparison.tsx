import { useId, useMemo, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { VoicedNote, VoicingStyle } from "../lib/types";
import { formatNoteForDisplay } from "../lib/chordData";
import { computeVoicingComparisons } from "../lib/harmonyBrain";
import PianoKeyboard from "./PianoKeyboard";

interface PianoVoicingComparisonProps {
  displayName: string;
  noteNames: string[];
  priorNotes: ReadonlyArray<VoicedNote>;
  preferFlats: boolean;
  currentStyle: VoicingStyle;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onStyleChange: (style: VoicingStyle) => void;
}

const PIANO_STYLE_LABELS: Readonly<Record<VoicingStyle, string>> = {
  auto: "Auto",
  drop2: "Drop 2",
  drop3: "Drop 3",
  rootless: "Rootless",
  shell: "Shell",
  spread: "Spread",
  "two-hand": "Two-Hand",
};

export const PIANO_STYLE_OPTIONS: ReadonlyArray<{ value: VoicingStyle; label: string }> = (
  Object.keys(PIANO_STYLE_LABELS) as VoicingStyle[]
).map((value) => ({ value, label: PIANO_STYLE_LABELS[value] }));

export default function PianoVoicingComparison({
  displayName,
  noteNames,
  priorNotes,
  preferFlats,
  currentStyle,
  expanded,
  onExpandedChange,
  onStyleChange,
}: PianoVoicingComparisonProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const comparisons = useMemo(
    () => (expanded ? computeVoicingComparisons(noteNames, priorNotes) : []),
    [expanded, noteNames, priorNotes],
  );

  function closeAndRestoreFocus() {
    onExpandedChange(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="mt-2 w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`Compare voicings for ${displayName}`}
        onClick={() => (expanded ? closeAndRestoreFocus() : onExpandedChange(true))}
        className="piano-voicing-comparison-motion flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-all"
        style={{
          backgroundColor: expanded
            ? "var(--interactive-accent-bg)"
            : "var(--interactive-secondary-bg)",
          border: `1px solid ${expanded ? "var(--interactive-accent-border)" : "var(--interactive-secondary-border)"}`,
          color: expanded
            ? "var(--interactive-accent-text)"
            : "var(--interactive-secondary-text)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        <span>
          Compare voicings
          <span
            className="ml-2 font-normal"
            style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}
          >
            Hear the shape before you choose
          </span>
        </span>
        <ChevronDown
          data-testid="voicing-comparison-chevron"
          size={16}
          aria-hidden="true"
          className="piano-voicing-comparison-motion"
          style={{
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--duration-fast) var(--ease-out)",
          }}
        />
      </button>

      {expanded ? (
        <section
          id={panelId}
          role="region"
          aria-label={`Compare ${displayName} piano voicings`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndRestoreFocus();
            }
          }}
          className="mt-2 min-w-0 rounded-lg p-3"
          style={{
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                One chord, different shapes
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-xs)",
                }}
              >
                Color follows interval; note names confirm every choice.
              </p>
            </div>
            <span className="readout" style={{ color: "var(--text-muted)" }}>
              {comparisons.length} shapes
            </span>
          </div>

          <div
            data-testid="voicing-comparison-rail"
            className="flex min-w-0 gap-3 overflow-x-auto pb-2"
            style={{ overscrollBehaviorX: "contain", scrollSnapType: "x proximity" }}
          >
            {comparisons.map(({ style, voicing }) => {
              const active = currentStyle === style;
              const styleLabel = PIANO_STYLE_LABELS[style];
              const notes = [...voicing.notes]
                .sort((a, b) => a.midi - b.midi)
                .map((note) => `${formatNoteForDisplay(note.name, preferFlats)}${note.octave}`)
                .join(" · ");

              return (
                <button
                  key={style}
                  type="button"
                  data-testid="voicing-comparison-option"
                  data-style={style}
                  aria-pressed={active}
                  aria-describedby={`${panelId}-${style}-notes`}
                  aria-label={`${active ? "Current" : "Use"} ${styleLabel} voicing for ${displayName}`}
                  onClick={() => onStyleChange(style)}
                  className="piano-voicing-comparison-motion flex w-[278px] shrink-0 flex-col gap-3 rounded-lg p-3 text-left transition-all"
                  style={{
                    backgroundColor: active
                      ? "var(--interactive-accent-bg)"
                      : "var(--surface-raised)",
                    border: `1px solid ${active ? "var(--interactive-accent-border)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                    scrollSnapAlign: "start",
                  }}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--weight-semibold)",
                      }}
                    >
                      {styleLabel}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      style={{
                        color: active ? "var(--text-accent)" : "var(--text-muted)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {active ? <Check size={13} aria-hidden="true" /> : null}
                      {active ? "Current" : "Use"}
                    </span>
                  </span>

                  <PianoKeyboard
                    voicedNotes={voicing.notes}
                    displayMode="notes"
                    preferFlats={preferFlats}
                    rootNote={noteNames[0] ?? ""}
                    size="compact"
                    colorMode="interval"
                  />

                  <span
                    id={`${panelId}-${style}-notes`}
                    className="min-h-[2.5em] break-words"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    {notes}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

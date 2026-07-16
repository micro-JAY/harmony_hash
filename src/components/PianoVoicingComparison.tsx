import { useId, useMemo, useRef } from "react";
import { Check, LayoutGrid } from "lucide-react";
import type { VoicedNote, VoicingStyle } from "../lib/types";
import { formatNoteForDisplay } from "../lib/chordData";
import { computeVoicingComparisons } from "../lib/harmonyBrain";
import { chordFamilyPresentation } from "../lib/visual/chordFamily";
import AccessibleDialog from "./AccessibleDialog";
import PianoKeyboard from "./PianoKeyboard";
import { useT } from "../i18n/I18nContext";

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
  const t = useT();
  const optionDescriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const familyPresentation = chordFamilyPresentation(displayName);
  const localizedDialogTitle = t(`Compare ${displayName} piano voicings`);
  const [dialogTitleBefore = "", ...dialogTitleRemainder] = localizedDialogTitle.split(displayName);
  const dialogTitleAfter = dialogTitleRemainder.join(displayName);
  const comparisons = useMemo(
    () => (expanded ? computeVoicingComparisons(noteNames, priorNotes) : []),
    [expanded, noteNames, priorNotes],
  );

  function closeComparison() {
    onExpandedChange(false);
  }

  return (
    <div className="mt-auto w-full min-w-0 pt-2">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-label={t(`Compare voicings for ${displayName}`)}
        onClick={() => onExpandedChange(true)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-all"
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
        <span className="min-w-0">
          {t("Compare voicings")}
          <span
            className="ml-2 font-normal"
            style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}
          >
            {t("Hear the shape before you choose")}
          </span>
        </span>
        <LayoutGrid size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>

      {expanded ? (
        <AccessibleDialog
          title={(
            <span
              className="inline-flex flex-wrap items-center gap-1"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="sr-only">{localizedDialogTitle}</span>
              <span aria-hidden="true" className="inline-flex flex-wrap items-center gap-1">
                <span>{dialogTitleBefore}</span>
                <span
                  data-chord-family={familyPresentation.family}
                  className="inline-flex rounded px-2 py-1"
                  style={{
                    color: familyPresentation.color,
                    backgroundColor: familyPresentation.backgroundColor,
                    border: `1px solid ${familyPresentation.borderColor}`,
                  }}
                >
                  {displayName}
                </span>
                <span>{dialogTitleAfter}</span>
              </span>
            </span>
          )}
          description={(
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>{t("Color follows interval; note names confirm every choice.")}</span>
              <span className="readout" style={{ color: "var(--text-secondary)" }}>
                {t(`${comparisons.length} shapes`)}
              </span>
            </span>
          )}
          closeLabel={t("Close piano voicing comparison")}
          onRequestClose={closeComparison}
          initialFocusRef={firstOptionRef}
          returnFocusRef={triggerRef}
          maxWidth="50rem"
          footer={(
            <p
              className="text-center"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-xs)",
              }}
            >
              {t("Choose a voicing to preview and select. Escape closes this window.")}
            </p>
          )}
        >
          <div
            data-testid="voicing-comparison-grid"
            className="grid min-w-0 gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
            }}
          >
            {comparisons.map(({ style, voicing }, index) => {
              const active = currentStyle === style;
              const styleLabel = PIANO_STYLE_LABELS[style];
              const translatedStyleLabel = t(styleLabel);
              const notes = [...voicing.notes]
                .sort((a, b) => a.midi - b.midi)
                .map((note) => `${formatNoteForDisplay(note.name, preferFlats)}${note.octave}`)
                .join(" · ");

              return (
                <button
                  ref={index === 0 ? firstOptionRef : undefined}
                  key={style}
                  type="button"
                  data-testid="voicing-comparison-option"
                  data-style={style}
                  aria-pressed={active}
                  aria-describedby={`${optionDescriptionId}-${style}-notes`}
                  aria-label={t(`${active ? "Current" : "Use"} ${translatedStyleLabel} voicing for ${displayName}`)}
                  onClick={() => {
                    onStyleChange(style);
                    closeComparison();
                  }}
                  className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg p-3 text-left transition-all"
                  style={{
                    backgroundColor: active
                      ? "var(--interactive-accent-bg)"
                      : "var(--surface-overlay)",
                    border: `1px solid ${active ? "var(--interactive-accent-border)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                  }}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-2">
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--weight-semibold)",
                      }}
                    >
                      {translatedStyleLabel}
                    </span>
                    <span
                      className="flex shrink-0 items-center gap-1"
                      style={{
                        color: active ? "var(--text-accent)" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {active ? <Check size={13} aria-hidden="true" /> : null}
                      {t(active ? "Current" : "Use")}
                    </span>
                  </span>

                  <div className="w-full min-w-0 overflow-hidden">
                    <PianoKeyboard
                      voicedNotes={voicing.notes}
                      displayMode="notes"
                      preferFlats={preferFlats}
                      rootNote={noteNames[0] ?? ""}
                      size="compact"
                      colorMode="interval"
                    />
                  </div>

                  <span
                    id={`${optionDescriptionId}-${style}-notes`}
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
        </AccessibleDialog>
      ) : null}
    </div>
  );
}

import type { GuitarDisplayMode, IndexedChord } from "../lib/types";
import type { UkuleleVoicing } from "../lib/ukuleleVoicings";
import { formatNoteForDisplay } from "../lib/chordData";
import { pitchClassOf } from "../lib/theory/scaleBasics";
import { guitarDegreePresentation } from "./guitarChordVisuals";
import { useT } from "../i18n/I18nContext";

interface UkuleleChordDiagramProps {
  chord: IndexedChord;
  voicing: UkuleleVoicing;
  displayMode: GuitarDisplayMode;
  preferFlats: boolean;
}

const STRING_LABELS = ["G4", "C4", "E4", "A4"] as const;

export default function UkuleleChordDiagram({
  chord,
  voicing,
  displayMode,
  preferFlats,
}: UkuleleChordDiagramProps) {
  const t = useT();
  const rootPitchClass = pitchClassOf(chord.root);
  return (
    <svg
      data-testid="ukulele-chord-diagram"
      data-frets={voicing.frets.map((fret) => fret ?? "x").join("-")}
      role="img"
      aria-label={`${t("Ukulele chord diagram")}: ${chord.displayName}`}
      viewBox="0 0 200 225"
      className="h-auto w-44 max-w-full"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <title>{`${chord.displayName} · ${voicing.frets.map((fret) => fret ?? "×").join(" ")} · G4 C4 E4 A4`}</title>
      <rect x="1" y="1" width="198" height="223" rx="12" fill="var(--surface-overlay)" stroke="var(--border-default)" />
      {[0, 1, 2, 3, 4].map((fret) => (
        <line key={fret} x1="50" x2="152" y1={48 + fret * 32} y2={48 + fret * 32}
          stroke="var(--border-strong)" strokeWidth={fret === 0 && voicing.baseFret === 1 ? 4 : 1} />
      ))}
      {voicing.baseFret > 1 ? (
        <text x="26" y="69" textAnchor="middle" fill="var(--text-muted)" fontSize="12">{voicing.baseFret}</text>
      ) : null}
      {STRING_LABELS.map((label, index) => {
        const x = 50 + index * 34;
        const fret = voicing.frets[index];
        const note = voicing.notes.find((candidate) => candidate.stringNumber === 4 - index);
        const presentation = note ? guitarDegreePresentation(note.pitchClass, rootPitchClass) : null;
        const noteLabel = note ? formatNoteForDisplay(note.noteLabel, preferFlats) : "";
        const dotLabel = displayMode === "notes" ? noteLabel
          : displayMode === "intervals" ? note?.degree : String(fret);
        const y = fret === 0 ? 27 : 48 + ((fret ?? voicing.baseFret) - voicing.baseFret + 0.5) * 32;
        return (
          <g key={label}>
            <line x1={x} x2={x} y1="48" y2="176" stroke="var(--border-strong)" />
            <text x={x} y="205" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">{label}</text>
            {fret === null ? (
              <text x={x} y="33" textAnchor="middle" fill="var(--text-muted)" fontSize="18">×</text>
            ) : note && presentation ? (
              <g data-played-position="true" data-midi={note.midi}>
                <title>{`${noteLabel}${Math.floor(note.midi / 12) - 1} · ${t("Fret")} ${fret}`}</title>
                <circle cx={x} cy={y} r="13" fill={presentation.color} stroke="var(--surface-base)" strokeWidth="1.5" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                  fontSize="11" fontWeight="600" fill={presentation.labelColor}>{dotLabel}</text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

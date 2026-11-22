import { useT } from "../i18n/I18nContext";
import { fretboardTuningDefinitionFor } from "../lib/theory/fretboard";
import { discoveryKeyLabel, discoveryNoteName } from "../lib/discovery/chordIdentification";
import type { DiscoveryScaleMembership } from "../lib/discovery/scaleOverlay";

interface DiscoveryFretboardProps {
  readonly frets: Readonly<Record<number, number>>;
  readonly heldNotes: ReadonlySet<number>;
  readonly scaleMembership?: DiscoveryScaleMembership | null;
  readonly onToggle: (stringNumber: number, fret: number) => void;
}

export const DISCOVERY_GUITAR_STRINGS = fretboardTuningDefinitionFor("guitar").strings;
const DISCOVERY_FRET_MARKERS = new Set([3, 5, 7, 9, 12]);

export default function DiscoveryFretboard({
  frets,
  heldNotes,
  scaleMembership = null,
  onToggle,
}: DiscoveryFretboardProps) {
  const t = useT();
  return (
    <div
      className="discovery-instrument-scroll discovery-fretboard-scroll"
      role="region"
      aria-label={t("Discovery guitar fretboard scroller")}
      data-testid="discovery-guitar-scroller"
    >
      <div
        role="group"
        aria-label={t("Discovery guitar fretboard")}
        className="discovery-fretboard"
        data-scale-overlay={scaleMembership?.label ?? "off"}
      >
        <div className="discovery-fretboard__row discovery-fretboard__numbers" aria-hidden="true">
          <span className="discovery-fretboard__corner" />
          {Array.from({ length: 13 }, (_, fret) => <span key={fret}>{fret === 0 ? t("Open") : fret}</span>)}
        </div>
        {DISCOVERY_GUITAR_STRINGS.map((string) => (
          <div className="discovery-fretboard__row discovery-fretboard__string-row" data-string={string.number} key={string.number}>
            <span className="discovery-fretboard__string" title={discoveryKeyLabel(string.absoluteOpenPitch)}>
              {string.openNote}<small>{string.number}</small>
            </span>
            {Array.from({ length: 13 }, (_, fret) => {
              const midi = string.absoluteOpenPitch + fret;
              const pitchClass = midi % 12;
              const held = heldNotes.has(midi);
              const selected = frets[string.number] === fret;
              const isScaleTone = scaleMembership?.pitchClasses.has(pitchClass) ?? false;
              const isScaleRoot = isScaleTone && scaleMembership?.rootPitchClass === pitchClass;
              const displayNote = isScaleTone
                ? scaleMembership?.noteLabels.get(pitchClass) ?? discoveryNoteName(midi)
                : discoveryNoteName(midi);
              const scaleSemantics = isScaleTone && scaleMembership
                ? `, ${t(isScaleRoot ? "Scale root" : "Scale tone")}: ${t(scaleMembership.label)}`
                : "";
              return (
                <button
                  type="button"
                  key={fret}
                  className="discovery-fret"
                  aria-label={`${t("String")} ${string.number}, ${t("Fret")} ${fret}, ${discoveryKeyLabel(midi)}${scaleSemantics}`}
                  aria-pressed={selected || held}
                  data-held={held ? "true" : "false"}
                  data-string={string.number}
                  data-fret={fret}
                  data-note={displayNote}
                  data-scale-tone={isScaleTone ? "true" : undefined}
                  data-scale-root={isScaleRoot ? "true" : undefined}
                  onClick={() => onToggle(string.number, fret)}
                >
                  <span>{selected || held || isScaleTone || fret === 0 ? displayNote : "·"}</span>
                </button>
              );
            })}
          </div>
        ))}
        <div className="discovery-fretboard__row discovery-fretboard__markers" aria-hidden="true">
          <span />
          {Array.from({ length: 13 }, (_, fret) => (
            <span key={fret}>
              {DISCOVERY_FRET_MARKERS.has(fret) ? <i /> : null}
              {fret === 12 ? <i /> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

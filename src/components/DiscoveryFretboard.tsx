import { useT } from "../i18n/I18nContext";
import { fretboardTuningDefinitionFor } from "../lib/theory/fretboard";
import { discoveryKeyLabel, discoveryNoteName } from "../lib/discovery/chordIdentification";

interface DiscoveryFretboardProps {
  readonly frets: Readonly<Record<number, number>>;
  readonly heldNotes: ReadonlySet<number>;
  readonly onToggle: (stringNumber: number, fret: number) => void;
}

export const DISCOVERY_GUITAR_STRINGS = fretboardTuningDefinitionFor("guitar").strings;

export default function DiscoveryFretboard({ frets, heldNotes, onToggle }: DiscoveryFretboardProps) {
  const t = useT();
  return (
    <div className="discovery-instrument-scroll">
      <div role="group" aria-label={t("Discovery guitar fretboard")} className="discovery-fretboard">
        <div className="discovery-fretboard__row discovery-fretboard__numbers" aria-hidden="true">
          <span />
          {Array.from({ length: 13 }, (_, fret) => <span key={fret}>{fret === 0 ? t("Open") : fret}</span>)}
        </div>
        {DISCOVERY_GUITAR_STRINGS.map((string) => (
          <div className="discovery-fretboard__row" key={string.number}>
            <span className="discovery-fretboard__string" title={discoveryKeyLabel(string.absoluteOpenPitch)}>
              {string.openNote}<small>{string.number}</small>
            </span>
            {Array.from({ length: 13 }, (_, fret) => {
              const midi = string.absoluteOpenPitch + fret;
              const held = heldNotes.has(midi);
              const selected = frets[string.number] === fret;
              return (
                <button
                  type="button"
                  key={fret}
                  className="discovery-fret"
                  aria-label={`${t("String")} ${string.number}, ${t("Fret")} ${fret}, ${discoveryKeyLabel(midi)}`}
                  aria-pressed={selected || held}
                  data-held={held ? "true" : "false"}
                  data-string={string.number}
                  data-fret={fret}
                  onClick={() => onToggle(string.number, fret)}
                >
                  <span>{selected || held || fret === 0 ? discoveryNoteName(midi) : "·"}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

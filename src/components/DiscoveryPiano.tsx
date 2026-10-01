import { useT } from "../i18n/I18nContext";
import { discoveryKeyLabel, discoveryNoteName } from "../lib/discovery/chordIdentification";
import { COMPUTER_NOTE_KEYS } from "../lib/discovery/noteInput";

interface DiscoveryPianoProps {
  readonly selectedNotes: ReadonlySet<number>;
  readonly heldNotes: ReadonlySet<number>;
  readonly octave: number;
  readonly keyboardEnabled: boolean;
  readonly onToggle: (midi: number) => void;
}

const WHITE_PITCHES = [0, 2, 4, 5, 7, 9, 11];

export default function DiscoveryPiano({ selectedNotes, heldNotes, octave, keyboardEnabled, onToggle }: DiscoveryPianoProps) {
  const t = useT();
  const soundingOctave = heldNotes.size > 0 ? Math.floor(Math.min(...heldNotes) / 12) - 1 : octave;
  const startOctave = Math.max(-1, Math.min(7, soundingOctave - 1));
  const firstMidi = (startOctave + 1) * 12;
  const notes = Array.from({ length: Math.min(37, 128 - firstMidi) }, (_, index) => firstMidi + index);
  const whites = notes.filter((midi) => WHITE_PITCHES.includes(midi % 12));
  const blacks = notes.filter((midi) => !WHITE_PITCHES.includes(midi % 12));
  const keyboardLabels = new Map(Object.entries(COMPUTER_NOTE_KEYS)
    .map(([code, offset]) => [(octave + 1) * 12 + offset, code.replace("Key", "")]));

  const key = (midi: number, black: boolean, index: number) => {
    const left = black
      ? (whites.filter((white) => white < midi).length - 0.32) * 100 / whites.length
      : index * 100 / whites.length;
    return (
      <button
        key={midi}
        type="button"
        aria-label={discoveryKeyLabel(midi)}
        aria-pressed={selectedNotes.has(midi) || heldNotes.has(midi)}
        data-midi={midi}
        data-held={heldNotes.has(midi) ? "true" : "false"}
        className={`discovery-key ${black ? "discovery-key--black" : "discovery-key--white"}`}
        style={{ left: `${left}%`, width: `${(black ? 0.64 : 1) * 100 / whites.length}%` }}
        onClick={() => onToggle(midi)}
      >
        <span className="discovery-key__legend">
          <span className="discovery-key__note">{discoveryNoteName(midi, !black)}</span>
          {keyboardEnabled && keyboardLabels.has(midi)
            ? <kbd className="discovery-key__shortcut">{keyboardLabels.get(midi)}</kbd> : null}
        </span>
      </button>
    );
  };

  return (
    <div className="discovery-instrument-scroll" data-testid="discovery-piano-scroller">
      <div role="group" aria-label={t("Discovery piano")} className="discovery-piano">
        {whites.map((midi, index) => key(midi, false, index))}
        {blacks.map((midi, index) => key(midi, true, index))}
      </div>
    </div>
  );
}

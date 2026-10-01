export interface DiscoveredChord {
  readonly symbol: string;
  readonly root: number;
  readonly bass: number;
  readonly quality: string;
  readonly intervals: readonly number[];
  readonly kind: "exact" | "slash";
  readonly inversion: number;
}

interface ChordFormula {
  readonly suffix: string;
  readonly quality: string;
  readonly intervals: readonly number[];
  readonly priority: number;
}

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function discoveryNoteName(midi: number, withOctave = false, preferFlats = true): string {
  const name = (preferFlats ? FLAT_NAMES : SHARP_NAMES)[((midi % 12) + 12) % 12];
  return `${name}${withOctave ? Math.floor(midi / 12) - 1 : ""}`;
}

export function discoveryKeyLabel(midi: number): string {
  const flat = discoveryNoteName(midi, true);
  const sharp = discoveryNoteName(midi, true, false);
  return flat === sharp ? flat : `${flat} / ${sharp}`;
}

function formula(suffix: string, quality: string, intervals: readonly number[], priority = 90): ChordFormula {
  return { suffix, quality, intervals, priority };
}

// Pitch-class formulas deliberately do not depend on the diagram dictionary.
const BASE_FORMULAS: readonly ChordFormula[] = [
  formula("", "Major triad", [0, 4, 7], 100),
  formula("min", "Minor triad", [0, 3, 7], 100),
  formula("dim", "Diminished triad", [0, 3, 6], 95),
  formula("aug", "Augmented triad", [0, 4, 8], 95),
  formula("sus2", "Suspended second", [0, 2, 7], 92),
  formula("sus4", "Suspended fourth", [0, 5, 7], 92),
  formula("5", "Power chord", [0, 7], 80),
  formula("6", "Major sixth chord", [0, 4, 7, 9], 90),
  formula("min6", "Minor sixth chord", [0, 3, 7, 9], 90),
  formula("7", "Dominant seventh", [0, 4, 7, 10], 96),
  formula("maj7", "Major seventh", [0, 4, 7, 11], 96),
  formula("min7", "Minor seventh", [0, 3, 7, 10], 96),
  formula("min(maj7)", "Minor major seventh", [0, 3, 7, 11], 89),
  formula("dim7", "Diminished seventh", [0, 3, 6, 9], 91),
  formula("min7b5", "Half-diminished seventh", [0, 3, 6, 10], 94),
  formula("7#5", "Augmented dominant seventh", [0, 4, 8, 10], 85),
  formula("maj7#5", "Augmented major seventh", [0, 4, 8, 11], 85),
  formula("7b5", "Dominant flat fifth", [0, 4, 6, 10], 85),
  formula("7sus4", "Suspended dominant seventh", [0, 5, 7, 10], 87),
  formula("7sus2", "Suspended dominant second", [0, 2, 7, 10], 82),
  formula("add9", "Added ninth", [0, 2, 4, 7]),
  formula("min(add9)", "Minor added ninth", [0, 2, 3, 7]),
  formula("add11", "Added eleventh", [0, 4, 5, 7], 83),
  formula("min(add11)", "Minor added eleventh", [0, 3, 5, 7], 83),
  formula("6/9", "Sixth added ninth", [0, 2, 4, 7, 9], 87),
  formula("min6/9", "Minor sixth added ninth", [0, 2, 3, 7, 9], 87),
  formula("9", "Dominant ninth", [0, 2, 4, 7, 10], 92),
  formula("maj9", "Major ninth", [0, 2, 4, 7, 11], 92),
  formula("min9", "Minor ninth", [0, 2, 3, 7, 10], 92),
  formula("min(maj9)", "Minor major ninth", [0, 2, 3, 7, 11], 85),
  formula("9sus4", "Suspended dominant ninth", [0, 2, 5, 7, 10], 83),
  formula("11", "Dominant eleventh", [0, 2, 4, 5, 7, 10], 84),
  formula("min11", "Minor eleventh", [0, 2, 3, 5, 7, 10], 87),
  formula("maj11", "Major eleventh", [0, 2, 4, 5, 7, 11], 82),
  formula("13", "Dominant thirteenth", [0, 2, 4, 7, 9, 10], 88),
  formula("13", "Dominant thirteenth", [0, 2, 4, 5, 7, 9, 10], 86),
  formula("maj13", "Major thirteenth", [0, 2, 4, 7, 9, 11], 85),
  formula("min13", "Minor thirteenth", [0, 2, 3, 5, 7, 9, 10], 85),
  formula("7b9", "Dominant flat ninth", [0, 1, 4, 7, 10], 86),
  formula("7#9", "Dominant sharp ninth", [0, 3, 4, 7, 10], 86),
  formula("7#11", "Dominant sharp eleventh", [0, 4, 6, 7, 10], 85),
  formula("9#11", "Dominant ninth sharp eleventh", [0, 2, 4, 6, 7, 10], 85),
  formula("maj7#11", "Major seventh sharp eleventh", [0, 4, 6, 7, 11], 85),
  formula("maj9#11", "Major ninth sharp eleventh", [0, 2, 4, 6, 7, 11], 85),
  formula("7b13", "Dominant flat thirteenth", [0, 4, 7, 8, 10], 85),
  formula("7b9b13", "Dominant flat ninth flat thirteenth", [0, 1, 4, 7, 8, 10], 82),
];

const FORMULAS = [
  ...BASE_FORMULAS,
  ...BASE_FORMULAS.filter((item) => item.intervals.length >= 4 && item.intervals.includes(7))
    .map((item) => ({
      ...item,
      suffix: `${item.suffix}(no5)`,
      intervals: item.intervals.filter((interval) => interval !== 7),
      priority: item.priority - 20,
    })),
];

export function normalizeDiscoveryNotes(notes: readonly number[]): number[] {
  if (notes.some((midi) => !Number.isInteger(midi) || midi < 0 || midi > 127)) {
    throw new RangeError("Discovery notes must be MIDI integers from 0 to 127");
  }
  return [...new Set(notes)].sort((a, b) => a - b);
}

export function identifyChords(notes: readonly number[]): DiscoveredChord[] {
  const sorted = normalizeDiscoveryNotes(notes);
  if (sorted.length === 0) return [];
  const pitchClasses = [...new Set(sorted.map((midi) => midi % 12))];
  if (pitchClasses.length < 2) return [];
  const bass = sorted[0] % 12;
  const matches: Array<DiscoveredChord & { score: number }> = [];

  const findMatches = (pitches: readonly number[], kind: "exact" | "slash") => {
    for (const root of pitches) {
      const intervals = pitches.map((pitch) => (pitch - root + 12) % 12).sort((a, b) => a - b);
      for (const item of FORMULAS) {
        if (item.intervals.length !== intervals.length
          || !item.intervals.every((interval, index) => interval === intervals[index])) continue;
        const bassInterval = (bass - root + 12) % 12;
        const inversion = item.intervals.indexOf(bassInterval);
        const bassWeight = bass === root ? 40
          : bassInterval === 3 || bassInterval === 4 ? 18
            : bassInterval === 7 ? 10
              : -12;
        const score = item.priority + (kind === "exact" ? bassWeight : -18);
        matches.push({
          symbol: `${discoveryNoteName(root)}${item.suffix}${bass === root ? "" : `/${discoveryNoteName(bass)}`}`,
          root,
          bass,
          quality: item.quality,
          intervals: item.intervals,
          inversion,
          kind,
          score,
        });
      }
    }
  };

  findMatches(pitchClasses, "exact");
  // Only the actual lowest pitch can be a separate pedal/slash bass. Every
  // other pitch must still be accounted for by the named upper chord.
  if (pitchClasses.length >= 4) findMatches(pitchClasses.filter((pitch) => pitch !== bass), "slash");
  const seen = new Set<string>();
  return matches.sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
    .filter((match) => {
      if (seen.has(match.symbol)) return false;
      seen.add(match.symbol);
      return true;
    })
    .slice(0, 4)
    .map(({ score: _score, ...match }) => match);
}

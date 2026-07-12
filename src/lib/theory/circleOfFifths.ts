import { spellScaleNotes } from "./scaleBasics";

export interface CircleKey {
  readonly id: string;
  readonly major: string;
  readonly builderKey: string;
  readonly relativeMinor: string;
  readonly signature: string;
}

export const CIRCLE_KEYS: ReadonlyArray<CircleKey> = Object.freeze([
  { id: "C", major: "C major", builderKey: "C", relativeMinor: "A minor", signature: "No sharps or flats" },
  { id: "G", major: "G major", builderKey: "G", relativeMinor: "E minor", signature: "1 sharp" },
  { id: "D", major: "D major", builderKey: "D", relativeMinor: "B minor", signature: "2 sharps" },
  { id: "A", major: "A major", builderKey: "A", relativeMinor: "F# minor", signature: "3 sharps" },
  { id: "E", major: "E major", builderKey: "E", relativeMinor: "C# minor", signature: "4 sharps" },
  { id: "B", major: "B major", builderKey: "B", relativeMinor: "G# minor", signature: "5 sharps" },
  { id: "F# / Gb", major: "F# / Gb major", builderKey: "F#", relativeMinor: "D# / Eb minor", signature: "6 sharps / 6 flats" },
  { id: "Db", major: "Db major", builderKey: "Db", relativeMinor: "Bb minor", signature: "5 flats" },
  { id: "Ab", major: "Ab major", builderKey: "Ab", relativeMinor: "F minor", signature: "4 flats" },
  { id: "Eb", major: "Eb major", builderKey: "Eb", relativeMinor: "C minor", signature: "3 flats" },
  { id: "Bb", major: "Bb major", builderKey: "Bb", relativeMinor: "G minor", signature: "2 flats" },
  { id: "F", major: "F major", builderKey: "F", relativeMinor: "D minor", signature: "1 flat" },
].map((key) => Object.freeze(key)));

const MAJOR_QUALITIES = Object.freeze(["", "m", "m", "", "", "m", "dim"]);

export function circleKeyAt(index: number): CircleKey {
  const normalized = ((index % CIRCLE_KEYS.length) + CIRCLE_KEYS.length) % CIRCLE_KEYS.length;
  return CIRCLE_KEYS[normalized];
}

export function adjacentCircleKeys(index: number): readonly [CircleKey, CircleKey] {
  return Object.freeze([circleKeyAt(index - 1), circleKeyAt(index + 1)]);
}

export function diatonicChordsFor(key: CircleKey): ReadonlyArray<string> {
  return Object.freeze(
    spellScaleNotes(key.builderKey, "major").map(
      (note, index) => `${note}${MAJOR_QUALITIES[index]}`,
    ),
  );
}

export function builderProgressionFor(key: CircleKey): ReadonlyArray<string> {
  const chords = diatonicChordsFor(key);
  return Object.freeze([chords[0], chords[3], chords[4]]);
}

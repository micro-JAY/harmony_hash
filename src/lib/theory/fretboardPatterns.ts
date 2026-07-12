import type { ScaleType } from "../types";
import type { ChordTone } from "./chordTones";
import type {
  FretboardInstrument,
  FretboardPosition,
  FretboardStringRow,
  FretboardTuningId,
} from "./fretboard";
import { pitchClassOf, scaleIntervalsFor } from "./scaleBasics";

export type FretboardPatternFamily = "all" | "caged" | "three-nps";
export type CagedFormId = "c" | "a" | "g" | "e" | "d";
export type ThreeNpsStartDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface FretboardPatternSelection {
  readonly family: FretboardPatternFamily;
  readonly cagedForm: CagedFormId;
  readonly threeNpsStartDegree: ThreeNpsStartDegree;
}

export interface FretboardPatternEnvelope {
  readonly stringNumber: number;
  readonly minFret: number;
  readonly maxFret: number;
}

export interface FretboardPatternResult {
  readonly requestedFamily: FretboardPatternFamily;
  readonly effectiveFamily: FretboardPatternFamily;
  readonly available: boolean;
  readonly reason?: string;
  readonly label: string;
  readonly positionKeys: ReadonlyArray<string>;
  readonly envelopes: ReadonlyArray<FretboardPatternEnvelope>;
  readonly rootAnchorKeys: ReadonlyArray<string>;
}

export interface DecoratedFretboardPosition {
  readonly key: string;
  readonly position: FretboardPosition;
  readonly isPatternTone: boolean;
  readonly chordTone?: ChordTone;
  readonly isChordTone: boolean;
  readonly isInScale: boolean;
}

export const PATTERN_COMPATIBILITY_REASON = "Patterns currently require Standard six-string guitar";

export const CAGED_FORM_OPTIONS: ReadonlyArray<Readonly<{ id: CagedFormId; label: string }>> =
  Object.freeze([
    Object.freeze({ id: "c", label: "C form" }),
    Object.freeze({ id: "a", label: "A form" }),
    Object.freeze({ id: "g", label: "G form" }),
    Object.freeze({ id: "e", label: "E form" }),
    Object.freeze({ id: "d", label: "D form" }),
  ]);

export const THREE_NPS_OPTIONS: ReadonlyArray<Readonly<{
  id: ThreeNpsStartDegree;
  label: string;
}>> = Object.freeze(
  Array.from({ length: 7 }, (_, index) => Object.freeze({
    id: (index + 1) as ThreeNpsStartDegree,
    label: `Starts on degree ${index + 1}`,
  })),
);

interface CagedTemplate {
  readonly id: CagedFormId;
  readonly rootPitchClass: number;
  readonly anchors: ReadonlyArray<Readonly<{ stringNumber: number; fret: number }>>;
  readonly envelopes: ReadonlyArray<FretboardPatternEnvelope>;
}

function frozenEnvelope(stringNumber: number, minFret: number, maxFret: number) {
  return Object.freeze({ stringNumber, minFret, maxFret });
}

function freezeTemplate(
  id: CagedFormId,
  rootName: string,
  anchors: ReadonlyArray<Readonly<{ stringNumber: number; fret: number }>>,
  bounds: ReadonlyArray<readonly [number, number, number]>,
): CagedTemplate {
  return Object.freeze({
    id,
    rootPitchClass: pitchClassOf(rootName),
    anchors: Object.freeze(anchors.map((anchor) => Object.freeze({ ...anchor }))),
    envelopes: Object.freeze(bounds.map(([stringNumber, minFret, maxFret]) =>
      frozenEnvelope(stringNumber, minFret, maxFret),
    )),
  });
}

const CAGED_TEMPLATES: Readonly<Record<CagedFormId, CagedTemplate>> = Object.freeze({
  c: freezeTemplate("c", "C", [{ stringNumber: 5, fret: 3 }, { stringNumber: 2, fret: 1 }], [
    [6, 0, 3], [5, 0, 3], [4, 0, 3], [3, 0, 4], [2, 0, 3], [1, 0, 3],
  ]),
  a: freezeTemplate("a", "A", [{ stringNumber: 5, fret: 0 }, { stringNumber: 3, fret: 2 }], [
    [6, -1, 3], [5, -1, 3], [4, -1, 4], [3, -1, 3], [2, -1, 3], [1, -1, 3],
  ]),
  g: freezeTemplate("g", "G", [
    { stringNumber: 6, fret: 3 }, { stringNumber: 3, fret: 0 }, { stringNumber: 1, fret: 3 },
  ], [
    [6, 0, 4], [5, 0, 4], [4, 0, 4], [3, 0, 4], [2, 0, 4], [1, 0, 4],
  ]),
  e: freezeTemplate("e", "E", [
    { stringNumber: 6, fret: 0 }, { stringNumber: 4, fret: 2 }, { stringNumber: 1, fret: 0 },
  ], [
    [6, -1, 2], [5, -1, 2], [4, -1, 2], [3, -1, 2], [2, -1, 2], [1, -1, 2],
  ]),
  d: freezeTemplate("d", "D", [{ stringNumber: 4, fret: 0 }, { stringNumber: 2, fret: 3 }], [
    [6, -1, 3], [5, -1, 3], [4, -1, 3], [3, -1, 3], [2, -1, 4], [1, -1, 3],
  ]),
});

function positionKey(stringNumber: number, fret: number): string {
  return `${stringNumber}:${fret}`;
}

function maxFretFor(rows: ReadonlyArray<FretboardStringRow>): number {
  return rows[0]?.positions.at(-1)?.fret ?? 0;
}

function allScaleKeys(rows: ReadonlyArray<FretboardStringRow>): ReadonlyArray<string> {
  return Object.freeze(rows.flatMap((row) => row.positions
    .filter((position) => position.isScaleTone)
    .map((position) => positionKey(position.stringNumber, position.fret))));
}

function allEnvelopes(rows: ReadonlyArray<FretboardStringRow>): ReadonlyArray<FretboardPatternEnvelope> {
  const maxFret = maxFretFor(rows);
  return Object.freeze(rows.map((row) => frozenEnvelope(row.string.number, 0, maxFret)));
}

function allResult(
  rows: ReadonlyArray<FretboardStringRow>,
  requestedFamily: FretboardPatternFamily,
  reason?: string,
): FretboardPatternResult {
  return Object.freeze({
    requestedFamily,
    effectiveFamily: "all" as const,
    available: reason === undefined,
    ...(reason ? { reason } : {}),
    label: "All positions",
    positionKeys: allScaleKeys(rows),
    envelopes: allEnvelopes(rows),
    rootAnchorKeys: Object.freeze([]),
  });
}

function buildCagedResult(
  rows: ReadonlyArray<FretboardStringRow>,
  keyName: string,
  form: CagedFormId,
): FretboardPatternResult {
  const template = CAGED_TEMPLATES[form];
  const rootPitchClass = pitchClassOf(keyName);
  if (rootPitchClass < 0) throw new Error(`Unrecognized fretboard root: "${keyName}"`);
  const maxFret = maxFretFor(rows);
  const normalizedShift = (rootPitchClass - template.rootPitchClass + 12) % 12;
  const shifts = [-24, -12, 0, 12].map((octave) => normalizedShift + octave);
  const candidates = shifts.map((shift) => {
    const shiftedAnchors = template.anchors.map((anchor) => ({
      stringNumber: anchor.stringNumber,
      fret: anchor.fret + shift,
    }));
    const shiftedEnvelopes = template.envelopes.map((envelope) => ({
      stringNumber: envelope.stringNumber,
      minFret: envelope.minFret + shift,
      maxFret: envelope.maxFret + shift,
    }));
    const visibleAnchors = shiftedAnchors.filter((anchor) =>
      anchor.fret >= 0 && anchor.fret <= maxFret,
    );
    const clipped = shiftedEnvelopes.reduce((sum, envelope) =>
      sum + Math.max(0, -envelope.minFret) + Math.max(0, envelope.maxFret - maxFret), 0,
    );
    const coverage = shiftedEnvelopes.reduce((sum, envelope) =>
      sum + Math.max(0, Math.min(maxFret, envelope.maxFret) - Math.max(0, envelope.minFret) + 1), 0,
    );
    return { shift, shiftedAnchors, shiftedEnvelopes, visibleAnchors, clipped, coverage };
  }).sort((left, right) =>
    right.visibleAnchors.length - left.visibleAnchors.length
    || right.coverage - left.coverage
    || left.clipped - right.clipped
    || left.shift - right.shift,
  );
  const selected = candidates[0];
  if (!selected || selected.visibleAnchors.length === 0) {
    return allResult(rows, "caged", "This CAGED form does not fit frets 0–15");
  }
  const envelopes = Object.freeze(selected.shiftedEnvelopes.map((envelope) => frozenEnvelope(
    envelope.stringNumber,
    Math.max(0, envelope.minFret),
    Math.min(maxFret, envelope.maxFret),
  )));
  const envelopeByString = new Map(envelopes.map((envelope) => [envelope.stringNumber, envelope]));
  const positionKeys = Object.freeze(rows.flatMap((row) => {
    const envelope = envelopeByString.get(row.string.number);
    if (!envelope) return [];
    return row.positions
      .filter((position) => position.isScaleTone
        && position.fret >= envelope.minFret
        && position.fret <= envelope.maxFret)
      .map((position) => positionKey(position.stringNumber, position.fret));
  }));
  return Object.freeze({
    requestedFamily: "caged" as const,
    effectiveFamily: "caged" as const,
    available: true,
    label: `${form.toUpperCase()} form`,
    positionKeys,
    envelopes,
    rootAnchorKeys: Object.freeze(selected.visibleAnchors.map((anchor) =>
      positionKey(anchor.stringNumber, anchor.fret),
    )),
  });
}

interface ThreeNpsCandidate {
  readonly positions: ReadonlyArray<Readonly<{
    stringNumber: number;
    fret: number;
    absolutePitch: number;
  }>>;
  readonly span: number;
  readonly shift: number;
  readonly minimumFret: number;
  readonly serialized: string;
}

function buildThreeNpsCandidate(
  rowsLowToHigh: ReadonlyArray<FretboardStringRow>,
  initialFret: number,
  scalePitchClasses: ReadonlySet<number>,
): ThreeNpsCandidate | null {
  const positions: Array<{ stringNumber: number; fret: number; absolutePitch: number }> = [];
  let previousPitch = -Infinity;
  for (let rowIndex = 0; rowIndex < rowsLowToHigh.length; rowIndex += 1) {
    const row = rowsLowToHigh[rowIndex];
    const candidates = row.positions
      .map((position) => ({
        stringNumber: position.stringNumber,
        fret: position.fret,
        pitchClass: position.pitchClass,
        absolutePitch: row.string.absoluteOpenPitch + position.fret,
      }))
      .filter((position) => scalePitchClasses.has(position.pitchClass)
        && position.absolutePitch > previousPitch
        && (rowIndex !== 0 || position.fret >= initialFret));
    const selected = rowIndex === 0
      ? candidates.filter((position) => position.fret >= initialFret).slice(0, 3)
      : candidates.slice(0, 3);
    if (selected.length !== 3 || (rowIndex === 0 && selected[0].fret !== initialFret)) return null;
    positions.push(...selected);
    previousPitch = selected[2].absolutePitch;
  }
  const frets = positions.map((position) => position.fret);
  const firstFrets = rowsLowToHigh.map((row) =>
    positions.find((position) => position.stringNumber === row.string.number)?.fret ?? 0,
  );
  const adjacentShift = firstFrets.slice(1).reduce((sum, fret, index) =>
    sum + Math.abs(fret - firstFrets[index]), 0,
  );
  const frozenPositions = Object.freeze(positions.map((position) => Object.freeze(position)));
  return {
    positions: frozenPositions,
    span: Math.max(...frets) - Math.min(...frets),
    shift: adjacentShift,
    minimumFret: Math.min(...frets),
    serialized: positions.map((position) => `${position.stringNumber}:${position.fret}`).join("|"),
  };
}

function buildThreeNpsResult(
  rows: ReadonlyArray<FretboardStringRow>,
  keyName: string,
  scaleType: ScaleType,
  startDegree: ThreeNpsStartDegree,
): FretboardPatternResult {
  const rootPitchClass = pitchClassOf(keyName);
  if (rootPitchClass < 0) throw new Error(`Unrecognized fretboard root: "${keyName}"`);
  const intervals = scaleIntervalsFor(scaleType);
  const scalePitchClasses = new Set(intervals.map((interval) => (rootPitchClass + interval) % 12));
  const targetPitchClass = (rootPitchClass + intervals[startDegree - 1]) % 12;
  const rowsLowToHigh = [...rows].sort((left, right) => right.string.number - left.string.number);
  const lowString = rowsLowToHigh[0];
  const initialFrets = lowString.positions
    .filter((position) => position.pitchClass === targetPitchClass)
    .map((position) => position.fret);
  const candidates = initialFrets
    .map((initialFret) => buildThreeNpsCandidate(rowsLowToHigh, initialFret, scalePitchClasses))
    .filter((candidate): candidate is ThreeNpsCandidate => candidate !== null)
    .sort((left, right) => left.span - right.span
      || left.shift - right.shift
      || left.minimumFret - right.minimumFret
      || left.serialized.localeCompare(right.serialized));
  const selected = candidates[0];
  if (!selected) {
    return allResult(rows, "three-nps", "This 3NPS position does not fit frets 0–15");
  }
  const envelopes = Object.freeze(rows.map((row) => {
    const rowFrets = selected.positions
      .filter((position) => position.stringNumber === row.string.number)
      .map((position) => position.fret);
    return frozenEnvelope(row.string.number, Math.min(...rowFrets), Math.max(...rowFrets));
  }));
  return Object.freeze({
    requestedFamily: "three-nps" as const,
    effectiveFamily: "three-nps" as const,
    available: true,
    label: `Starts on degree ${startDegree}`,
    positionKeys: Object.freeze(selected.positions.map((position) =>
      positionKey(position.stringNumber, position.fret),
    )),
    envelopes,
    rootAnchorKeys: Object.freeze([]),
  });
}

export function buildFretboardPattern(
  rows: ReadonlyArray<FretboardStringRow>,
  instrument: FretboardInstrument,
  tuningId: FretboardTuningId,
  keyName: string,
  scaleType: ScaleType,
  selection: FretboardPatternSelection,
): FretboardPatternResult {
  if (selection.family === "all") return allResult(rows, "all");
  if (instrument !== "guitar" || tuningId !== "guitar-standard" || rows.length !== 6) {
    return allResult(rows, selection.family, PATTERN_COMPATIBILITY_REASON);
  }
  if (selection.family === "caged") {
    return buildCagedResult(rows, keyName, selection.cagedForm);
  }
  return buildThreeNpsResult(rows, keyName, scaleType, selection.threeNpsStartDegree);
}

export function decorateFretboardPositions(
  rows: ReadonlyArray<FretboardStringRow>,
  pattern: FretboardPatternResult,
  chordTones: ReadonlyArray<ChordTone> = [],
): ReadonlyArray<DecoratedFretboardPosition> {
  const patternKeys = new Set(pattern.positionKeys);
  const envelopeByString = new Map(pattern.envelopes.map((envelope) => [
    envelope.stringNumber,
    envelope,
  ]));
  const toneByPitchClass = new Map(chordTones.map((tone) => [tone.pitchClass, tone]));
  return Object.freeze(rows.flatMap((row) => row.positions.flatMap((position) => {
    const key = positionKey(position.stringNumber, position.fret);
    const isPatternTone = patternKeys.has(key);
    const chordTone = toneByPitchClass.get(position.pitchClass);
    const envelope = envelopeByString.get(position.stringNumber);
    const outsideToneVisible = chordTone !== undefined
      && !position.isScaleTone
      && (pattern.effectiveFamily === "all"
        || (envelope !== undefined
          && position.fret >= envelope.minFret
          && position.fret <= envelope.maxFret));
    if (!isPatternTone && !outsideToneVisible) return [];
    return [Object.freeze({
      key,
      position,
      isPatternTone,
      ...(chordTone ? { chordTone } : {}),
      isChordTone: chordTone !== undefined,
      isInScale: position.isScaleTone,
    })];
  })));
}

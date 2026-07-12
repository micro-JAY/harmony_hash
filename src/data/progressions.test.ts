import { describe, expect, test } from "vitest";
import libraryGuide from "../../docs/hh-library.md?raw";
import { lookupChord } from "../lib/chordData";
import { ALL_KEYS, transposeNumeralString } from "../lib/harmonyBrain";
import type { Progression, ScaleType } from "../lib/types";
import { PROGRESSION_LIBRARY } from "./progressions";

interface CatalogEntry {
  group: string;
  subgroup: string;
  progression: Progression;
  scaleType: ScaleType;
}

const entries: CatalogEntry[] = PROGRESSION_LIBRARY.flatMap((group) =>
  group.subgroups.flatMap((subgroup) =>
    subgroup.progressions.map((progression) => ({
      group: group.label,
      subgroup: subgroup.label,
      progression,
      scaleType: subgroup.scaleType ?? group.scaleType,
    })),
  ),
);

const transpositionCases = entries.flatMap((entry) =>
  ALL_KEYS.map((key) => ({ ...entry, key: key.value })),
);

const documentedGroups = new Map([
  ["1. Major Key Progressions (Bright, Soulful, Standard)", "Major"],
  ["2. Minor Tonality Progressions (Moody, Dark, Emotional)", "Minor"],
  ['3. Modal & "Vibe" Progressions (Exotic, Floating)', "Modal"],
  ['4. Advanced "Crash Out" & Passing Progressions', "Advanced"],
]);

const documentedScaleTypes = new Map<string, ScaleType>([
  ["The Foundations (Rock, Pop, Folk)", "major"],
  ["Jazz & R&B Fundamentals", "major"],
  ["Gospel & Soul Movement", "major"],
  ["The Essentials (Pop & Rock)", "natural_minor"],
  ["R&B & Soul Minor Loops", "natural_minor"],
  ["Harmonic/Classical Minor (Strong Pull)", "harmonic_minor"],
  ["Jazz Minor (Sophisticated)", "harmonic_minor"],
  ['Dorian (The "Cool" Funk)', "dorian"],
  ['Mixolydian (The "Greasy" Rock/Soul)', "mixolydian"],
  ['Lydian (The "Ethereal" Dream)', "lydian"],
  ['Phrygian (The "Aggressive" Dark)', "phrygian"],
  ['Locrian (The "Forbidden" / Unstable)', "phrygian"],
  ["Chromatic & Secondary Dominant Movement", "major"],
]);

describe("progression library", () => {
  test("contains both Common Progressions examples named in the roadmap", () => {
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          progression: { name: "The Plagal Loop", numerals: "I – IV – I – V" },
        }),
        expect.objectContaining({
          progression: { name: "The 2-5-1 (The King)", numerals: "ii – V – I" },
        }),
      ]),
    );
  });

  test("uses a unique label for every preset", () => {
    const names = entries.map(({ progression }) => progression.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("keeps the documented library synchronized with runtime data", () => {
    let group = "";
    let subgroup = "";
    const documentedEntries = libraryGuide.split("\n").flatMap((line) => {
      if (line.startsWith("## ")) {
        group = documentedGroups.get(line.slice(3)) ?? "";
        subgroup = group === "Advanced" ? "Chromatic & Secondary Dominant Movement" : "";
        return [];
      }
      if (line.startsWith("### ")) {
        subgroup = line.slice(4);
        return [];
      }

      const match = line.match(/^- \*\*(.+):\*\* (.+)$/);
      if (!match) return [];
      const scaleType = documentedScaleTypes.get(subgroup);
      if (!group) throw new Error(`Missing documented group for ${match[1]}`);
      if (!scaleType) throw new Error(`Missing documented scale type for ${subgroup}`);
      return [{
        group,
        subgroup,
        name: match[1],
        numerals: match[2].replace(/ \*\(.+\)\*$/, ""),
        scaleType,
      }];
    });
    const runtimeEntries = entries
      .map(({ group, subgroup, progression, scaleType }) => ({
        group,
        subgroup,
        name: progression.name,
        numerals: progression.numerals,
        scaleType,
      }));
    const byLocationAndName = (entry: typeof runtimeEntries[number]) =>
      `${entry.group}/${entry.subgroup}/${entry.name}`;

    expect(documentedEntries.sort((left, right) => byLocationAndName(left).localeCompare(byLocationAndName(right))))
      .toEqual(runtimeEntries.sort((left, right) => byLocationAndName(left).localeCompare(byLocationAndName(right))));
  });

  test.each(transpositionCases)(
    "$group / $subgroup / $progression.name resolves in $key",
    ({ progression, scaleType, key }) => {
      const chordNames = transposeNumeralString(progression.numerals, key, scaleType);
      const unresolved = chordNames.filter((chordName) => !lookupChord(chordName));

      expect(unresolved).toEqual([]);
    },
  );
});

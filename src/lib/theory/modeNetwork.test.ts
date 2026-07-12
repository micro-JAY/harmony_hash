import { describe, expect, it } from "vitest";
import { pitchClassOf } from "./scaleBasics";
import {
  buildModeNetwork,
  characteristicIntervalFor,
  MODE_FAMILIES,
  modeFamilyDefinitionFor,
  type ModeFamilyId,
} from "./modeNetwork";
import { scaleIntervalFormulaFor } from "./scaleBasics";

describe("mode relationship network", () => {
  it("publishes four immutable seven-mode families", () => {
    expect(MODE_FAMILIES.map((family) => family.id)).toEqual([
      "major", "natural_minor", "harmonic_minor", "melodic_minor",
    ]);
    for (const family of MODE_FAMILIES) {
      expect(modeFamilyDefinitionFor(family.id).members).toHaveLength(7);
      expect(Object.isFrozen(modeFamilyDefinitionFor(family.id))).toBe(true);
      expect(Object.isFrozen(modeFamilyDefinitionFor(family.id).members)).toBe(true);
    }
    expect(() => modeFamilyDefinitionFor("unknown" as ModeFamilyId)).toThrow(RangeError);
  });

  it("builds the exact E harmonic-minor relative family", () => {
    const network = buildModeNetwork("E", "harmonic_minor", "relative");
    expect(network.nodes.map((node) => [node.root, node.scaleId])).toEqual([
      ["E", "harmonic_minor"],
      ["F#", "locrian_natural_6"],
      ["G", "ionian_sharp_5"],
      ["A", "dorian_sharp_4"],
      ["B", "phrygian_dominant"],
      ["C", "lydian_sharp_2"],
      ["D#", "altered_diminished"],
    ]);
    const focused = network.nodes[4];
    expect(focused.notes).toEqual(["B", "C", "D#", "E", "F#", "G", "A"]);
    expect(focused.steps).toEqual(["H", "1½", "H", "W", "H", "W", "W"]);
    expect(focused.characteristicInterval).toBe("Major third over a flat second");
    expect(focused.learning.useItOver).toContain("dominant flat-nine chords");
    expect(focused.learning.hearItIn).toBe("Misirlou — traditional");
  });

  it("keeps relative nodes on one pitch-class set", () => {
    const network = buildModeNetwork("E", "harmonic_minor", "relative");
    const signatures = network.nodes.map((node) =>
      node.notes.map(pitchClassOf).sort((left, right) => left - right).join(","),
    );
    expect(new Set(signatures).size).toBe(1);
  });

  it("keeps parallel roots fixed while formulas change", () => {
    const network = buildModeNetwork("E", "melodic_minor", "parallel");
    expect(new Set(network.nodes.map((node) => node.root))).toEqual(new Set(["E"]));
    expect(new Set(network.nodes.map((node) => node.notes.map(pitchClassOf).join(","))).size)
      .toBeGreaterThan(1);
  });

  it("covers natural-minor rotations and rejects invalid roots", () => {
    const network = buildModeNetwork("A", "natural_minor", "relative");
    expect(network.nodes.map((node) => node.label)).toEqual([
      "A Natural Minor (Aeolian)", "B Locrian", "C Major (Ionian)", "D Dorian",
      "E Phrygian", "F Lydian", "G Mixolydian",
    ]);
    expect(characteristicIntervalFor("lydian_dominant")).toBe(
      "Raised fourth with a flat seventh",
    );
    expect(() => buildModeNetwork("H", "major", "relative")).toThrow(/Unrecognized/);
  });

  it("formats altered scale degrees by diatonic function", () => {
    expect(scaleIntervalFormulaFor("locrian")).toEqual([
      "1", "b2", "b3", "4", "b5", "b6", "b7",
    ]);
    expect(scaleIntervalFormulaFor("ionian_sharp_5")).toEqual([
      "1", "2", "3", "4", "#5", "6", "7",
    ]);
    expect(scaleIntervalFormulaFor("lydian_sharp_2")).toEqual([
      "1", "#2", "3", "#4", "5", "6", "7",
    ]);
    expect(scaleIntervalFormulaFor("altered_diminished")).toEqual([
      "1", "b2", "b3", "b4", "b5", "b6", "bb7",
    ]);
  });
});

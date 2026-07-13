import {
  pitchClassOf,
  scaleIntervalsFor,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";
import {
  scaleLearningDefinitionFor,
  scaleStepLabels,
  type ScaleLearningDefinition,
} from "./scaleCatalog";

export const MODE_FAMILIES = Object.freeze([
  Object.freeze({ id: "major", label: "Major", baseScaleId: "major" } as const),
  Object.freeze({ id: "natural_minor", label: "Natural Minor", baseScaleId: "natural_minor" } as const),
  Object.freeze({ id: "harmonic_minor", label: "Harmonic Minor", baseScaleId: "harmonic_minor" } as const),
  Object.freeze({ id: "melodic_minor", label: "Melodic Minor", baseScaleId: "melodic_minor" } as const),
]);

export type ModeFamilyId = typeof MODE_FAMILIES[number]["id"];
export type ModeRelationship = "parallel" | "relative";

interface ModeFamilyMembers {
  readonly baseScaleId: ScaleFormulaType;
  readonly members: ReadonlyArray<ScaleFormulaType>;
}

export interface ModeNetworkNode {
  readonly id: string;
  readonly index: number;
  readonly root: string;
  readonly scaleId: ScaleFormulaType;
  readonly label: string;
  readonly notes: ReadonlyArray<string>;
  readonly intervals: ReadonlyArray<number>;
  readonly steps: ReadonlyArray<string>;
  readonly characteristicInterval: string;
  readonly learning: ScaleLearningDefinition;
}

export interface ModeNetwork {
  readonly familyId: ModeFamilyId;
  readonly familyLabel: string;
  readonly relationship: ModeRelationship;
  readonly root: string;
  readonly nodes: ReadonlyArray<ModeNetworkNode>;
}

const FAMILY_MEMBERS: Readonly<Record<ModeFamilyId, ModeFamilyMembers>> = Object.freeze({
  major: Object.freeze({
    baseScaleId: "major",
    members: Object.freeze(["major", "dorian", "phrygian", "lydian", "mixolydian", "natural_minor", "locrian"] as const satisfies ReadonlyArray<ScaleFormulaType>),
  }),
  natural_minor: Object.freeze({
    baseScaleId: "natural_minor",
    members: Object.freeze(["natural_minor", "locrian", "major", "dorian", "phrygian", "lydian", "mixolydian"] as const satisfies ReadonlyArray<ScaleFormulaType>),
  }),
  harmonic_minor: Object.freeze({
    baseScaleId: "harmonic_minor",
    members: Object.freeze([
      "harmonic_minor", "locrian_natural_6", "ionian_sharp_5", "dorian_sharp_4",
      "phrygian_dominant", "lydian_sharp_2", "altered_diminished",
    ] as const satisfies ReadonlyArray<ScaleFormulaType>),
  }),
  melodic_minor: Object.freeze({
    baseScaleId: "melodic_minor",
    members: Object.freeze([
      "melodic_minor", "dorian_flat_2", "lydian_augmented", "lydian_dominant",
      "mixolydian_flat_6", "locrian_natural_2", "altered",
    ] as const satisfies ReadonlyArray<ScaleFormulaType>),
  }),
});

const CHARACTERISTIC_INTERVALS: Readonly<Partial<Record<ScaleFormulaType, string>>> = Object.freeze({
  major: "Major seventh with a perfect fourth",
  dorian: "Natural sixth over a minor third",
  phrygian: "Flat second over a minor tonic",
  lydian: "Raised fourth over a major tonic",
  mixolydian: "Flat seventh over a major third",
  natural_minor: "Flat sixth and flat seventh",
  locrian: "Flat fifth over a minor third",
  harmonic_minor: "Raised seventh over a minor sixth",
  locrian_natural_6: "Natural sixth over a flat fifth",
  ionian_sharp_5: "Sharp fifth over a major third",
  dorian_sharp_4: "Raised fourth over a minor third",
  phrygian_dominant: "Major third over a flat second",
  lydian_sharp_2: "Augmented second with a raised fourth",
  altered_diminished: "Diminished seventh with a flat fifth",
  melodic_minor: "Major sixth and seventh over a minor third",
  dorian_flat_2: "Flat second with a natural sixth",
  lydian_augmented: "Raised fourth and sharp fifth",
  lydian_dominant: "Raised fourth with a flat seventh",
  mixolydian_flat_6: "Flat sixth over a dominant core",
  locrian_natural_2: "Natural second over a flat fifth",
  altered: "Flat fourth with altered fifths and ninths",
});

export function modeFamilyDefinitionFor(familyId: ModeFamilyId): ModeFamilyMembers {
  const definition = FAMILY_MEMBERS[familyId];
  if (!definition) throw new RangeError(`Unknown mode family: ${familyId}`);
  return definition;
}

export function characteristicIntervalFor(scaleId: ScaleFormulaType): string {
  return CHARACTERISTIC_INTERVALS[scaleId] ?? "Distinctive scale-degree color";
}

export function buildModeNetwork(
  root: string,
  familyId: ModeFamilyId,
  relationship: ModeRelationship,
): ModeNetwork {
  if (pitchClassOf(root) < 0) throw new Error(`Unrecognized mode-network root: "${root}"`);
  const family = modeFamilyDefinitionFor(familyId);
  const familyLabel = MODE_FAMILIES.find((candidate) => candidate.id === familyId)?.label;
  if (!familyLabel) throw new RangeError(`Unknown mode family label: ${familyId}`);
  const relativeRoots = spellScaleNotes(root, family.baseScaleId);
  const nodes = family.members.map((scaleId, index) => {
    const nodeRoot = relationship === "relative" ? relativeRoots[index] : root;
    const learning = scaleLearningDefinitionFor(scaleId);
    return Object.freeze({
      id: `${index}:${nodeRoot}:${scaleId}`,
      index,
      root: nodeRoot,
      scaleId,
      label: `${nodeRoot} ${learning.label}`,
      notes: spellScaleNotes(nodeRoot, scaleId),
      intervals: scaleIntervalsFor(scaleId),
      steps: scaleStepLabels(scaleId),
      characteristicInterval: characteristicIntervalFor(scaleId),
      learning,
    });
  });
  return Object.freeze({
    familyId,
    familyLabel,
    relationship,
    root,
    nodes: Object.freeze(nodes),
  });
}

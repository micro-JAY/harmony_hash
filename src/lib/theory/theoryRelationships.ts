import {
  buildModeNetwork,
  modeFamilyForScale,
  modeFamilyDefinitionFor,
} from "./modeNetwork";
import { scaleLearningDefinitionFor } from "./scaleCatalog";
import {
  pitchClassOf,
  scaleIntervalsFor,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";
import type { TheoryContext } from "./theoryContext";

export type TheoryRelationshipKind =
  | "fifths"
  | "relative_major_minor"
  | "modal_family"
  | "diatonic_function"
  | "secondary_dominant"
  | "distant";

export type RelationshipStrength = 1 | 2 | 3;
export type RelationshipStrengthLabel = "weak" | "medium" | "strong";
export type RelationshipDirection = "outbound" | "bidirectional";
export type TheoryNodeKind = "scale" | "key" | "chord";
export type TheoryNodeCluster = "context" | "keys" | "modes" | "chords";

export type RelationshipExplanationKey =
  | "theory.relationship.fifths"
  | "theory.relationship.relativeMajorMinor"
  | "theory.relationship.modalFamily"
  | "theory.relationship.diatonicFunction"
  | "theory.relationship.secondaryDominant"
  | "theory.relationship.distant";

export interface TheoryRelationshipNode {
  readonly id: string;
  readonly kind: TheoryNodeKind;
  readonly cluster: TheoryNodeCluster;
  readonly label: string;
  readonly root?: string;
  readonly scaleId?: ScaleFormulaType;
  readonly chordSymbol?: string;
  readonly functionKey?: string;
  readonly selected: boolean;
}

export interface TheoryRelationshipEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly kind: TheoryRelationshipKind;
  readonly strength: RelationshipStrength;
  readonly strengthLabel: RelationshipStrengthLabel;
  readonly direction: RelationshipDirection;
  readonly explanationKey: RelationshipExplanationKey;
}

export interface TheoryRelationshipCatalog {
  readonly context: TheoryContext;
  readonly selectedNodeId: string;
  readonly nodes: ReadonlyArray<TheoryRelationshipNode>;
  readonly edges: ReadonlyArray<TheoryRelationshipEdge>;
}

const CIRCLE_FUNCTION_ORDER = Object.freeze([
  "theory.function.tonic",
  "theory.function.predominant",
  "theory.function.dominant",
] as const);

const SHARP_NAMES = Object.freeze([
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
]);
const FLAT_NAMES = Object.freeze([
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
]);

const CLUSTER_ORDER: Readonly<Record<TheoryNodeCluster, number>> = Object.freeze({
  context: 0,
  keys: 1,
  modes: 2,
  chords: 3,
});

const RELATIONSHIP_ORDER: Readonly<Record<TheoryRelationshipKind, number>> = Object.freeze({
  fifths: 0,
  relative_major_minor: 1,
  modal_family: 2,
  diatonic_function: 3,
  secondary_dominant: 4,
  distant: 5,
});

const STRENGTH_LABELS: Readonly<Record<RelationshipStrength, RelationshipStrengthLabel>> =
  Object.freeze({ 1: "weak", 2: "medium", 3: "strong" });

const EXPLANATION_KEYS: Readonly<Record<TheoryRelationshipKind, RelationshipExplanationKey>> =
  Object.freeze({
    fifths: "theory.relationship.fifths",
    relative_major_minor: "theory.relationship.relativeMajorMinor",
    modal_family: "theory.relationship.modalFamily",
    diatonic_function: "theory.relationship.diatonicFunction",
    secondary_dominant: "theory.relationship.secondaryDominant",
    distant: "theory.relationship.distant",
  });

function noteName(pitchClass: number, preferFlats: boolean): string {
  const normalized = ((pitchClass % 12) + 12) % 12;
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[normalized];
}

function scaleNodeId(root: string, scaleId: ScaleFormulaType): string {
  return `scale:${root}:${scaleId}`;
}

function keyNodeId(root: string): string {
  return `key:${root}`;
}

function chordNodeId(chordSymbol: string): string {
  return `chord:${chordSymbol}`;
}

function relationshipEdge(
  kind: TheoryRelationshipKind,
  sourceId: string,
  targetId: string,
  strength: RelationshipStrength,
  direction: RelationshipDirection,
): TheoryRelationshipEdge {
  return Object.freeze({
    id: `edge:${kind}:${sourceId}->${targetId}`,
    sourceId,
    targetId,
    kind,
    strength,
    strengthLabel: STRENGTH_LABELS[strength],
    direction,
    explanationKey: EXPLANATION_KEYS[kind],
  });
}

function scaleNode(
  root: string,
  scaleId: ScaleFormulaType,
  cluster: TheoryNodeCluster,
  selected = false,
): TheoryRelationshipNode {
  return Object.freeze({
    id: scaleNodeId(root, scaleId),
    kind: "scale",
    cluster,
    label: `${root} ${scaleLearningDefinitionFor(scaleId).label}`,
    root,
    scaleId,
    selected,
  });
}

function addNode(
  nodes: Map<string, TheoryRelationshipNode>,
  node: TheoryRelationshipNode,
): void {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function addFifths(
  context: TheoryContext,
  selectedNodeId: string,
  nodes: Map<string, TheoryRelationshipNode>,
  edges: TheoryRelationshipEdge[],
): void {
  const tonic = pitchClassOf(context.root);
  const preferFlats = context.root.includes("b") || context.root.includes("f");
  for (const offset of [-7, 7]) {
    const root = noteName(tonic + offset, preferFlats);
    const targetId = keyNodeId(root);
    addNode(nodes, Object.freeze({
      id: targetId,
      kind: "key",
      cluster: "keys",
      label: `${root} major`,
      root,
      scaleId: "major",
      selected: false,
    }));
    edges.push(relationshipEdge("fifths", selectedNodeId, targetId, 3, "bidirectional"));
  }
}

function addRelativeMajorMinor(
  context: TheoryContext,
  selectedNodeId: string,
  nodes: Map<string, TheoryRelationshipNode>,
  edges: TheoryRelationshipEdge[],
): void {
  let relativeRoot: string | undefined;
  let relativeScaleId: ScaleFormulaType | undefined;
  if (context.scaleId === "major") {
    relativeRoot = spellScaleNotes(context.root, "major")[5];
    relativeScaleId = "natural_minor";
  } else if (context.scaleId === "natural_minor") {
    relativeRoot = spellScaleNotes(context.root, "natural_minor")[2];
    relativeScaleId = "major";
  }
  if (!relativeRoot || !relativeScaleId) return;

  const node = scaleNode(relativeRoot, relativeScaleId, "keys");
  addNode(nodes, node);
  edges.push(relationshipEdge(
    "relative_major_minor",
    selectedNodeId,
    node.id,
    3,
    "bidirectional",
  ));
}

function addModalFamily(
  context: TheoryContext,
  selectedNodeId: string,
  nodes: Map<string, TheoryRelationshipNode>,
  edges: TheoryRelationshipEdge[],
): void {
  const familyId = modeFamilyForScale(context.scaleId);
  if (!familyId) return;
  const family = modeFamilyDefinitionFor(familyId);
  const selectedIndex = family.members.indexOf(context.scaleId);
  if (selectedIndex < 0) return;
  if (context.selectedRelationshipId === "parallel") {
    const network = buildModeNetwork(context.root, familyId, "parallel");
    for (const member of network.nodes) {
      if (member.scaleId === context.scaleId) continue;
      const node = scaleNode(member.root, member.scaleId, "modes");
      addNode(nodes, node);
      edges.push(relationshipEdge(
        "modal_family",
        selectedNodeId,
        node.id,
        2,
        "bidirectional",
      ));
    }
    return;
  }
  const baseOffset = scaleIntervalsFor(family.baseScaleId)[selectedIndex];
  // A natural-root modal context often belongs to a flat-side parent key
  // (C Dorian -> Bb major, C Phrygian -> Ab major). Spelling that parent as
  // A# or G# creates double-sharp mode roots that the product deliberately
  // does not encode. Explicit sharp roots retain their sharp-side spelling.
  const explicitSharp = context.root.includes("#") || context.root.includes("s");
  const preferFlats = !explicitSharp
    && (context.root.includes("b") || context.root.includes("f") || baseOffset > 0);
  const basePitchClass = pitchClassOf(context.root) - baseOffset;
  const rootCandidates = [
    noteName(basePitchClass, preferFlats),
    noteName(basePitchClass, !preferFlats),
  ].map((baseRoot) => ({
    baseRoot,
    relativeRoots: spellScaleNotes(baseRoot, family.baseScaleId),
  }));
  const supportedRootCount = (roots: ReadonlyArray<string>) =>
    roots.filter((root) => pitchClassOf(root) >= 0).length;
  rootCandidates.sort((left, right) =>
    supportedRootCount(right.relativeRoots) - supportedRootCount(left.relativeRoots));
  const relativeRoots = rootCandidates[0].relativeRoots;
  for (const [index, scaleId] of family.members.entries()) {
    const root = relativeRoots[index];
    // Double-accidental roots are not selectable in Harmony Hash. Keep every
    // representable modal sibling instead of crashing the whole workspace.
    if (pitchClassOf(root) < 0) continue;
    if (
      pitchClassOf(root) === pitchClassOf(context.root)
      && scaleId === context.scaleId
    ) continue;
    const node = scaleNode(root, scaleId, "modes");
    addNode(nodes, node);
    edges.push(relationshipEdge("modal_family", selectedNodeId, node.id, 2, "bidirectional"));
  }
}

function triadSuffix(third: number, fifth: number): string {
  if (third === 3 && fifth === 6) return "dim";
  if (third === 3 && fifth === 7) return "m";
  if (third === 4 && fifth === 8) return "aug";
  return "";
}

function diatonicFunction(degree: number): { key: string; strength: RelationshipStrength } {
  if (degree === 1) return { key: "theory.function.tonic", strength: 3 };
  if (degree === 5 || degree === 7) {
    return { key: "theory.function.dominant", strength: degree === 5 ? 3 : 1 };
  }
  if (degree === 2 || degree === 4) {
    return { key: "theory.function.predominant", strength: 2 };
  }
  return { key: "theory.function.tonicSubstitute", strength: 1 };
}

function addDiatonicRelationships(
  context: TheoryContext,
  selectedNodeId: string,
  nodes: Map<string, TheoryRelationshipNode>,
  edges: TheoryRelationshipEdge[],
): void {
  const intervals = scaleIntervalsFor(context.scaleId);
  if (intervals.length !== 7) return;
  const roots = spellScaleNotes(context.root, context.scaleId);
  const chordSymbols: string[] = [];

  for (let index = 0; index < roots.length; index += 1) {
    const rootInterval = intervals[index];
    const thirdInterval = intervals[(index + 2) % 7] + (index + 2 >= 7 ? 12 : 0) - rootInterval;
    const fifthInterval = intervals[(index + 4) % 7] + (index + 4 >= 7 ? 12 : 0) - rootInterval;
    const chordSymbol = `${roots[index]}${triadSuffix(thirdInterval, fifthInterval)}`;
    const chordFunction = diatonicFunction(index + 1);
    const node: TheoryRelationshipNode = Object.freeze({
      id: chordNodeId(chordSymbol),
      kind: "chord",
      cluster: "chords",
      label: chordSymbol,
      root: roots[index],
      chordSymbol,
      functionKey: chordFunction.key,
      selected: false,
    });
    addNode(nodes, node);
    edges.push(relationshipEdge(
      "diatonic_function",
      selectedNodeId,
      node.id,
      chordFunction.strength,
      "outbound",
    ));
    chordSymbols.push(chordSymbol);
  }

  const dominantTarget = nodes.get(chordNodeId(chordSymbols[4]));
  if (!dominantTarget?.root) return;
  const tonic = pitchClassOf(dominantTarget.root);
  const preferFlats = dominantTarget.root.includes("b") || context.root.includes("b");
  const secondaryRoot = noteName(tonic + 7, preferFlats);
  const secondarySymbol = `${secondaryRoot}7`;
  const secondaryNode: TheoryRelationshipNode = Object.freeze({
    id: chordNodeId(secondarySymbol),
    kind: "chord",
    cluster: "chords",
    label: secondarySymbol,
    root: secondaryRoot,
    chordSymbol: secondarySymbol,
    functionKey: "theory.function.secondaryDominant",
    selected: false,
  });
  addNode(nodes, secondaryNode);
  edges.push(relationshipEdge(
    "secondary_dominant",
    secondaryNode.id,
    dominantTarget.id,
    2,
    "outbound",
  ));
}

function addDistantRelationship(
  context: TheoryContext,
  selectedNodeId: string,
  nodes: Map<string, TheoryRelationshipNode>,
  edges: TheoryRelationshipEdge[],
): void {
  const preferFlats = context.root.includes("b") || context.root.includes("f");
  const root = noteName(pitchClassOf(context.root) + 6, preferFlats);
  const targetId = keyNodeId(root);
  addNode(nodes, Object.freeze({
    id: targetId,
    kind: "key",
    cluster: "keys",
    label: `${root} major`,
    root,
    scaleId: "major",
    selected: false,
  }));
  edges.push(relationshipEdge("distant", selectedNodeId, targetId, 1, "bidirectional"));
}

export function buildTheoryRelationshipCatalog(
  context: TheoryContext,
): TheoryRelationshipCatalog {
  if (pitchClassOf(context.root) < 0) {
    throw new Error(`Unrecognized relationship root: "${context.root}"`);
  }

  const stableContext = Object.freeze({ ...context });
  const selectedNode = scaleNode(stableContext.root, stableContext.scaleId, "context", true);
  const nodes = new Map<string, TheoryRelationshipNode>([[selectedNode.id, selectedNode]]);
  const edges: TheoryRelationshipEdge[] = [];

  addFifths(stableContext, selectedNode.id, nodes, edges);
  addRelativeMajorMinor(stableContext, selectedNode.id, nodes, edges);
  addModalFamily(stableContext, selectedNode.id, nodes, edges);
  addDiatonicRelationships(stableContext, selectedNode.id, nodes, edges);
  addDistantRelationship(stableContext, selectedNode.id, nodes, edges);

  const orderedNodes = [...nodes.values()].sort((left, right) =>
    CLUSTER_ORDER[left.cluster] - CLUSTER_ORDER[right.cluster]
      || left.id.localeCompare(right.id),
  );
  const orderedEdges = edges.sort((left, right) =>
    RELATIONSHIP_ORDER[left.kind] - RELATIONSHIP_ORDER[right.kind]
      || left.id.localeCompare(right.id),
  );

  return Object.freeze({
    context: stableContext,
    selectedNodeId: selectedNode.id,
    nodes: Object.freeze(orderedNodes),
    edges: Object.freeze(orderedEdges),
  });
}

export function selectCircleRelationshipEdges(
  catalog: TheoryRelationshipCatalog,
): ReadonlyArray<TheoryRelationshipEdge> {
  const incident = catalog.edges.filter((edge) => (
    edge.sourceId === catalog.selectedNodeId || edge.targetId === catalog.selectedNodeId
  ));
  const nodes = new Map(catalog.nodes.map((node) => [node.id, node]));
  const selected: TheoryRelationshipEdge[] = [];

  const add = (edge: TheoryRelationshipEdge | undefined): void => {
    if (edge && !selected.some((candidate) => candidate.id === edge.id)) selected.push(edge);
  };
  const relatedNodeFor = (edge: TheoryRelationshipEdge): TheoryRelationshipNode | undefined => {
    const relatedId = edge.sourceId === catalog.selectedNodeId ? edge.targetId : edge.sourceId;
    return nodes.get(relatedId);
  };
  const edgesFor = (kind: TheoryRelationshipKind) => (
    incident.filter((edge) => edge.kind === kind)
  );

  edgesFor("fifths").forEach(add);
  add(edgesFor("relative_major_minor")[0]);
  const modalEdges = edgesFor("modal_family");
  add(modalEdges.find((edge) => relatedNodeFor(edge)?.scaleId === "major")
    ?? modalEdges.find((edge) => relatedNodeFor(edge)?.scaleId === "dorian")
    ?? modalEdges[0]);

  const diatonicEdges = edgesFor("diatonic_function");
  for (const functionKey of CIRCLE_FUNCTION_ORDER) {
    add(diatonicEdges
      .filter((edge) => relatedNodeFor(edge)?.functionKey === functionKey)
      .sort((left, right) => right.strength - left.strength)[0]);
  }

  add(edgesFor("distant")[0]);
  return Object.freeze(selected);
}

import { lookupChord, splitRootAndQuality } from "../chordData";
import { deriveChordTones } from "./chordTones";
import {
  characteristicIntervalFor,
} from "./modeNetwork";
import {
  pitchClassOf,
  scaleIntervalFormulaFor,
  scaleIntervalsFor,
  scalePitchClasses,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";
import {
  SCALE_LEARNING,
  scaleDegreeName,
  scaleLearningDefinitionFor,
} from "./scaleCatalog";
import type {
  RelationshipDirection,
  RelationshipStrength,
  RelationshipStrengthLabel,
  TheoryRelationshipCatalog,
  TheoryRelationshipEdge,
  TheoryRelationshipNode,
} from "./theoryRelationships";
import type { TheoryContext } from "./theoryContext";

export type NoteNetworkKnowledgeNodeKind = "scale" | "chord" | "note" | "interval";
export type NoteNetworkKnowledgeCluster = "context" | "scales" | "chords" | "notes" | "intervals";
export type NoteNetworkKnowledgeRelationshipKind = TheoryRelationshipEdge["kind"]
  | "scale_degree"
  | "interval_spelling"
  | "chord_tone"
  | "compatible_scale"
  | "voice_leading"
  | "resolves_to";

export interface NoteNetworkKnowledgeNode {
  readonly id: string;
  readonly kind: NoteNetworkKnowledgeNodeKind;
  readonly cluster: NoteNetworkKnowledgeCluster;
  readonly label: string;
  readonly root?: string;
  readonly scaleId?: ScaleFormulaType;
  readonly chordSymbol?: string;
  readonly functionKey?: string;
  readonly pitchClass?: number;
  readonly interval?: number;
  readonly degreeLabel?: string;
  readonly selected: boolean;
  readonly expandable: boolean;
  readonly introducedBy: string | null;
  readonly evidence: ReadonlyArray<string>;
}

export interface NoteNetworkKnowledgeEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly kind: NoteNetworkKnowledgeRelationshipKind;
  readonly strength: RelationshipStrength;
  readonly strengthLabel: RelationshipStrengthLabel;
  readonly direction: RelationshipDirection;
  readonly evidence: string;
}

export interface NoteNetworkKnowledgeBranch {
  readonly rootId: string;
  readonly nodeIds: ReadonlyArray<string>;
  readonly edgeIds: ReadonlyArray<string>;
}

export interface NoteNetworkKnowledgeCatalog {
  readonly context: TheoryContext;
  readonly selectedNodeId: string;
  readonly nodes: ReadonlyArray<NoteNetworkKnowledgeNode>;
  readonly edges: ReadonlyArray<NoteNetworkKnowledgeEdge>;
  readonly seedNodeIds: ReadonlyArray<string>;
  readonly expandedNodeIds: ReadonlyArray<string>;
  readonly branches: ReadonlyArray<NoteNetworkKnowledgeBranch>;
}

export interface NoteNetworkExplorationState {
  readonly contextNodeId: string;
  readonly expandedNodeIds: ReadonlyArray<string>;
}

export interface NoteNetworkEdgeStyle {
  readonly lineWidth: number;
  readonly opacity: number;
  readonly dash: ReadonlyArray<number>;
}

export const NOTE_NETWORK_MAX_NODES = 64;
export const NOTE_NETWORK_MAX_EDGES = 128;
export const NOTE_NETWORK_MAX_EXPANSIONS = 8;

export const NOTE_NETWORK_EDGE_STYLES: Readonly<
Record<RelationshipStrengthLabel, NoteNetworkEdgeStyle>
> = Object.freeze({
  strong: Object.freeze({ lineWidth: 3, opacity: 0.9, dash: Object.freeze([]) }),
  medium: Object.freeze({ lineWidth: 1.5, opacity: 0.68, dash: Object.freeze([]) }),
  weak: Object.freeze({ lineWidth: 1, opacity: 0.48, dash: Object.freeze([10, 8]) }),
});

const STRENGTH_LABELS: Readonly<Record<RelationshipStrength, RelationshipStrengthLabel>> =
  Object.freeze({ 1: "weak", 2: "medium", 3: "strong" });
const SHARP_NAMES = Object.freeze([
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
]);
const FLAT_NAMES = Object.freeze([
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
]);

function freezeStrings(values: Iterable<string>): ReadonlyArray<string> {
  return Object.freeze([...values]);
}

function noteName(pitchClass: number, preferFlats: boolean): string {
  const normalized = ((pitchClass % 12) + 12) % 12;
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[normalized];
}

function noteNodeId(pitchClass: number): string {
  return `note:${((pitchClass % 12) + 12) % 12}`;
}

function intervalNodeId(scaleNodeId: string, interval: number): string {
  return `interval:${scaleNodeId}:${interval}`;
}

function scaleNodeId(root: string, scaleId: ScaleFormulaType): string {
  return `scale:${root}:${scaleId}`;
}

function chordNodeId(symbol: string): string {
  return `chord:${symbol}`;
}

function edgeId(
  kind: NoteNetworkKnowledgeRelationshipKind,
  sourceId: string,
  targetId: string,
  direction: RelationshipDirection,
): string {
  const endpoints = direction === "bidirectional" && sourceId > targetId
    ? [targetId, sourceId]
    : [sourceId, targetId];
  return `knowledge:${kind}:${endpoints[0]}->${endpoints[1]}`;
}

function scalePitchClassList(root: string, scaleId: ScaleFormulaType): ReadonlyArray<number> {
  return Object.freeze([...scalePitchClasses(root, scaleId)].sort((left, right) => left - right));
}

function sharedPitchClasses(
  leftRoot: string,
  leftScaleId: ScaleFormulaType,
  rightRoot: string,
  rightScaleId: ScaleFormulaType,
): ReadonlyArray<number> {
  const right = scalePitchClasses(rightRoot, rightScaleId);
  return Object.freeze(scalePitchClassList(leftRoot, leftScaleId).filter((pitch) => right.has(pitch)));
}

function changedToneEvidence(
  left: NoteNetworkKnowledgeNode,
  right: NoteNetworkKnowledgeNode,
): string {
  if (!left.root || !left.scaleId || !right.root || !right.scaleId) {
    return "Related scale context";
  }
  const shared = sharedPitchClasses(left.root, left.scaleId, right.root, right.scaleId);
  const leftNotes = spellScaleNotes(left.root, left.scaleId);
  const rightNotes = spellScaleNotes(right.root, right.scaleId);
  if (shared.length === leftNotes.length && shared.length === rightNotes.length) {
    return `Same ${shared.length} notes · tonal center ${left.root} → ${right.root}`;
  }
  const rightPitchClasses = scalePitchClasses(right.root, right.scaleId);
  const leftPitchClasses = scalePitchClasses(left.root, left.scaleId);
  const removed = leftNotes.filter((note) => !rightPitchClasses.has(pitchClassOf(note)));
  const added = rightNotes.filter((note) => !leftPitchClasses.has(pitchClassOf(note)));
  const change = removed.length > 0 || added.length > 0
    ? ` · ${removed.join("/") || "—"} → ${added.join("/") || "—"}`
    : "";
  return `Shares ${shared.length}/${Math.max(leftNotes.length, rightNotes.length)} notes${change}`;
}

function adaptSeedNode(node: TheoryRelationshipNode): NoteNetworkKnowledgeNode {
  const scale = Boolean(node.root && node.scaleId && !node.chordSymbol);
  const expandable = node.chordSymbol
    ? lookupChord(node.chordSymbol) !== undefined
    : Boolean(node.root && node.scaleId);
  const evidence = scale && node.scaleId
    ? [`Characteristic color · ${characteristicIntervalFor(node.scaleId)}`]
    : node.functionKey ? [`Harmonic function · ${node.functionKey}`] : [];
  return Object.freeze({
    id: node.id,
    kind: node.chordSymbol ? "chord" : "scale",
    cluster: node.selected ? "context" : node.chordSymbol ? "chords" : "scales",
    label: node.label,
    root: node.root,
    scaleId: node.scaleId,
    chordSymbol: node.chordSymbol,
    functionKey: node.functionKey,
    selected: node.selected,
    expandable,
    introducedBy: null,
    evidence: freezeStrings(evidence),
  });
}

function adaptSeedEdge(
  edge: TheoryRelationshipEdge,
  nodes: ReadonlyMap<string, NoteNetworkKnowledgeNode>,
): NoteNetworkKnowledgeEdge {
  const source = nodes.get(edge.sourceId);
  const target = nodes.get(edge.targetId);
  let evidence = "Related theory context";
  if (source && target) {
    if (edge.kind === "fifths") evidence = `Roots move by a perfect fifth · ${source.root} ↔ ${target.root}`;
    else if (edge.kind === "relative_major_minor" || edge.kind === "modal_family") {
      evidence = changedToneEvidence(source, target);
    } else if (edge.kind === "diatonic_function") {
      evidence = `${target.label} belongs to ${source.label} · ${target.functionKey ?? "diatonic function"}`;
    } else if (edge.kind === "secondary_dominant") {
      evidence = `${source.label} resolves by fifth to ${target.label}`;
    } else if (edge.kind === "distant") {
      evidence = `Roots are a tritone apart · ${source.root} ↔ ${target.root}`;
    }
  }
  return Object.freeze({
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    kind: edge.kind,
    strength: edge.strength,
    strengthLabel: edge.strengthLabel,
    direction: edge.direction,
    evidence,
  });
}

interface MutableBranch {
  rootId: string;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

interface KnowledgeAccumulator {
  nodes: Map<string, NoteNetworkKnowledgeNode>;
  edges: Map<string, NoteNetworkKnowledgeEdge>;
  branch: MutableBranch;
}

function addNode(accumulator: KnowledgeAccumulator, node: NoteNetworkKnowledgeNode): void {
  if (accumulator.nodes.has(node.id)) return;
  if (accumulator.nodes.size >= NOTE_NETWORK_MAX_NODES) return;
  accumulator.nodes.set(node.id, node);
  accumulator.branch.nodeIds.add(node.id);
}

function addEdge(
  accumulator: KnowledgeAccumulator,
  kind: NoteNetworkKnowledgeRelationshipKind,
  sourceId: string,
  targetId: string,
  strength: RelationshipStrength,
  direction: RelationshipDirection,
  evidence: string,
): void {
  if (!accumulator.nodes.has(sourceId) || !accumulator.nodes.has(targetId)) return;
  const equivalentExists = [...accumulator.edges.values()].some((edge) => (
    edge.kind === kind
    && edge.direction === direction
    && (
      (edge.sourceId === sourceId && edge.targetId === targetId)
      || (direction === "bidirectional" && edge.sourceId === targetId && edge.targetId === sourceId)
    )
  ));
  if (equivalentExists) return;
  const id = edgeId(kind, sourceId, targetId, direction);
  if (accumulator.edges.has(id) || accumulator.edges.size >= NOTE_NETWORK_MAX_EDGES) return;
  accumulator.edges.set(id, Object.freeze({
    id,
    sourceId,
    targetId,
    kind,
    strength,
    strengthLabel: STRENGTH_LABELS[strength],
    direction,
    evidence,
  }));
  accumulator.branch.edgeIds.add(id);
}

function noteNode(label: string, pitchClass: number, introducedBy: string): NoteNetworkKnowledgeNode {
  return Object.freeze({
    id: noteNodeId(pitchClass),
    kind: "note",
    cluster: "notes",
    label,
    pitchClass,
    selected: false,
    expandable: false,
    introducedBy,
    evidence: freezeStrings([`Pitch class ${pitchClass}`]),
  });
}

function scaleKnowledgeNode(
  root: string,
  scaleId: ScaleFormulaType,
  introducedBy: string,
): NoteNetworkKnowledgeNode {
  const definition = scaleLearningDefinitionFor(scaleId);
  return Object.freeze({
    id: scaleNodeId(root, scaleId),
    kind: "scale",
    cluster: "scales",
    label: `${root} ${definition.label}`,
    root,
    scaleId,
    selected: false,
    expandable: true,
    introducedBy,
    evidence: freezeStrings([`Characteristic color · ${characteristicIntervalFor(scaleId)}`]),
  });
}

function chordKnowledgeNode(
  symbol: string,
  introducedBy: string,
  functionKey?: string,
  degreeEvidence?: string,
): NoteNetworkKnowledgeNode | null {
  const chord = lookupChord(symbol);
  if (!chord) return null;
  const [preferredRoot] = splitRootAndQuality(symbol);
  return Object.freeze({
    id: chordNodeId(symbol),
    kind: "chord",
    cluster: "chords",
    label: symbol,
    root: preferredRoot,
    chordSymbol: symbol,
    functionKey,
    selected: false,
    expandable: true,
    introducedBy,
    evidence: freezeStrings([
      `Chord family · ${chord.entry.Type}`,
      ...(degreeEvidence ? [degreeEvidence] : []),
    ]),
  });
}

function triadSuffix(third: number, fifth: number): string {
  if (third === 3 && fifth === 6) return "dim";
  if (third === 3 && fifth === 7) return "m";
  if (third === 4 && fifth === 8) return "aug";
  return "";
}

function diatonicFunction(degree: number): Readonly<{
  key: string;
  strength: RelationshipStrength;
}> {
  if (degree === 1) return Object.freeze({ key: "theory.function.tonic", strength: 3 });
  if (degree === 5 || degree === 7) {
    return Object.freeze({
      key: "theory.function.dominant",
      strength: degree === 5 ? 3 : 1,
    });
  }
  if (degree === 2 || degree === 4) {
    return Object.freeze({ key: "theory.function.predominant", strength: 2 });
  }
  return Object.freeze({ key: "theory.function.tonicSubstitute", strength: 1 });
}

function addScaleChordNeighborhood(
  accumulator: KnowledgeAccumulator,
  scale: NoteNetworkKnowledgeNode,
  notes: ReadonlyArray<string>,
  intervals: ReadonlyArray<number>,
  formulas: ReadonlyArray<string>,
): void {
  if (intervals.length !== 7 || notes.length !== 7) return;
  for (let index = 0; index < notes.length; index += 1) {
    const rootInterval = intervals[index];
    const thirdInterval = intervals[(index + 2) % 7] + (index + 2 >= 7 ? 12 : 0) - rootInterval;
    const fifthInterval = intervals[(index + 4) % 7] + (index + 4 >= 7 ? 12 : 0) - rootInterval;
    const symbol = `${notes[index]}${triadSuffix(thirdInterval, fifthInterval)}`;
    const harmonicFunction = diatonicFunction(index + 1);
    const chord = chordKnowledgeNode(
      symbol,
      scale.id,
      harmonicFunction.key,
      `Scale degree ${formulas[index]}: ${scale.label}`,
    );
    if (!chord) continue;
    addNode(accumulator, chord);
    addEdge(
      accumulator,
      "diatonic_function",
      scale.id,
      chord.id,
      harmonicFunction.strength,
      "outbound",
      `${chord.label} belongs to ${scale.label} · ${harmonicFunction.key}`,
    );
  }
}

function addParallelScaleComparisons(
  accumulator: KnowledgeAccumulator,
  scale: NoteNetworkKnowledgeNode,
): void {
  if (!scale.root || !scale.scaleId) return;
  const sourcePitches = scalePitchClasses(scale.root, scale.scaleId);
  const sourceDefinition = scaleLearningDefinitionFor(scale.scaleId);
  const candidates = SCALE_LEARNING.flatMap((definition, order) => {
    if (definition.id === scale.scaleId) return [];
    const targetPitches = scalePitchClasses(scale.root!, definition.id);
    const shared = [...sourcePitches].filter((pitch) => targetPitches.has(pitch)).length;
    return shared > 0 ? [{ definition, order, shared }] : [];
  }).sort((left, right) => (
    right.shared - left.shared
    || Number(right.definition.family === sourceDefinition.family)
      - Number(left.definition.family === sourceDefinition.family)
    || left.order - right.order
  )).slice(0, 2);

  for (const { definition, shared } of candidates) {
    const related = scaleKnowledgeNode(scale.root, definition.id, scale.id);
    addNode(accumulator, related);
    const denominator = Math.max(sourcePitches.size, scalePitchClasses(scale.root, definition.id).size);
    addEdge(
      accumulator,
      "modal_family",
      scale.id,
      related.id,
      shared === denominator ? 3 : shared >= denominator - 1 ? 2 : 1,
      "bidirectional",
      changedToneEvidence(scale, related),
    );
  }
}

function chordToneData(symbol: string): ReadonlyArray<Readonly<{
  pitchClass: number;
  noteLabel: string;
  degree: string;
}>> {
  const chord = lookupChord(symbol);
  if (!chord) return Object.freeze([]);
  return Object.freeze(deriveChordTones(chord).map((tone) => Object.freeze({
    pitchClass: tone.pitchClass,
    noteLabel: tone.noteLabel,
    degree: tone.degree,
  })));
}

function addVoiceLeadingEdges(accumulator: KnowledgeAccumulator, source: NoteNetworkKnowledgeNode): void {
  if (!source.chordSymbol) return;
  const sourceTones = chordToneData(source.chordSymbol);
  if (sourceTones.length === 0) return;
  const sourcePitchClasses = new Set(sourceTones.map((tone) => tone.pitchClass));
  const candidates = [...accumulator.nodes.values()].flatMap((candidate) => {
    if (!candidate.chordSymbol || candidate.id === source.id) return [];
    const shared = chordToneData(candidate.chordSymbol)
      .filter((tone) => sourcePitchClasses.has(tone.pitchClass));
    return shared.length >= 2 ? [{ candidate, shared }] : [];
  }).sort((left, right) => right.shared.length - left.shared.length
    || left.candidate.id.localeCompare(right.candidate.id)).slice(0, 3);
  for (const { candidate, shared } of candidates) {
    addEdge(
      accumulator,
      "voice_leading",
      source.id,
      candidate.id,
      shared.length >= 3 ? 3 : 2,
      "bidirectional",
      `Common-tone voice leading · shares ${shared.map((tone) => tone.noteLabel).join(" · ")}`,
    );
  }
}

function expandScale(accumulator: KnowledgeAccumulator, scale: NoteNetworkKnowledgeNode): void {
  if (!scale.root || !scale.scaleId) return;
  const notes = spellScaleNotes(scale.root, scale.scaleId);
  const formulas = scaleIntervalFormulaFor(scale.scaleId);
  const scaleIntervals = scaleIntervalsFor(scale.scaleId);
  const rootPitchClass = pitchClassOf(scale.root);
  const intervals = notes.map((note) => (pitchClassOf(note) - rootPitchClass + 12) % 12);
  intervals.forEach((interval, index) => {
    const formula = formulas[index];
    const degreeName = scaleDegreeName(interval, scale.scaleId!);
    const intervalId = intervalNodeId(scale.id, interval);
    addNode(accumulator, Object.freeze({
      id: intervalId,
      kind: "interval",
      cluster: "intervals",
      label: `${formula} · ${notes[index]}`,
      root: scale.root,
      scaleId: scale.scaleId,
      pitchClass: pitchClassOf(notes[index]),
      interval,
      degreeLabel: formula,
      selected: false,
      expandable: false,
      introducedBy: scale.id,
      evidence: freezeStrings([degreeName, `In ${scale.label}`]),
    }));
    addNode(accumulator, noteNode(notes[index], pitchClassOf(notes[index]), scale.id));
    addEdge(
      accumulator,
      "scale_degree",
      scale.id,
      intervalId,
      interval === 0 || interval === 7 ? 3 : 2,
      "outbound",
      `${formula} · ${degreeName}`,
    );
    addEdge(
      accumulator,
      "interval_spelling",
      intervalId,
      noteNodeId(pitchClassOf(notes[index])),
      3,
      "outbound",
      `${formula} is spelled ${notes[index]} in ${scale.label}`,
    );
  });

  addScaleChordNeighborhood(accumulator, scale, notes, scaleIntervals, formulas);
  addParallelScaleComparisons(accumulator, scale);

  const scaleChordNodes = [...accumulator.nodes.values()]
    .filter((node) => node.kind === "chord" && node.functionKey);
  for (const chord of scaleChordNodes) addVoiceLeadingEdges(accumulator, chord);
}

function addDominantResolution(
  accumulator: KnowledgeAccumulator,
  chordNode: NoteNetworkKnowledgeNode,
): void {
  if (!chordNode.chordSymbol || !chordNode.root) return;
  const chord = lookupChord(chordNode.chordSymbol);
  if (!chord || chord.entry.Type !== "Dominant") return;
  const preferFlats = chordNode.root.includes("b");
  const targetRoot = noteName(pitchClassOf(chordNode.root) + 5, preferFlats);
  const target = chordKnowledgeNode(targetRoot, chordNode.id);
  if (!target) return;
  addNode(accumulator, target);
  addEdge(
    accumulator,
    "resolves_to",
    chordNode.id,
    target.id,
    3,
    "outbound",
    `Dominant resolution · ${chordNode.label} → ${target.label}`,
  );
}

function expandChord(accumulator: KnowledgeAccumulator, chordNode: NoteNetworkKnowledgeNode): void {
  if (!chordNode.chordSymbol || !chordNode.root) return;
  const tones = chordToneData(chordNode.chordSymbol);
  for (const tone of tones) {
    addNode(accumulator, noteNode(tone.noteLabel, tone.pitchClass, chordNode.id));
    addEdge(
      accumulator,
      "chord_tone",
      chordNode.id,
      noteNodeId(tone.pitchClass),
      tone.degree === "1" || tone.degree === "3" || tone.degree === "b3" ? 3 : 2,
      "outbound",
      `${tone.noteLabel} is the ${tone.degree} of ${chordNode.label}`,
    );
  }

  const tonePitchClasses = new Set(tones.map((tone) => tone.pitchClass));
  const contextScaleId = [...accumulator.nodes.values()]
    .find((node) => node.selected)?.scaleId;
  const compatible = SCALE_LEARNING.flatMap((definition) => {
    const scalePitches = scalePitchClasses(chordNode.root!, definition.id);
    const matching = [...tonePitchClasses].filter((pitch) => scalePitches.has(pitch)).length;
    return matching === tonePitchClasses.size
      ? [{ definition, matching }]
      : [];
  }).sort((left, right) => (
    Number(right.definition.id === contextScaleId)
      - Number(left.definition.id === contextScaleId)
      || left.definition.id.localeCompare(right.definition.id)
  )).slice(0, 3);
  for (const { definition, matching } of compatible) {
    const scale = scaleKnowledgeNode(chordNode.root, definition.id, chordNode.id);
    addNode(accumulator, scale);
    addEdge(
      accumulator,
      "compatible_scale",
      chordNode.id,
      scale.id,
      3,
      "bidirectional",
      `${matching}/${tones.length} chord tones fit ${scale.label}`,
    );
  }
  addDominantResolution(accumulator, chordNode);
  addVoiceLeadingEdges(accumulator, chordNode);
}

function buildCatalog(
  seed: TheoryRelationshipCatalog,
  requestedExpandedNodeIds: ReadonlyArray<string>,
): NoteNetworkKnowledgeCatalog {
  const nodes = new Map(seed.nodes.map((node) => {
    const adapted = adaptSeedNode(node);
    return [adapted.id, adapted] as const;
  }));
  const edges = new Map(seed.edges.map((edge) => {
    const adapted = adaptSeedEdge(edge, nodes);
    return [adapted.id, adapted] as const;
  }));
  const expandedNodeIds: string[] = [];
  const branches: NoteNetworkKnowledgeBranch[] = [];

  for (const nodeId of requestedExpandedNodeIds.slice(0, NOTE_NETWORK_MAX_EXPANSIONS)) {
    const node = nodes.get(nodeId);
    if (!node?.expandable || expandedNodeIds.includes(nodeId)) continue;
    const branch: MutableBranch = { rootId: nodeId, nodeIds: new Set(), edgeIds: new Set() };
    const accumulator: KnowledgeAccumulator = { nodes, edges, branch };
    if (node.kind === "scale") expandScale(accumulator, node);
    else if (node.kind === "chord") expandChord(accumulator, node);
    expandedNodeIds.push(nodeId);
    branches.push(Object.freeze({
      rootId: nodeId,
      nodeIds: freezeStrings(branch.nodeIds),
      edgeIds: freezeStrings(branch.edgeIds),
    }));
  }

  return Object.freeze({
    context: seed.context,
    selectedNodeId: seed.selectedNodeId,
    nodes: Object.freeze([...nodes.values()]),
    edges: Object.freeze([...edges.values()]),
    seedNodeIds: freezeStrings(seed.nodes.map((node) => node.id)),
    expandedNodeIds: freezeStrings(expandedNodeIds),
    branches: Object.freeze(branches),
  });
}

export function createNoteNetworkExplorationState(
  seed: TheoryRelationshipCatalog,
): NoteNetworkExplorationState {
  return Object.freeze({ contextNodeId: seed.selectedNodeId, expandedNodeIds: Object.freeze([]) });
}

export function buildNoteNetworkKnowledgeCatalog(
  seed: TheoryRelationshipCatalog,
  state: NoteNetworkExplorationState,
): NoteNetworkKnowledgeCatalog {
  const expanded = state.contextNodeId === seed.selectedNodeId ? state.expandedNodeIds : [];
  return buildCatalog(seed, expanded);
}

export function expandNoteNetworkKnowledge(
  seed: TheoryRelationshipCatalog,
  state: NoteNetworkExplorationState,
  nodeId: string,
): NoteNetworkExplorationState {
  const current = buildNoteNetworkKnowledgeCatalog(seed, state);
  const node = current.nodes.find((candidate) => candidate.id === nodeId);
  if (!node?.expandable || current.expandedNodeIds.includes(nodeId)) return state;
  if (current.expandedNodeIds.length >= NOTE_NETWORK_MAX_EXPANSIONS) return state;
  return Object.freeze({
    contextNodeId: seed.selectedNodeId,
    expandedNodeIds: freezeStrings([...current.expandedNodeIds, nodeId]),
  });
}

export function collapseNoteNetworkKnowledgeBranch(
  seed: TheoryRelationshipCatalog,
  state: NoteNetworkExplorationState,
  nodeId: string,
): NoteNetworkExplorationState {
  let retained = state.expandedNodeIds.filter((id) => id !== nodeId);
  for (;;) {
    const catalog = buildCatalog(seed, retained);
    const visible = new Set(catalog.nodes.map((node) => node.id));
    const next = retained.filter((id) => visible.has(id));
    if (next.length === retained.length) break;
    retained = next;
  }
  if (retained.length === state.expandedNodeIds.length) return state;
  return Object.freeze({
    contextNodeId: seed.selectedNodeId,
    expandedNodeIds: freezeStrings(retained),
  });
}

export function clearNoteNetworkExploration(
  seed: TheoryRelationshipCatalog,
): NoteNetworkExplorationState {
  return createNoteNetworkExplorationState(seed);
}

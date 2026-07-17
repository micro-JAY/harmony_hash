import type {
  TheoryNodeCluster,
  TheoryRelationshipCatalog,
  TheoryRelationshipEdge,
  TheoryRelationshipNode,
} from "./theoryRelationships";

export interface NetworkPoint {
  readonly x: number;
  readonly y: number;
}

export interface NetworkBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface NetworkLabelMetadata {
  readonly fullLabel: string;
  readonly lines: ReadonlyArray<string>;
  readonly truncated: boolean;
  readonly maxLines: 2;
}

export interface NoteNetworkLayoutNode {
  readonly node: TheoryRelationshipNode;
  readonly x: number;
  readonly y: number;
  readonly initialX: number;
  readonly initialY: number;
  readonly width: number;
  readonly height: number;
  readonly bounds: NetworkBounds;
  readonly labelBounds: NetworkBounds;
  readonly label: NetworkLabelMetadata;
  readonly animate: boolean;
}

export interface NoteNetworkLayoutEdge {
  readonly edge: TheoryRelationshipEdge;
  readonly start: NetworkPoint;
  readonly end: NetworkPoint;
  readonly path: string;
}

export interface NetworkClusterBounds {
  readonly id: TheoryNodeCluster;
  readonly nodeIds: ReadonlyArray<string>;
  readonly bounds: NetworkBounds;
}

export interface NoteNetworkLayout {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
  readonly selectedNodeId: string;
  readonly nodes: ReadonlyArray<NoteNetworkLayoutNode>;
  readonly edges: ReadonlyArray<NoteNetworkLayoutEdge>;
  readonly clusters: ReadonlyArray<NetworkClusterBounds>;
  readonly zoom: NetworkZoomBounds;
  readonly projection: "desktop-radial" | "mobile-static";
}

export interface NoteNetworkLayoutOptions {
  readonly width: number;
  readonly reducedMotion?: boolean;
  readonly mobileStatic?: boolean;
}

export interface NetworkZoomBounds {
  readonly min: number;
  readonly max: number;
  readonly default: number;
  readonly step: number;
}

export interface NoteNetworkPanBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const NOTE_NETWORK_ZOOM_BOUNDS: NetworkZoomBounds = Object.freeze({
  min: 0.65,
  max: 1.8,
  default: 1,
  step: 0.15,
});

const VIEWPORT_PADDING = 16;
const MIN_VIEWPORT_WIDTH = 280;
const MIN_NODE_WIDTH = 112;
const MAX_NODE_WIDTH = 144;
const NODE_HEIGHT = 52;
const SELECTED_NODE_WIDTH = 184;
const SELECTED_NODE_HEIGHT = 68;
const CHORD_NODE_WIDTH = 84;
const CHORD_NODE_HEIGHT = 42;
const MOBILE_NODE_WIDTH = 80;
const MOBILE_NODE_HEIGHT = 40;
const MOBILE_CHORD_WIDTH = 54;
const MOBILE_CHORD_HEIGHT = 32;
const MOBILE_SELECTED_WIDTH = 116;
const MOBILE_SELECTED_HEIGHT = 58;
const CLUSTER_ORDER: ReadonlyArray<TheoryNodeCluster> = Object.freeze([
  "keys",
  "modes",
  "chords",
]);

function freezeBounds(x: number, y: number, width: number, height: number): NetworkBounds {
  return Object.freeze({ x, y, width, height });
}

function finitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

export function clampNoteNetworkZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) throw new RangeError("Network zoom must be finite");
  return Math.max(NOTE_NETWORK_ZOOM_BOUNDS.min, Math.min(NOTE_NETWORK_ZOOM_BOUNDS.max, zoom));
}

function axisPanBounds(contentSize: number, viewportSize: number): readonly [number, number] {
  const remaining = viewportSize - contentSize;
  if (remaining >= 0) {
    const centered = remaining / 2;
    return Object.freeze([centered, centered]);
  }
  return Object.freeze([remaining, 0]);
}

export function calculateNoteNetworkPanBounds(
  layoutWidth: number,
  layoutHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
): NoteNetworkPanBounds {
  finitePositive(layoutWidth, "Network layout width");
  finitePositive(layoutHeight, "Network layout height");
  finitePositive(viewportWidth, "Network viewport width");
  finitePositive(viewportHeight, "Network viewport height");
  const boundedZoom = clampNoteNetworkZoom(zoom);
  const [minX, maxX] = axisPanBounds(layoutWidth * boundedZoom, viewportWidth);
  const [minY, maxY] = axisPanBounds(layoutHeight * boundedZoom, viewportHeight);
  return Object.freeze({ minX, maxX, minY, maxY });
}

export function clampNoteNetworkPan(
  pan: NetworkPoint,
  bounds: NoteNetworkPanBounds,
): NetworkPoint {
  if (!Number.isFinite(pan.x) || !Number.isFinite(pan.y)) {
    throw new RangeError("Network pan coordinates must be finite");
  }
  return Object.freeze({
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pan.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pan.y)),
  });
}

export function wrapNoteNetworkLabel(
  fullLabel: string,
  maxCharacters: number,
): NetworkLabelMetadata {
  const normalized = fullLabel.trim().replace(/\s+/g, " ");
  if (normalized === "") throw new TypeError("Network labels must not be empty");
  if (!Number.isInteger(maxCharacters) || maxCharacters < 4) {
    throw new RangeError("Network label width must allow at least four characters");
  }
  if (normalized.length <= maxCharacters) {
    return Object.freeze({
      fullLabel: normalized,
      lines: Object.freeze([normalized]),
      truncated: false,
      maxLines: 2,
    });
  }

  const lines: string[] = [];
  let remaining = normalized;
  for (let lineIndex = 0; lineIndex < 2 && remaining !== ""; lineIndex += 1) {
    if (remaining.length <= maxCharacters) {
      lines.push(remaining);
      remaining = "";
      break;
    }
    const candidate = remaining.slice(0, maxCharacters + 1);
    const lastSpace = candidate.lastIndexOf(" ");
    const breakAt = lastSpace > 0 ? lastSpace : maxCharacters;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }

  const truncated = remaining !== "";
  if (truncated) {
    const lastIndex = lines.length - 1;
    const visible = lines[lastIndex].slice(0, Math.max(1, maxCharacters - 1)).trimEnd();
    lines[lastIndex] = `${visible}…`;
  }
  return Object.freeze({
    fullLabel: normalized,
    lines: Object.freeze(lines),
    truncated,
    maxLines: 2,
  });
}

function boundaryPoint(
  from: NetworkPoint,
  toward: NetworkPoint,
  bounds: NetworkBounds,
): NetworkPoint {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return Object.freeze({ ...from });
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const yScale = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(xScale, yScale);
  return Object.freeze({ x: from.x + dx * scale, y: from.y + dy * scale });
}

export function terminateNetworkEdgeAtBounds(
  source: Pick<NoteNetworkLayoutNode, "x" | "y" | "bounds">,
  target: Pick<NoteNetworkLayoutNode, "x" | "y" | "bounds">,
): Readonly<{ start: NetworkPoint; end: NetworkPoint }> {
  const sourceCenter = Object.freeze({ x: source.x, y: source.y });
  const targetCenter = Object.freeze({ x: target.x, y: target.y });
  return Object.freeze({
    start: boundaryPoint(sourceCenter, targetCenter, source.bounds),
    end: boundaryPoint(targetCenter, sourceCenter, target.bounds),
  });
}

export function networkBoundsOverlap(
  left: NetworkBounds,
  right: NetworkBounds,
): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function layoutNode(
  node: TheoryRelationshipNode,
  x: number,
  y: number,
  width: number,
  height: number,
  selectedCenter: NetworkPoint,
  reducedMotion: boolean,
): NoteNetworkLayoutNode {
  const bounds = freezeBounds(x - width / 2, y - height / 2, width, height);
  const maxCharacters = Math.max(4, Math.floor((width - 18) / 7));
  const initialX = reducedMotion ? x : selectedCenter.x + (x - selectedCenter.x) * 0.08;
  const initialY = reducedMotion ? y : selectedCenter.y + (y - selectedCenter.y) * 0.08;
  return Object.freeze({
    node,
    x,
    y,
    initialX,
    initialY,
    width,
    height,
    bounds,
    labelBounds: bounds,
    label: wrapNoteNetworkLabel(node.label, maxCharacters),
    animate: !reducedMotion,
  });
}

function radialPoints(
  count: number,
  center: NetworkPoint,
  radiusX: number,
  radiusY: number,
  phase: number,
): ReadonlyArray<NetworkPoint> {
  if (count === 0) return Object.freeze([]);
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const angle = phase + (Math.PI * 2 * index) / count;
    return Object.freeze({
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY,
    });
  }));
}

function strongestConnectedNodes(
  catalog: TheoryRelationshipCatalog,
  candidates: ReadonlyArray<TheoryRelationshipNode>,
  limit: number,
): ReadonlyArray<TheoryRelationshipNode> {
  const strengths = new Map<string, number>();
  for (const edge of catalog.edges) {
    if (edge.sourceId === catalog.selectedNodeId) {
      strengths.set(edge.targetId, Math.max(strengths.get(edge.targetId) ?? 0, edge.strength));
    } else if (edge.targetId === catalog.selectedNodeId) {
      strengths.set(edge.sourceId, Math.max(strengths.get(edge.sourceId) ?? 0, edge.strength));
    }
  }
  return Object.freeze([...candidates]
    .sort((left, right) => (
      (strengths.get(right.id) ?? 0) - (strengths.get(left.id) ?? 0)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, limit));
}

function clusterBoundsFor(
  id: TheoryNodeCluster,
  nodes: ReadonlyArray<NoteNetworkLayoutNode>,
): NetworkClusterBounds {
  const left = Math.min(...nodes.map((node) => node.bounds.x));
  const top = Math.min(...nodes.map((node) => node.bounds.y));
  const right = Math.max(...nodes.map((node) => node.bounds.x + node.bounds.width));
  const bottom = Math.max(...nodes.map((node) => node.bounds.y + node.bounds.height));
  return Object.freeze({
    id,
    nodeIds: Object.freeze(nodes.map((node) => node.node.id)),
    bounds: freezeBounds(left, top, right - left, bottom - top),
  });
}

export function buildNoteNetworkLayout(
  catalog: TheoryRelationshipCatalog,
  options: NoteNetworkLayoutOptions,
): NoteNetworkLayout {
  finitePositive(options.width, "Network viewport width");
  if (options.width < MIN_VIEWPORT_WIDTH) {
    throw new RangeError(`Network viewport width must be at least ${MIN_VIEWPORT_WIDTH}px`);
  }
  const mobileStatic = options.mobileStatic ?? false;
  const reducedMotion = (options.reducedMotion ?? false) || mobileStatic;
  const selected = catalog.nodes.find((node) => node.id === catalog.selectedNodeId);
  if (!selected) throw new Error(`Missing selected network node: ${catalog.selectedNodeId}`);
  const height = mobileStatic
    ? 360
    : Math.max(580, Math.min(660, Math.round(options.width * 0.75)));
  const selectedWidth = Math.min(
    mobileStatic ? MOBILE_SELECTED_WIDTH : SELECTED_NODE_WIDTH,
    options.width - VIEWPORT_PADDING * 2,
  );
  const selectedHeight = mobileStatic ? MOBILE_SELECTED_HEIGHT : SELECTED_NODE_HEIGHT;
  const selectedCenter = Object.freeze({
    x: options.width / 2,
    y: height / 2,
  });
  const selectedLayout = layoutNode(
    selected,
    selectedCenter.x,
    selectedCenter.y,
    selectedWidth,
    selectedHeight,
    selectedCenter,
    reducedMotion,
  );
  const scaleCandidates = catalog.nodes
    .filter((node) => node.id !== catalog.selectedNodeId && !node.chordSymbol)
    .sort((left, right) => left.id.localeCompare(right.id));
  const chordCandidates = catalog.nodes
    .filter((node) => node.id !== catalog.selectedNodeId && Boolean(node.chordSymbol))
    .sort((left, right) => left.id.localeCompare(right.id));
  const scaleNodes = mobileStatic
    ? strongestConnectedNodes(catalog, scaleCandidates, 6)
    : scaleCandidates;
  const chordNodes = mobileStatic
    ? strongestConnectedNodes(catalog, chordCandidates, 4)
    : chordCandidates;
  const scaleNodeWidth = mobileStatic
    ? MOBILE_NODE_WIDTH
    : Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, options.width * 0.16));
  const scaleNodeHeight = mobileStatic ? MOBILE_NODE_HEIGHT : NODE_HEIGHT;
  const chordNodeWidth = mobileStatic ? MOBILE_CHORD_WIDTH : CHORD_NODE_WIDTH;
  const chordNodeHeight = mobileStatic ? MOBILE_CHORD_HEIGHT : CHORD_NODE_HEIGHT;
  const scaleRadiusX = mobileStatic
    ? Math.min(options.width * 0.31, options.width / 2 - VIEWPORT_PADDING - scaleNodeWidth / 2)
    : Math.min(options.width * 0.26, options.width / 2 - VIEWPORT_PADDING - scaleNodeWidth / 2);
  const scaleRadiusY = mobileStatic ? 98 : height * 0.27;
  const chordRadiusX = mobileStatic
    ? Math.min(options.width * 0.41, options.width / 2 - VIEWPORT_PADDING - chordNodeWidth / 2)
    : options.width / 2 - VIEWPORT_PADDING - chordNodeWidth / 2;
  const chordRadiusY = mobileStatic
    ? 150
    : Math.min(height * 0.43, height / 2 - VIEWPORT_PADDING - chordNodeHeight / 2);
  const scalePoints = radialPoints(scaleNodes.length, selectedCenter, scaleRadiusX, scaleRadiusY, -Math.PI / 2);
  const chordPoints = radialPoints(
    chordNodes.length,
    selectedCenter,
    chordRadiusX,
    chordRadiusY,
    mobileStatic ? -Math.PI / 4 : -Math.PI / 2 + Math.PI / Math.max(1, chordNodes.length),
  );
  const layoutNodes: NoteNetworkLayoutNode[] = [selectedLayout];
  scaleNodes.forEach((node, index) => {
    const point = scalePoints[index];
    layoutNodes.push(layoutNode(
      node,
      point.x,
      point.y,
      scaleNodeWidth,
      scaleNodeHeight,
      selectedCenter,
      reducedMotion,
    ));
  });
  chordNodes.forEach((node, index) => {
    const point = chordPoints[index];
    layoutNodes.push(layoutNode(
      node,
      point.x,
      point.y,
      chordNodeWidth,
      chordNodeHeight,
      selectedCenter,
      reducedMotion,
    ));
  });
  const clusters: NetworkClusterBounds[] = [clusterBoundsFor("context", [selectedLayout])];
  for (const clusterId of CLUSTER_ORDER) {
    const members = layoutNodes.filter((layoutItem) => layoutItem.node.cluster === clusterId);
    if (members.length > 0) clusters.push(clusterBoundsFor(clusterId, members));
  }
  const nodesById = new Map(layoutNodes.map((node) => [node.node.id, node]));
  const layoutEdges = catalog.edges.flatMap((edge) => {
    const source = nodesById.get(edge.sourceId);
    const target = nodesById.get(edge.targetId);
    if (!source || !target) return [];
    const { start, end } = terminateNetworkEdgeAtBounds(source, target);
    return [Object.freeze({
      edge,
      start,
      end,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    })];
  });

  return Object.freeze({
    width: options.width,
    height,
    padding: VIEWPORT_PADDING,
    selectedNodeId: catalog.selectedNodeId,
    nodes: Object.freeze(layoutNodes),
    edges: Object.freeze(layoutEdges),
    clusters: Object.freeze(clusters),
    zoom: NOTE_NETWORK_ZOOM_BOUNDS,
    projection: mobileStatic ? "mobile-static" : "desktop-radial",
  });
}

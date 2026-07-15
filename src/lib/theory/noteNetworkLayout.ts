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
}

export interface NoteNetworkLayoutOptions {
  readonly width: number;
  readonly reducedMotion?: boolean;
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
const MAX_NODE_WIDTH = 148;
const NODE_HEIGHT = 58;
const SELECTED_NODE_WIDTH = 180;
const SELECTED_NODE_HEIGHT = 64;
const NODE_GAP = 12;
const ROW_GAP = 12;
const CLUSTER_GAP = 34;
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
  const initialX = reducedMotion ? x : selectedCenter.x + (x - selectedCenter.x) * 0.82;
  const initialY = reducedMotion ? y : selectedCenter.y + (y - selectedCenter.y) * 0.82;
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
  const reducedMotion = options.reducedMotion ?? false;
  const selected = catalog.nodes.find((node) => node.id === catalog.selectedNodeId);
  if (!selected) throw new Error(`Missing selected network node: ${catalog.selectedNodeId}`);

  const selectedWidth = Math.min(SELECTED_NODE_WIDTH, options.width - VIEWPORT_PADDING * 2);
  const selectedCenter = Object.freeze({
    x: options.width / 2,
    y: VIEWPORT_PADDING + SELECTED_NODE_HEIGHT / 2,
  });
  const selectedLayout = layoutNode(
    selected,
    selectedCenter.x,
    selectedCenter.y,
    selectedWidth,
    SELECTED_NODE_HEIGHT,
    selectedCenter,
    reducedMotion,
  );
  const layoutNodes: NoteNetworkLayoutNode[] = [selectedLayout];
  const clusters: NetworkClusterBounds[] = [clusterBoundsFor("context", [selectedLayout])];

  const usableWidth = options.width - VIEWPORT_PADDING * 2;
  const columns = Math.max(
    1,
    Math.min(4, Math.floor((usableWidth + NODE_GAP) / (MIN_NODE_WIDTH + NODE_GAP))),
  );
  const nodeWidth = Math.min(
    MAX_NODE_WIDTH,
    Math.floor((usableWidth - NODE_GAP * (columns - 1)) / columns),
  );
  let cursorY = selectedLayout.bounds.y + selectedLayout.bounds.height + CLUSTER_GAP;

  for (const clusterId of CLUSTER_ORDER) {
    const members = catalog.nodes
      .filter((node) => node.id !== catalog.selectedNodeId && node.cluster === clusterId)
      .sort((left, right) => left.id.localeCompare(right.id));
    if (members.length === 0) continue;
    const clusterNodes: NoteNetworkLayoutNode[] = [];
    for (let start = 0; start < members.length; start += columns) {
      const row = members.slice(start, start + columns);
      const rowWidth = row.length * nodeWidth + (row.length - 1) * NODE_GAP;
      const rowLeft = (options.width - rowWidth) / 2;
      const y = cursorY + NODE_HEIGHT / 2;
      for (let index = 0; index < row.length; index += 1) {
        const x = rowLeft + nodeWidth / 2 + index * (nodeWidth + NODE_GAP);
        const positioned = layoutNode(
          row[index],
          x,
          y,
          nodeWidth,
          NODE_HEIGHT,
          selectedCenter,
          reducedMotion,
        );
        clusterNodes.push(positioned);
        layoutNodes.push(positioned);
      }
      cursorY += NODE_HEIGHT + ROW_GAP;
    }
    cursorY -= ROW_GAP;
    clusters.push(clusterBoundsFor(clusterId, clusterNodes));
    cursorY += CLUSTER_GAP;
  }

  const height = Math.max(
    selectedLayout.bounds.y + selectedLayout.bounds.height + VIEWPORT_PADDING,
    cursorY - CLUSTER_GAP + VIEWPORT_PADDING,
  );
  const nodesById = new Map(layoutNodes.map((node) => [node.node.id, node]));
  const layoutEdges = catalog.edges.map((edge) => {
    const source = nodesById.get(edge.sourceId);
    const target = nodesById.get(edge.targetId);
    if (!source || !target) {
      throw new Error(`Network edge ${edge.id} references a missing node`);
    }
    const { start, end } = terminateNetworkEdgeAtBounds(source, target);
    return Object.freeze({
      edge,
      start,
      end,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    });
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
  });
}

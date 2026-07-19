import { buildNoteNetworkLayout } from "./noteNetworkLayout";
import type {
  TheoryRelationshipCatalog,
  TheoryRelationshipEdge,
  TheoryRelationshipNode,
} from "./theoryRelationships";

export interface NoteNetworkPhysicsNode {
  readonly id: string;
  readonly node: TheoryRelationshipNode;
  readonly radius: number;
  readonly collisionRadius: number;
  readonly connectionCount: number;
  readonly anchored: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dragged: boolean;
}

export interface NoteNetworkPhysicsEdge {
  readonly edge: TheoryRelationshipEdge;
  readonly sourceIndex: number;
  readonly targetIndex: number;
  targetDistance: number;
}

export interface NoteNetworkSimulation {
  width: number;
  height: number;
  readonly nodes: NoteNetworkPhysicsNode[];
  readonly edges: NoteNetworkPhysicsEdge[];
  readonly forcesX: Float64Array;
  readonly forcesY: Float64Array;
  readonly selectedNodeIndex: number;
  frame: number;
  energy: number;
  lowEnergyFrames: number;
  sleeping: boolean;
}

export interface NoteNetworkPhysicsConfig {
  readonly repulsion: number;
  readonly spring: number;
  readonly centerGravity: number;
  readonly collision: number;
  readonly damping: number;
  readonly boundaryBounce: number;
  readonly padding: number;
  readonly sleepEnergy: number;
  readonly sleepFrames: number;
  readonly minimumActiveFrames: number;
}

export const NOTE_NETWORK_PHYSICS: Readonly<NoteNetworkPhysicsConfig> = Object.freeze({
  repulsion: 2_200,
  spring: 0.0075,
  centerGravity: 0.0018,
  collision: 0.09,
  damping: 0.88,
  boundaryBounce: 0.2,
  padding: 20,
  sleepEnergy: 0.012,
  sleepFrames: 54,
  minimumActiveFrames: 120,
});

const MIN_SIMULATION_SIZE = 280;
const MIN_RADIUS = 11;
const MAX_RADIUS = 27;
const SELECTED_RADIUS = 31;

function assertSimulationSize(value: number, name: string): void {
  if (!Number.isFinite(value) || value < MIN_SIMULATION_SIZE) {
    throw new RangeError(`${name} must be at least ${MIN_SIMULATION_SIZE}px`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function connectionCounts(catalog: TheoryRelationshipCatalog): ReadonlyMap<string, number> {
  const counts = new Map(catalog.nodes.map((node) => [node.id, 0]));
  for (const edge of catalog.edges) {
    counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1);
    counts.set(edge.targetId, (counts.get(edge.targetId) ?? 0) + 1);
  }
  return counts;
}

export function noteNetworkNodeRadius(
  node: TheoryRelationshipNode,
  connectionCount: number,
): number {
  if (!Number.isInteger(connectionCount) || connectionCount < 0) {
    throw new RangeError("Network connection count must be a non-negative integer");
  }
  if (node.selected) return SELECTED_RADIUS;
  const base = node.chordSymbol ? 9.5 : 13;
  const weighted = base + Math.sqrt(connectionCount + 1) * (node.chordSymbol ? 2.1 : 2.6);
  return clamp(weighted, MIN_RADIUS, MAX_RADIUS);
}

function labelCollisionPadding(node: TheoryRelationshipNode): number {
  if (node.chordSymbol) return 8;
  return clamp(node.label.length * 0.48, 10, 24);
}

function targetDistance(
  edge: TheoryRelationshipEdge,
  width: number,
  height: number,
): number {
  const available = Math.min(width, height);
  const byStrength = edge.strength === 3 ? 138 : edge.strength === 2 ? 174 : 214;
  return Math.min(byStrength, available * (edge.strength === 3 ? 0.29 : 0.36));
}

function clampNodeToBounds(
  node: NoteNetworkPhysicsNode,
  width: number,
  height: number,
  padding: number,
): void {
  const minimumX = padding + node.collisionRadius;
  const maximumX = width - padding - node.collisionRadius;
  const minimumY = padding + node.collisionRadius;
  const maximumY = height - padding - node.collisionRadius;
  node.x = clamp(node.x, Math.min(minimumX, width / 2), Math.max(maximumX, width / 2));
  node.y = clamp(node.y, Math.min(minimumY, height / 2), Math.max(maximumY, height / 2));
}

export function createNoteNetworkSimulation(
  catalog: TheoryRelationshipCatalog,
  width: number,
  height: number,
): NoteNetworkSimulation {
  assertSimulationSize(width, "Network simulation width");
  assertSimulationSize(height, "Network simulation height");
  const seedLayout = buildNoteNetworkLayout(catalog, { width, reducedMotion: false });
  const seedCenter = { x: seedLayout.width / 2, y: seedLayout.height / 2 };
  const center = { x: width / 2, y: height / 2 };
  const scaleY = height / seedLayout.height;
  const counts = connectionCounts(catalog);
  const nodes = seedLayout.nodes.map((layoutNode) => {
    const connectionCount = counts.get(layoutNode.node.id) ?? 0;
    const radius = noteNetworkNodeRadius(layoutNode.node, connectionCount);
    const physicsNode: NoteNetworkPhysicsNode = {
      id: layoutNode.node.id,
      node: layoutNode.node,
      radius,
      collisionRadius: radius + labelCollisionPadding(layoutNode.node),
      connectionCount,
      anchored: layoutNode.node.id === catalog.selectedNodeId,
      x: center.x + (layoutNode.initialX - seedCenter.x),
      y: center.y + (layoutNode.initialY - seedCenter.y) * scaleY,
      vx: 0,
      vy: 0,
      dragged: false,
    };
    if (physicsNode.anchored) {
      physicsNode.x = center.x;
      physicsNode.y = center.y;
    }
    clampNodeToBounds(physicsNode, width, height, NOTE_NETWORK_PHYSICS.padding);
    return physicsNode;
  });
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = catalog.edges.flatMap((edge) => {
    const sourceIndex = nodeIndexes.get(edge.sourceId);
    const targetIndex = nodeIndexes.get(edge.targetId);
    if (sourceIndex === undefined || targetIndex === undefined) return [];
    return [{
      edge,
      sourceIndex,
      targetIndex,
      targetDistance: targetDistance(edge, width, height),
    }];
  });
  const selectedNodeIndex = nodes.findIndex((node) => node.anchored);
  if (selectedNodeIndex < 0) {
    throw new Error(`Missing selected physics node: ${catalog.selectedNodeId}`);
  }
  return {
    width,
    height,
    nodes,
    edges,
    forcesX: new Float64Array(nodes.length),
    forcesY: new Float64Array(nodes.length),
    selectedNodeIndex,
    frame: 0,
    energy: Number.POSITIVE_INFINITY,
    lowEnergyFrames: 0,
    sleeping: false,
  };
}

function applyPairwiseForces(
  simulation: NoteNetworkSimulation,
  config: NoteNetworkPhysicsConfig,
): void {
  const { nodes, forcesX, forcesY } = simulation;
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const left = nodes[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const right = nodes[rightIndex];
      let dx = right.x - left.x;
      let dy = right.y - left.y;
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 0.000_1) {
        const direction = ((leftIndex + 1) * 0.754_877_666) % (Math.PI * 2);
        dx = Math.cos(direction) * 0.01;
        dy = Math.sin(direction) * 0.01;
        distanceSquared = dx * dx + dy * dy;
      }
      const distance = Math.sqrt(distanceSquared);
      const directionX = dx / distance;
      const directionY = dy / distance;
      const repulsion = config.repulsion / Math.max(64, distanceSquared);
      forcesX[leftIndex] -= directionX * repulsion;
      forcesY[leftIndex] -= directionY * repulsion;
      forcesX[rightIndex] += directionX * repulsion;
      forcesY[rightIndex] += directionY * repulsion;

      const minimumDistance = left.collisionRadius + right.collisionRadius;
      if (distance < minimumDistance) {
        const separation = (minimumDistance - distance) * config.collision;
        forcesX[leftIndex] -= directionX * separation;
        forcesY[leftIndex] -= directionY * separation;
        forcesX[rightIndex] += directionX * separation;
        forcesY[rightIndex] += directionY * separation;
      }
    }
  }
}

function applySpringForces(
  simulation: NoteNetworkSimulation,
  config: NoteNetworkPhysicsConfig,
): void {
  const { nodes, forcesX, forcesY } = simulation;
  for (const edge of simulation.edges) {
    const source = nodes[edge.sourceIndex];
    const target = nodes[edge.targetIndex];
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const extension = distance - edge.targetDistance;
    const strengthMultiplier = 0.76 + edge.edge.strength * 0.12;
    const springForce = extension * config.spring * strengthMultiplier;
    const forceX = (dx / distance) * springForce;
    const forceY = (dy / distance) * springForce;
    forcesX[edge.sourceIndex] += forceX;
    forcesY[edge.sourceIndex] += forceY;
    forcesX[edge.targetIndex] -= forceX;
    forcesY[edge.targetIndex] -= forceY;
  }
}

function integrateSimulation(
  simulation: NoteNetworkSimulation,
  config: NoteNetworkPhysicsConfig,
): number {
  const centerX = simulation.width / 2;
  const centerY = simulation.height / 2;
  let energy = 0;
  for (let index = 0; index < simulation.nodes.length; index += 1) {
    const node = simulation.nodes[index];
    if (node.dragged) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    if (node.anchored) {
      node.x = centerX;
      node.y = centerY;
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    simulation.forcesX[index] += (centerX - node.x) * config.centerGravity;
    simulation.forcesY[index] += (centerY - node.y) * config.centerGravity;
    node.vx = (node.vx + simulation.forcesX[index]) * config.damping;
    node.vy = (node.vy + simulation.forcesY[index]) * config.damping;
    node.x += node.vx;
    node.y += node.vy;

    const minimumX = config.padding + node.collisionRadius;
    const maximumX = simulation.width - config.padding - node.collisionRadius;
    const minimumY = config.padding + node.collisionRadius;
    const maximumY = simulation.height - config.padding - node.collisionRadius;
    if (node.x < minimumX || node.x > maximumX) {
      node.x = clamp(node.x, Math.min(minimumX, centerX), Math.max(maximumX, centerX));
      node.vx *= -config.boundaryBounce;
    }
    if (node.y < minimumY || node.y > maximumY) {
      node.y = clamp(node.y, Math.min(minimumY, centerY), Math.max(maximumY, centerY));
      node.vy *= -config.boundaryBounce;
    }
    energy += node.vx * node.vx + node.vy * node.vy;
  }
  return energy / Math.max(1, simulation.nodes.length - 1);
}

export function stepNoteNetworkSimulation(
  simulation: NoteNetworkSimulation,
  config: Readonly<NoteNetworkPhysicsConfig> = NOTE_NETWORK_PHYSICS,
): number {
  if (simulation.sleeping) return simulation.energy;
  simulation.forcesX.fill(0);
  simulation.forcesY.fill(0);
  applyPairwiseForces(simulation, config);
  applySpringForces(simulation, config);
  simulation.energy = integrateSimulation(simulation, config);
  simulation.frame += 1;
  if (simulation.frame >= config.minimumActiveFrames && simulation.energy <= config.sleepEnergy) {
    simulation.lowEnergyFrames += 1;
    if (simulation.lowEnergyFrames >= config.sleepFrames) {
      simulation.sleeping = true;
      for (const node of simulation.nodes) {
        node.vx = 0;
        node.vy = 0;
      }
      simulation.energy = 0;
    }
  } else {
    simulation.lowEnergyFrames = 0;
  }
  return simulation.energy;
}

export function wakeNoteNetworkSimulation(simulation: NoteNetworkSimulation): void {
  simulation.sleeping = false;
  simulation.lowEnergyFrames = 0;
}

export function settleNoteNetworkSimulation(
  simulation: NoteNetworkSimulation,
  maximumSteps = 2_400,
): number {
  if (!Number.isInteger(maximumSteps) || maximumSteps <= 0) {
    throw new RangeError("Maximum settling steps must be a positive integer");
  }
  wakeNoteNetworkSimulation(simulation);
  let steps = 0;
  while (!simulation.sleeping && steps < maximumSteps) {
    stepNoteNetworkSimulation(simulation);
    steps += 1;
  }
  if (!simulation.sleeping) {
    for (const node of simulation.nodes) {
      node.vx = 0;
      node.vy = 0;
    }
    simulation.energy = 0;
    simulation.lowEnergyFrames = NOTE_NETWORK_PHYSICS.sleepFrames;
    simulation.sleeping = true;
  }
  return steps;
}

export function moveNoteNetworkNode(
  simulation: NoteNetworkSimulation,
  nodeId: string,
  x: number,
  y: number,
): NoteNetworkPhysicsNode {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError("Dragged network coordinates must be finite");
  }
  const node = simulation.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Unknown network node: ${nodeId}`);
  node.dragged = true;
  node.x = x;
  node.y = y;
  node.vx = 0;
  node.vy = 0;
  clampNodeToBounds(node, simulation.width, simulation.height, NOTE_NETWORK_PHYSICS.padding);
  wakeNoteNetworkSimulation(simulation);
  return node;
}

export function releaseNoteNetworkNode(
  simulation: NoteNetworkSimulation,
  nodeId: string,
): NoteNetworkPhysicsNode {
  const node = simulation.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Unknown network node: ${nodeId}`);
  node.dragged = false;
  node.vx = 0;
  node.vy = 0;
  if (node.anchored) {
    node.x = simulation.width / 2;
    node.y = simulation.height / 2;
  }
  wakeNoteNetworkSimulation(simulation);
  return node;
}

export function resizeNoteNetworkSimulation(
  simulation: NoteNetworkSimulation,
  width: number,
  height: number,
): void {
  assertSimulationSize(width, "Network simulation width");
  assertSimulationSize(height, "Network simulation height");
  const previousCenterX = simulation.width / 2;
  const previousCenterY = simulation.height / 2;
  const nextCenterX = width / 2;
  const nextCenterY = height / 2;
  const scaleX = width / simulation.width;
  const scaleY = height / simulation.height;
  simulation.width = width;
  simulation.height = height;
  for (const node of simulation.nodes) {
    node.x = nextCenterX + (node.x - previousCenterX) * scaleX;
    node.y = nextCenterY + (node.y - previousCenterY) * scaleY;
    node.vx *= scaleX;
    node.vy *= scaleY;
    if (node.anchored && !node.dragged) {
      node.x = nextCenterX;
      node.y = nextCenterY;
      node.vx = 0;
      node.vy = 0;
    }
    clampNodeToBounds(node, width, height, NOTE_NETWORK_PHYSICS.padding);
  }
  for (const edge of simulation.edges) {
    edge.targetDistance = targetDistance(edge.edge, width, height);
  }
  wakeNoteNetworkSimulation(simulation);
}

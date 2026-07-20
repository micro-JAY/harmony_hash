import { describe, expect, it } from "vitest";
import { createTheoryContext } from "./theoryContext";
import { buildTheoryRelationshipCatalog } from "./theoryRelationships";
import {
  buildNoteNetworkKnowledgeCatalog,
  createNoteNetworkExplorationState,
  expandNoteNetworkKnowledge,
} from "./noteNetworkKnowledge";
import {
  createNoteNetworkSimulation,
  moveNoteNetworkNode,
  noteNetworkNodeRadius,
  pinNoteNetworkNode,
  reconcileNoteNetworkSimulation,
  releaseNoteNetworkNode,
  resizeNoteNetworkSimulation,
  settleNoteNetworkSimulation,
  stepNoteNetworkSimulation,
  unpinNoteNetworkNode,
  wakeNoteNetworkSimulation,
} from "./noteNetworkPhysics";

const seed = buildTheoryRelationshipCatalog(createTheoryContext({
  root: "E",
  scaleId: "harmonic_minor",
}));
const catalog = buildNoteNetworkKnowledgeCatalog(seed, createNoteNetworkExplorationState(seed));

function minimumNodeDistance(simulation: ReturnType<typeof createNoteNetworkSimulation>): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < simulation.nodes.length; left += 1) {
    for (let right = left + 1; right < simulation.nodes.length; right += 1) {
      minimum = Math.min(minimum, Math.hypot(
        simulation.nodes[left].x - simulation.nodes[right].x,
        simulation.nodes[left].y - simulation.nodes[right].y,
      ));
    }
  }
  return minimum;
}

describe("Note Neural Network physics", () => {
  it("creates deterministic connection-weighted nodes from the relationship catalog", () => {
    const first = createNoteNetworkSimulation(catalog, 820, 620);
    const second = createNoteNetworkSimulation(catalog, 820, 620);
    expect(second.nodes).toEqual(first.nodes);
    expect(second.edges).toEqual(first.edges);
    expect(first.nodes).toHaveLength(catalog.nodes.length);
    expect(first.edges).toHaveLength(catalog.edges.length);
    const selected = first.nodes[first.selectedNodeIndex];
    expect(selected.x).toBe(410);
    expect(selected.y).toBe(310);
    expect(selected.radius).toBeGreaterThan(
      Math.max(...first.nodes.filter((node) => !node.anchored).map((node) => node.radius)),
    );
  });

  it("sizes nodes by connection count without escaping the visual bounds", () => {
    const node = catalog.nodes.find((candidate) => !candidate.selected)!;
    expect(noteNetworkNodeRadius(node, 5)).toBeGreaterThan(noteNetworkNodeRadius(node, 1));
    expect(() => noteNetworkNodeRadius(node, -1)).toThrow(RangeError);
    expect(noteNetworkNodeRadius(catalog.nodes.find((candidate) => candidate.selected)!, 0))
      .toBe(31);
  });

  it("expands the compact seed through repulsion while retaining the exact center anchor", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    const before = minimumNodeDistance(simulation);
    for (let index = 0; index < 120; index += 1) stepNoteNetworkSimulation(simulation);
    expect(minimumNodeDistance(simulation)).toBeGreaterThan(before);
    const selected = simulation.nodes[simulation.selectedNodeIndex];
    expect(selected.x).toBe(410);
    expect(selected.y).toBe(310);
    expect(simulation.energy).toBeGreaterThanOrEqual(0);
  });

  it("keeps the elastic solver active around a directly dragged node", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    settleNoteNetworkSimulation(simulation);
    const neighborEdge = simulation.edges.find((edge) => (
      !simulation.nodes[edge.sourceIndex].anchored
      && !simulation.nodes[edge.targetIndex].anchored
    ))!;
    const dragged = simulation.nodes[neighborEdge.sourceIndex];
    const neighborIndex = neighborEdge.targetIndex;
    const neighbor = simulation.nodes[neighborIndex];
    const before = { x: neighbor.x, y: neighbor.y };
    moveNoteNetworkNode(simulation, dragged.id, 700, 120);
    for (let index = 0; index < 24; index += 1) stepNoteNetworkSimulation(simulation);
    expect(dragged.x).toBe(700);
    expect(dragged.y).toBe(120);
    expect(Math.hypot(neighbor.x - before.x, neighbor.y - before.y)).toBeGreaterThan(0.5);
    releaseNoteNetworkNode(simulation, dragged.id);
    expect(dragged.dragged).toBe(false);
    expect(simulation.sleeping).toBe(false);
  });

  it("restores the selected node to the exact center after a drag", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    const selected = simulation.nodes[simulation.selectedNodeIndex];
    moveNoteNetworkNode(simulation, selected.id, 620, 180);
    expect(selected.x).toBe(620);
    expect(selected.y).toBe(180);
    releaseNoteNetworkNode(simulation, selected.id);
    expect(selected.x).toBe(410);
    expect(selected.y).toBe(310);
  });

  it("pins, repositions, and releases a non-center node without weakening the center anchor", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    settleNoteNetworkSimulation(simulation);
    const node = simulation.nodes.find((candidate) => !candidate.anchored)!;
    pinNoteNetworkNode(simulation, node.id);
    const pinned = { x: node.x, y: node.y };
    for (let index = 0; index < 40; index += 1) stepNoteNetworkSimulation(simulation);
    expect(node).toMatchObject({ pinned: true, pinnedX: pinned.x, pinnedY: pinned.y });
    expect(node.x).toBe(pinned.x);
    expect(node.y).toBe(pinned.y);

    moveNoteNetworkNode(simulation, node.id, 610, 180);
    releaseNoteNetworkNode(simulation, node.id);
    expect(node).toMatchObject({ pinned: true, pinnedX: 610, pinnedY: 180 });
    unpinNoteNetworkNode(simulation, node.id);
    expect(node).toMatchObject({ pinned: false, pinnedX: null, pinnedY: null });
    expect(simulation.nodes[simulation.selectedNodeIndex]).toMatchObject({ x: 410, y: 310 });
  });

  it("reconciles progressive growth without moving retained nodes or losing pins", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    settleNoteNetworkSimulation(simulation);
    const retained = simulation.nodes.find((candidate) => candidate.node.kind === "chord")!;
    pinNoteNetworkNode(simulation, retained.id);
    const before = { x: retained.x, y: retained.y };
    const expandedState = expandNoteNetworkKnowledge(
      seed,
      createNoteNetworkExplorationState(seed),
      seed.selectedNodeId,
    );
    const expandedCatalog = buildNoteNetworkKnowledgeCatalog(seed, expandedState);
    const reconciled = reconcileNoteNetworkSimulation(simulation, expandedCatalog);
    const after = reconciled.nodes.find((candidate) => candidate.id === retained.id)!;

    expect(reconciled.nodes.length).toBeGreaterThan(simulation.nodes.length);
    expect(after).toMatchObject({ x: before.x, y: before.y, pinned: true });
    const newNode = reconciled.nodes.find((candidate) => candidate.id === "note:4")!;
    const parent = reconciled.nodes.find((candidate) => candidate.id === seed.selectedNodeId)!;
    expect(Math.hypot(newNode.x - parent.x, newNode.y - parent.y)).toBeLessThan(100);
  });

  it("settles deterministically and wakes without retaining residual velocity", () => {
    const first = createNoteNetworkSimulation(catalog, 820, 620);
    const second = createNoteNetworkSimulation(catalog, 820, 620);
    const firstSteps = settleNoteNetworkSimulation(first);
    const secondSteps = settleNoteNetworkSimulation(second);
    expect(firstSteps).toBe(secondSteps);
    expect(first.sleeping).toBe(true);
    expect(first.energy).toBe(0);
    expect(second.nodes).toEqual(first.nodes);
    expect(first.nodes.every((node) => node.vx === 0 && node.vy === 0)).toBe(true);
    wakeNoteNetworkSimulation(first);
    expect(first.sleeping).toBe(false);
  });

  it("settles circular node bodies without visual collisions", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    settleNoteNetworkSimulation(simulation);
    for (let left = 0; left < simulation.nodes.length; left += 1) {
      for (let right = left + 1; right < simulation.nodes.length; right += 1) {
        const leftNode = simulation.nodes[left];
        const rightNode = simulation.nodes[right];
        expect(Math.hypot(leftNode.x - rightNode.x, leftNode.y - rightNode.y))
          .toBeGreaterThanOrEqual(leftNode.radius + rightNode.radius);
      }
    }
  });

  it("rescales positions, spring lengths, and bounds without losing center anchoring", () => {
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    settleNoteNetworkSimulation(simulation);
    const previousTarget = simulation.edges[0].targetDistance;
    resizeNoteNetworkSimulation(simulation, 420, 420);
    const selected = simulation.nodes[simulation.selectedNodeIndex];
    expect(selected.x).toBe(210);
    expect(selected.y).toBe(210);
    expect(simulation.edges[0].targetDistance).not.toBe(previousTarget);
    for (const node of simulation.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(node.collisionRadius);
      expect(node.x).toBeLessThanOrEqual(simulation.width - node.collisionRadius);
      expect(node.y).toBeGreaterThanOrEqual(node.collisionRadius);
      expect(node.y).toBeLessThanOrEqual(simulation.height - node.collisionRadius);
    }
  });

  it("rejects unusable sizes and non-finite drag coordinates", () => {
    expect(() => createNoteNetworkSimulation(catalog, 279, 620)).toThrow(RangeError);
    const simulation = createNoteNetworkSimulation(catalog, 820, 620);
    expect(() => moveNoteNetworkNode(simulation, simulation.nodes[0].id, Number.NaN, 10))
      .toThrow(RangeError);
    expect(() => releaseNoteNetworkNode(simulation, "missing")).toThrow(/Unknown network node/);
  });
});

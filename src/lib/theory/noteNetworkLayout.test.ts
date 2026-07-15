import { describe, expect, it } from "vitest";
import {
  buildNoteNetworkLayout,
  calculateNoteNetworkPanBounds,
  clampNoteNetworkPan,
  clampNoteNetworkZoom,
  networkBoundsOverlap,
  wrapNoteNetworkLabel,
  type NetworkBounds,
  type NetworkPoint,
} from "./noteNetworkLayout";
import { createTheoryContext } from "./theoryContext";
import { buildTheoryRelationshipCatalog } from "./theoryRelationships";

function pointOnBoundary(point: NetworkPoint, bounds: NetworkBounds): boolean {
  const epsilon = 0.000_001;
  const withinX = point.x >= bounds.x - epsilon
    && point.x <= bounds.x + bounds.width + epsilon;
  const withinY = point.y >= bounds.y - epsilon
    && point.y <= bounds.y + bounds.height + epsilon;
  const onVertical = Math.abs(point.x - bounds.x) <= epsilon
    || Math.abs(point.x - (bounds.x + bounds.width)) <= epsilon;
  const onHorizontal = Math.abs(point.y - bounds.y) <= epsilon
    || Math.abs(point.y - (bounds.y + bounds.height)) <= epsilon;
  return withinX && withinY && (onVertical || onHorizontal);
}

describe("deterministic Note Neural Network layout", () => {
  const catalog = buildTheoryRelationshipCatalog(createTheoryContext());

  it("returns the same clustered geometry for repeated contexts", () => {
    const first = buildNoteNetworkLayout(catalog, { width: 900 });
    const second = buildNoteNetworkLayout(catalog, { width: 900 });
    expect(second).toEqual(first);
    expect(first.clusters.map((cluster) => cluster.id)).toEqual([
      "context", "keys", "modes", "chords",
    ]);
  });

  it("protects center clearance and prevents final node collisions", () => {
    const layout = buildNoteNetworkLayout(catalog, { width: 900 });
    const selected = layout.nodes.find((node) => node.node.id === layout.selectedNodeId);
    expect(selected?.x).toBe(450);
    expect(selected?.bounds.y).toBe(layout.padding);
    for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
        expect(
          networkBoundsOverlap(
            layout.nodes[leftIndex].labelBounds,
            layout.nodes[rightIndex].labelBounds,
          ),
          `${layout.nodes[leftIndex].node.id} overlaps ${layout.nodes[rightIndex].node.id}`,
        ).toBe(false);
      }
    }
    const nearestNonSelectedTop = Math.min(
      ...layout.nodes
        .filter((node) => node.node.id !== layout.selectedNodeId)
        .map((node) => node.bounds.y),
    );
    expect(nearestNonSelectedTop - (selected?.bounds.y ?? 0) - (selected?.height ?? 0))
      .toBeGreaterThanOrEqual(34);
  });

  it("terminates every edge at both protected label boundaries", () => {
    const layout = buildNoteNetworkLayout(catalog, { width: 900 });
    const nodes = new Map(layout.nodes.map((node) => [node.node.id, node]));
    for (const edge of layout.edges) {
      const source = nodes.get(edge.edge.sourceId);
      const target = nodes.get(edge.edge.targetId);
      expect(source).toBeDefined();
      expect(target).toBeDefined();
      expect(pointOnBoundary(edge.start, source!.labelBounds), edge.edge.id).toBe(true);
      expect(pointOnBoundary(edge.end, target!.labelBounds), edge.edge.id).toBe(true);
      expect(edge.start).not.toEqual({ x: source!.x, y: source!.y });
      expect(edge.end).not.toEqual({ x: target!.x, y: target!.y });
    }
  });

  it("provides bounded two-line metadata while retaining the full label", () => {
    expect(wrapNoteNetworkLabel("C Mixolydian Flat Six Relationship", 14)).toEqual({
      fullLabel: "C Mixolydian Flat Six Relationship",
      lines: ["C Mixolydian", "Flat Six…"],
      truncated: true,
      maxLines: 2,
    });
    const layout = buildNoteNetworkLayout(catalog, { width: 343 });
    expect(layout.nodes.every((node) => node.label.lines.length <= 2)).toBe(true);
    expect(layout.nodes.every((node) => node.label.fullLabel === node.node.label)).toBe(true);
  });

  it("contains every final node inside desktop and mobile viewports", () => {
    for (const width of [900, 343]) {
      const layout = buildNoteNetworkLayout(catalog, { width });
      for (const node of layout.nodes) {
        expect(node.bounds.x).toBeGreaterThanOrEqual(layout.padding);
        expect(node.bounds.x + node.bounds.width).toBeLessThanOrEqual(width - layout.padding);
        expect(node.bounds.y).toBeGreaterThanOrEqual(layout.padding);
        expect(node.bounds.y + node.bounds.height).toBeLessThanOrEqual(
          layout.height - layout.padding,
        );
      }
      expect(layout.width).toBe(width);
      expect(layout.height).toBeGreaterThan(0);
    }
  });

  it("renders directly at final positions for reduced motion", () => {
    const reduced = buildNoteNetworkLayout(catalog, { width: 720, reducedMotion: true });
    expect(reduced.nodes.every((node) => node.animate === false)).toBe(true);
    expect(reduced.nodes.every((node) => node.initialX === node.x && node.initialY === node.y))
      .toBe(true);
    const animated = buildNoteNetworkLayout(catalog, { width: 720 });
    expect(animated.nodes.some((node) => node.initialY !== node.y)).toBe(true);
  });

  it("bounds zoom and rejects unusable viewport values", () => {
    expect(clampNoteNetworkZoom(0)).toBe(0.65);
    expect(clampNoteNetworkZoom(1.2)).toBe(1.2);
    expect(clampNoteNetworkZoom(4)).toBe(1.8);
    expect(() => clampNoteNetworkZoom(Number.NaN)).toThrow(RangeError);
    expect(() => buildNoteNetworkLayout(catalog, { width: 279 })).toThrow(/at least 280px/);
  });

  it("derives vertical pan reach from graph height at mobile width", () => {
    const layout = buildNoteNetworkLayout(catalog, { width: 343 });
    const bounds = calculateNoteNetworkPanBounds(
      layout.width,
      layout.height,
      343,
      544,
      1,
    );
    expect(bounds.minY).toBe(544 - layout.height);
    expect(bounds.minY).toBeLessThan(-100);
    expect(bounds.maxY).toBe(0);
    expect(clampNoteNetworkPan({ x: 0, y: -10_000 }, bounds).y).toBe(bounds.minY);
    expect(clampNoteNetworkPan({ x: 0, y: 10_000 }, bounds).y).toBe(bounds.maxY);
  });
});

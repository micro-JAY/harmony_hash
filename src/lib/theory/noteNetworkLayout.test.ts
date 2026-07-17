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

  it("returns the same radial geometry for repeated contexts", () => {
    const first = buildNoteNetworkLayout(catalog, { width: 900 });
    const second = buildNoteNetworkLayout(catalog, { width: 900 });
    expect(second).toEqual(first);
    expect(first.clusters.map((cluster) => cluster.id)).toEqual([
      "context", "keys", "modes", "chords",
    ]);
  });

  it("centers the active scale and prevents final node collisions", () => {
    const layout = buildNoteNetworkLayout(catalog, { width: 900 });
    const selected = layout.nodes.find((node) => node.node.id === layout.selectedNodeId);
    expect(selected?.x).toBe(450);
    expect(selected?.y).toBe(layout.height / 2);
    expect(layout.projection).toBe("desktop-radial");
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
  });

  it("keeps every family collision-free across supported desktop pane widths", () => {
    const contexts = [
      createTheoryContext({ root: "C", scaleId: "major" }),
      createTheoryContext({ root: "E", scaleId: "harmonic_minor" }),
      createTheoryContext({ root: "D", scaleId: "dorian" }),
      createTheoryContext({ root: "Bb", scaleId: "melodic_minor" }),
    ];
    for (const context of contexts) {
      const contextCatalog = buildTheoryRelationshipCatalog(context);
      for (const width of [720, 826, 900]) {
        const layout = buildNoteNetworkLayout(contextCatalog, { width });
        for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
            expect(
              networkBoundsOverlap(
                layout.nodes[leftIndex].labelBounds,
                layout.nodes[rightIndex].labelBounds,
              ),
              `${context.root} ${context.scaleId} at ${width}px: ${layout.nodes[leftIndex].node.id} overlaps ${layout.nodes[rightIndex].node.id}`,
            ).toBe(false);
          }
        }
      }
    }
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
    const layout = buildNoteNetworkLayout(catalog, { width: 343, mobileStatic: true });
    expect(layout.nodes.every((node) => node.label.lines.length <= 2)).toBe(true);
    expect(layout.nodes.every((node) => node.label.fullLabel === node.node.label)).toBe(true);
  });

  it("contains every final node inside desktop and mobile viewports", () => {
    for (const [width, mobileStatic] of [[900, false], [343, true]] as const) {
      const layout = buildNoteNetworkLayout(catalog, { width, mobileStatic });
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
    const mobile = buildNoteNetworkLayout(catalog, { width: 343, mobileStatic: true });
    expect(mobile.nodes.every((node) => node.animate === false)).toBe(true);
    expect(mobile.projection).toBe("mobile-static");
  });

  it("bounds zoom and rejects unusable viewport values", () => {
    expect(clampNoteNetworkZoom(0)).toBe(0.65);
    expect(clampNoteNetworkZoom(1.2)).toBe(1.2);
    expect(clampNoteNetworkZoom(4)).toBe(1.8);
    expect(() => clampNoteNetworkZoom(Number.NaN)).toThrow(RangeError);
    expect(() => buildNoteNetworkLayout(catalog, { width: 279 })).toThrow(/at least 280px/);
  });

  it("limits the mobile projection while retaining all desktop nodes", () => {
    const desktop = buildNoteNetworkLayout(catalog, { width: 900 });
    const mobile = buildNoteNetworkLayout(catalog, { width: 343, mobileStatic: true });
    expect(desktop.nodes).toHaveLength(catalog.nodes.length);
    expect(mobile.nodes).toHaveLength(11);
    expect(mobile.nodes.filter((node) => node.node.chordSymbol)).toHaveLength(4);
    expect(mobile.nodes.filter((node) => (
      node.node.id !== mobile.selectedNodeId && !node.node.chordSymbol
    ))).toHaveLength(6);
    expect(mobile.edges.every((edge) => (
      mobile.nodes.some((node) => node.node.id === edge.edge.sourceId)
      && mobile.nodes.some((node) => node.node.id === edge.edge.targetId)
    ))).toBe(true);

    const bounds = calculateNoteNetworkPanBounds(
      desktop.width,
      desktop.height,
      720,
      544,
      1.2,
    );
    expect(bounds.minY).toBeLessThan(0);
    expect(bounds.maxY).toBe(0);
    expect(clampNoteNetworkPan({ x: 0, y: -10_000 }, bounds).y).toBe(bounds.minY);
  });
});

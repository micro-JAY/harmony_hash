import { describe, expect, it } from "vitest";
import { createTheoryContext } from "./theoryContext";
import {
  buildTheoryRelationshipCatalog,
  selectCircleRelationshipEdges,
} from "./theoryRelationships";

describe("shared Theory relationship catalog", () => {
  const catalog = buildTheoryRelationshipCatalog(createTheoryContext());

  it("publishes stable unique ids and localization keys", () => {
    expect(new Set(catalog.nodes.map((node) => node.id)).size).toBe(catalog.nodes.length);
    expect(new Set(catalog.edges.map((edge) => edge.id)).size).toBe(catalog.edges.length);
    expect(catalog.edges.every((edge) => edge.explanationKey.startsWith("theory.relationship.")))
      .toBe(true);
    expect(catalog.edges.every((edge) => edge.strength >= 1 && edge.strength <= 3)).toBe(true);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.nodes)).toBe(true);
    expect(Object.isFrozen(catalog.edges)).toBe(true);
  });

  it("hand-authors both close fifth relationships as strong and bidirectional", () => {
    const fifths = catalog.edges.filter((edge) => edge.kind === "fifths");
    expect(fifths.map((edge) => edge.targetId)).toEqual(["key:F", "key:G"]);
    expect(fifths.every((edge) => edge.strength === 3)).toBe(true);
    expect(fifths.every((edge) => edge.direction === "bidirectional")).toBe(true);
  });

  it("identifies the relative major/minor relationship", () => {
    expect(catalog.edges.find((edge) => edge.kind === "relative_major_minor")).toMatchObject({
      sourceId: "scale:C:major",
      targetId: "scale:A:natural_minor",
      strength: 3,
      strengthLabel: "strong",
      direction: "bidirectional",
    });
  });

  it("groups relative modal-family relationships deterministically", () => {
    const modalEdges = catalog.edges.filter((edge) => edge.kind === "modal_family");
    expect(modalEdges).toHaveLength(6);
    expect(modalEdges.some((edge) => edge.targetId === "scale:D:dorian")).toBe(true);
    expect(modalEdges.every((edge) => edge.strengthLabel === "medium")).toBe(true);
  });

  it("switches to same-root modal relationships for parallel exploration", () => {
    const parallel = buildTheoryRelationshipCatalog(createTheoryContext({
      selectedRelationshipId: "parallel",
    }));
    const modalTargets = parallel.edges
      .filter((edge) => edge.kind === "modal_family")
      .map((edge) => edge.targetId);
    expect(modalTargets).toContain("scale:C:dorian");
    expect(modalTargets).not.toContain("scale:D:dorian");
  });

  it("uses supported flat spellings for natural-root modal parent keys", () => {
    const dorian = buildTheoryRelationshipCatalog(createTheoryContext({
      root: "C",
      scaleId: "dorian",
    }));
    expect(dorian.nodes.some((node) => node.id === "scale:Bb:major")).toBe(true);
    expect(dorian.nodes.some((node) => node.label.includes("B#"))).toBe(false);
  });

  it("keeps sharp modal contexts usable when a sibling needs a double accidental", () => {
    const lydian = buildTheoryRelationshipCatalog(createTheoryContext({
      root: "F#",
      scaleId: "lydian",
    }));

    expect(lydian.nodes.some((node) => node.label === "F# Lydian")).toBe(true);
    expect(lydian.nodes.every((node) => !node.label.startsWith("B# "))).toBe(true);
    expect(lydian.nodes.filter((node) => node.cluster === "modes").length).toBeGreaterThan(3);
  });

  it("describes diatonic chord functions with hand-authored strengths", () => {
    const byTarget = new Map(
      catalog.edges
        .filter((edge) => edge.kind === "diatonic_function")
        .map((edge) => [edge.targetId, edge]),
    );
    expect(byTarget.get("chord:C")).toMatchObject({ strength: 3, direction: "outbound" });
    expect(byTarget.get("chord:F")).toMatchObject({ strength: 2, direction: "outbound" });
    expect(byTarget.get("chord:G")).toMatchObject({ strength: 3, direction: "outbound" });
    expect(catalog.nodes.find((node) => node.id === "chord:C")?.functionKey)
      .toBe("theory.function.tonic");
    expect(catalog.nodes.find((node) => node.id === "chord:G")?.functionKey)
      .toBe("theory.function.dominant");
  });

  it("models V/V as a directed secondary dominant", () => {
    expect(catalog.edges.find((edge) => edge.kind === "secondary_dominant")).toMatchObject({
      sourceId: "chord:D7",
      targetId: "chord:G",
      strength: 2,
      direction: "outbound",
      explanationKey: "theory.relationship.secondaryDominant",
    });
  });

  it("retains an explicitly weak distant relationship", () => {
    expect(catalog.edges.find((edge) => edge.kind === "distant")).toMatchObject({
      sourceId: "scale:C:major",
      targetId: "key:F#",
      strength: 1,
      strengthLabel: "weak",
      direction: "bidirectional",
    });
  });

  it("selects a compact Circle summary with keys, modes, chord functions, and weak contrast", () => {
    const selected = selectCircleRelationshipEdges(catalog);
    expect(selected.map((edge) => edge.kind)).toEqual([
      "fifths",
      "fifths",
      "relative_major_minor",
      "modal_family",
      "diatonic_function",
      "diatonic_function",
      "diatonic_function",
      "distant",
    ]);
    const nodeById = new Map(catalog.nodes.map((node) => [node.id, node]));
    expect(selected
      .filter((edge) => edge.kind === "diatonic_function")
      .map((edge) => nodeById.get(edge.targetId)?.functionKey))
      .toEqual([
        "theory.function.tonic",
        "theory.function.predominant",
        "theory.function.dominant",
      ]);
    expect(selected
      .filter((edge) => edge.kind === "diatonic_function")
      .map((edge) => edge.targetId))
      .toEqual(["chord:C", "chord:Dm", "chord:G"]);
    expect(selected.at(-1)).toMatchObject({ kind: "distant", strengthLabel: "weak" });
    expect(Object.isFrozen(selected)).toBe(true);
  });

  it("returns byte-for-byte stable results for the same context", () => {
    const repeated = buildTheoryRelationshipCatalog(createTheoryContext());
    expect(repeated).toEqual(catalog);
  });
});

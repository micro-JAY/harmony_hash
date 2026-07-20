import { describe, expect, it } from "vitest";
import { createTheoryContext } from "./theoryContext";
import { buildTheoryRelationshipCatalog } from "./theoryRelationships";
import {
  buildNoteNetworkKnowledgeCatalog,
  clearNoteNetworkExploration,
  collapseNoteNetworkKnowledgeBranch,
  createNoteNetworkExplorationState,
  expandNoteNetworkKnowledge,
  NOTE_NETWORK_MAX_EDGES,
  NOTE_NETWORK_MAX_EXPANSIONS,
  NOTE_NETWORK_MAX_NODES,
} from "./noteNetworkKnowledge";

function setup(
  overrides: Parameters<typeof createTheoryContext>[0] = {},
) {
  const seed = buildTheoryRelationshipCatalog(createTheoryContext(overrides));
  const state = createNoteNetworkExplorationState(seed);
  return { seed, state };
}

describe("Note Neural Network progressive knowledge", () => {
  it("wraps the Circle seed without changing its stable catalog", () => {
    const { seed, state } = setup();
    const before = JSON.stringify(seed);
    const catalog = buildNoteNetworkKnowledgeCatalog(seed, state);

    expect(catalog.nodes).toHaveLength(seed.nodes.length);
    expect(catalog.edges).toHaveLength(seed.edges.length);
    expect(catalog.nodes.every((node) => node.kind === "scale" || node.kind === "chord"))
      .toBe(true);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it("adds scale degrees, chords, neighboring scales, and characteristic evidence idempotently", () => {
    const { seed, state } = setup({ root: "C", scaleId: "lydian" });
    const expanded = expandNoteNetworkKnowledge(seed, state, seed.selectedNodeId);
    const repeated = expandNoteNetworkKnowledge(seed, expanded, seed.selectedNodeId);
    const catalog = buildNoteNetworkKnowledgeCatalog(seed, expanded);

    expect(repeated).toBe(expanded);
    expect(catalog.nodes).toContainEqual(expect.objectContaining({
      id: "interval:scale:C:lydian:6",
      kind: "interval",
      label: "#4 · F#",
      degreeLabel: "#4",
    }));
    expect(catalog.nodes).toContainEqual(expect.objectContaining({
      id: "note:6",
      kind: "note",
      label: "F#",
    }));
    expect(catalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "interval:scale:C:lydian:6",
      targetId: "note:6",
      evidence: "#4 is spelled F# in C Lydian",
    }));
    expect(catalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "scale:C:lydian",
      targetId: "chord:D",
      kind: "diatonic_function",
      evidence: "D belongs to C Lydian · theory.function.predominant",
    }));
    expect(catalog.nodes).toContainEqual(expect.objectContaining({
      id: "chord:D",
      functionKey: "theory.function.predominant",
    }));
    expect(catalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "scale:C:lydian",
      targetId: "scale:C:major",
      kind: "modal_family",
      evidence: "Shares 6/7 notes · F# → F",
    }));
    expect(catalog.nodes.find((node) => node.id === seed.selectedNodeId)?.evidence.join(" "))
      .toContain("Raised fourth");
  });

  it("gives an expanded related scale its own functional chord and parallel-scale edges", () => {
    const { seed, state } = setup({ root: "C", scaleId: "major" });
    const expanded = expandNoteNetworkKnowledge(seed, state, "scale:D:dorian");
    const catalog = buildNoteNetworkKnowledgeCatalog(seed, expanded);

    expect(catalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "scale:D:dorian",
      targetId: "chord:Dm",
      kind: "diatonic_function",
      evidence: "Dm belongs to D Dorian · theory.function.tonic",
    }));
    expect(catalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "scale:D:dorian",
      targetId: "scale:D:natural_minor",
      kind: "modal_family",
      evidence: "Shares 6/7 notes · B → Bb",
    }));

    const neighboringKey = expandNoteNetworkKnowledge(seed, state, "key:F");
    const neighboringCatalog = buildNoteNetworkKnowledgeCatalog(seed, neighboringKey);
    expect(neighboringCatalog.nodes).toContainEqual(expect.objectContaining({
      id: "chord:Bb",
      kind: "chord",
      functionKey: "theory.function.predominant",
      evidence: expect.arrayContaining(["Scale degree 4: F major"]),
    }));
  });

  it("names same-collection and changed-tone modal evidence", () => {
    const relative = buildNoteNetworkKnowledgeCatalog(
      buildTheoryRelationshipCatalog(createTheoryContext({ root: "C", scaleId: "major" })),
      createNoteNetworkExplorationState(
        buildTheoryRelationshipCatalog(createTheoryContext({ root: "C", scaleId: "major" })),
      ),
    );
    expect(relative.edges.find((edge) => edge.targetId === "scale:D:dorian")?.evidence)
      .toBe("Same 7 notes · tonal center C → D");

    const { seed, state } = setup({
      root: "C",
      scaleId: "lydian",
      selectedRelationshipId: "parallel",
    });
    const parallel = buildNoteNetworkKnowledgeCatalog(seed, state);
    const ionian = parallel.edges.find((edge) => edge.targetId === "scale:C:major");
    expect(ionian?.evidence).toContain("Shares 6/7 notes");
    expect(ionian?.evidence).toContain("F# → F");
  });

  it("expands chords with tones, roles, exact scale fits, voice leading, and resolution", () => {
    const { seed, state } = setup({ root: "C", scaleId: "major" });
    const cExpanded = expandNoteNetworkKnowledge(seed, state, "chord:C");
    const cCatalog = buildNoteNetworkKnowledgeCatalog(seed, cExpanded);

    expect(cCatalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "chord:C",
      targetId: "note:4",
      kind: "chord_tone",
      evidence: "E is the 3 of C",
    }));
    expect(cCatalog.edges.some((edge) => (
      edge.kind === "compatible_scale"
      && edge.sourceId === "chord:C"
      && edge.evidence === "3/3 chord tones fit C Major (Ionian)"
    ))).toBe(true);
    expect(cCatalog.edges.some((edge) => (
      edge.kind === "voice_leading"
      && edge.sourceId === "chord:C"
      && edge.evidence.includes("shares C · E")
    ))).toBe(true);
    const voiceLeadingPairs = cCatalog.edges.filter((edge) => edge.kind === "voice_leading")
      .map((edge) => [edge.sourceId, edge.targetId].sort().join("↔"));
    expect(new Set(voiceLeadingPairs).size).toBe(voiceLeadingPairs.length);

    const dominantState = expandNoteNetworkKnowledge(seed, state, "chord:D7");
    const dominantCatalog = buildNoteNetworkKnowledgeCatalog(seed, dominantState);
    expect(dominantCatalog.edges).toContainEqual(expect.objectContaining({
      sourceId: "chord:D7",
      targetId: "chord:G",
      kind: "resolves_to",
      evidence: "Dominant resolution · D7 → G",
      direction: "outbound",
    }));
  });

  it("collapses unreachable descendants and clears back to the immutable seed", () => {
    const { seed, state } = setup({ root: "C", scaleId: "major" });
    const chordExpanded = expandNoteNetworkKnowledge(seed, state, "chord:C");
    const chordCatalog = buildNoteNetworkKnowledgeCatalog(seed, chordExpanded);
    const addedScale = chordCatalog.nodes.find((node) => (
      node.kind === "scale" && !chordCatalog.seedNodeIds.includes(node.id)
    ));
    expect(addedScale).toBeDefined();
    const descendantExpanded = expandNoteNetworkKnowledge(seed, chordExpanded, addedScale!.id);
    const collapsed = collapseNoteNetworkKnowledgeBranch(seed, descendantExpanded, "chord:C");
    const collapsedCatalog = buildNoteNetworkKnowledgeCatalog(seed, collapsed);

    expect(collapsed.expandedNodeIds).not.toContain("chord:C");
    expect(collapsed.expandedNodeIds).not.toContain(addedScale!.id);
    expect(collapsedCatalog.nodes.map((node) => node.id)).not.toContain(addedScale!.id);

    const cleared = clearNoteNetworkExploration(seed);
    const clearedCatalog = buildNoteNetworkKnowledgeCatalog(seed, cleared);
    expect(clearedCatalog.nodes).toHaveLength(seed.nodes.length);
    expect(clearedCatalog.expandedNodeIds).toEqual([]);
  });

  it("deduplicates stable IDs, caps growth, and freezes public results", () => {
    const { seed, state } = setup({ root: "C", scaleId: "major" });
    let next = state;
    for (const node of buildNoteNetworkKnowledgeCatalog(seed, next).nodes) {
      next = expandNoteNetworkKnowledge(seed, next, node.id);
    }
    const catalog = buildNoteNetworkKnowledgeCatalog(seed, next);

    expect(catalog.expandedNodeIds.length).toBeLessThanOrEqual(NOTE_NETWORK_MAX_EXPANSIONS);
    expect(catalog.nodes.length).toBeLessThanOrEqual(NOTE_NETWORK_MAX_NODES);
    expect(catalog.edges.length).toBeLessThanOrEqual(NOTE_NETWORK_MAX_EDGES);
    expect(new Set(catalog.nodes.map((node) => node.id)).size).toBe(catalog.nodes.length);
    expect(new Set(catalog.edges.map((edge) => edge.id)).size).toBe(catalog.edges.length);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.nodes)).toBe(true);
    expect(Object.isFrozen(catalog.edges)).toBe(true);
    expect(catalog.nodes.every(Object.isFrozen)).toBe(true);
    expect(catalog.edges.every(Object.isFrozen)).toBe(true);
  });
});

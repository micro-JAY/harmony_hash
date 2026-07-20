import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowRight,
  CircleHelp,
  Network,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import {
  buildModeNetwork,
  buildNoteNetworkKnowledgeCatalog,
  buildNoteNetworkLayout,
  buildTheoryRelationshipCatalog,
  clearNoteNetworkExploration,
  collapseNoteNetworkKnowledgeBranch,
  createNoteNetworkExplorationState,
  createTheoryContext,
  expandNoteNetworkKnowledge,
  modeFamilyForScale,
  MODE_FAMILIES,
  NOTE_NETWORK_EDGE_STYLES,
  pitchClassOf,
  scaleIntervalFormulaFor,
  spellScaleNotes,
  wrapNoteNetworkLabel,
  type ModeFamilyId,
  type ModeRelationship,
  type NoteNetworkExplorationState,
  type NoteNetworkKnowledgeNode,
  type NoteNetworkKnowledgeRelationshipKind,
  type ScaleFormulaType,
} from "../lib/theory";
import { useT } from "../i18n/I18nContext";
import { chordFamilyPresentation } from "../lib/visual/chordFamily";
import { intervalColor } from "../lib/visual/musicVisuals";
import AccessibleDialog from "./AccessibleDialog";
import {
  WorkspaceHeader,
  WorkspaceSegmentedControl,
  WorkspaceSelectControl,
} from "./WorkspaceChrome";
import NoteNetworkCanvas, { type NoteNetworkCanvasTone } from "./NoteNetworkCanvas";

export interface NoteNeuralNetworkState {
  readonly root: string;
  readonly familyId: ModeFamilyId;
  readonly relationship: ModeRelationship;
  readonly selectedScaleId: ScaleFormulaType;
}

interface NoteNeuralNetworkProps {
  onOpenScale: (root: string, scaleId: ScaleFormulaType) => void;
  state: NoteNeuralNetworkState;
  onStateChange: (state: NoteNeuralNetworkState) => void;
  embedded?: boolean;
  active?: boolean;
}

interface GraphViewportSize {
  readonly width: number;
  readonly height: number;
}

interface NetworkContextMemory {
  readonly catalogId: string;
  readonly exploration: NoteNetworkExplorationState;
  readonly pinnedNodeIds: ReadonlyArray<string>;
  readonly selectedNodeId: string;
}

const DEFAULT_LAYOUT_WIDTH = 760;
const DEFAULT_VIEWPORT_HEIGHT = 544;
const MAX_REMEMBERED_NETWORK_CONTEXTS = 8;
const MOBILE_GRAPH_QUERY = "(max-width: 639px)";
const NODE_KIND_CUES = Object.freeze({
  scale: "◎",
  chord: "△",
  note: "●",
  interval: "□",
} as const);

function useMobileStaticGraph(): boolean {
  const [mobile, setMobile] = useState(() => (
    typeof window !== "undefined" && window.matchMedia(MOBILE_GRAPH_QUERY).matches
  ));
  useEffect(() => {
    const query = window.matchMedia(MOBILE_GRAPH_QUERY);
    const update = (): void => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}

function edgeColor(kind: NoteNetworkKnowledgeRelationshipKind): string {
  if (kind === "fifths" || kind === "relative_major_minor" || kind === "scale_degree") {
    return "var(--text-accent)";
  }
  if (kind === "modal_family" || kind === "compatible_scale" || kind === "interval_spelling") {
    return "var(--text-academy)";
  }
  if (kind === "diatonic_function" || kind === "secondary_dominant"
    || kind === "voice_leading" || kind === "resolves_to") {
    return "var(--interactive-warm-text)";
  }
  if (kind === "chord_tone") return "var(--text-primary)";
  return "var(--text-muted)";
}

function nodeTone(node: NoteNetworkKnowledgeNode, contextRoot: string): NoteNetworkCanvasTone {
  if (node.chordSymbol) {
    const presentation = chordFamilyPresentation(node.chordSymbol);
    return {
      background: presentation.backgroundColor,
      border: presentation.borderColor,
      text: presentation.color,
    };
  }
  if (node.kind === "note" || node.kind === "interval") {
    const rootPitchClass = pitchClassOf(contextRoot);
    const chromaticInterval = node.interval
      ?? ((node.pitchClass ?? rootPitchClass) - rootPitchClass + 12) % 12;
    const color = intervalColor(chromaticInterval);
    return { background: "transparent", border: color, text: color };
  }
  if (node.selected || node.cluster === "scales" || node.cluster === "context") {
    return {
      background: "var(--interactive-academy-bg)",
      border: "var(--interactive-academy-border)",
      text: "var(--interactive-academy-text)",
    };
  }
  return {
    background: "var(--interactive-secondary-bg)",
    border: "var(--interactive-secondary-border)",
    text: "var(--interactive-secondary-text)",
  };
}

function catalogIdentity(
  selectedNodeId: string,
  familyId: ModeFamilyId,
  relationship: ModeRelationship,
): string {
  return `${selectedNodeId}:${familyId}:${relationship}`;
}

function rememberNetworkContext(
  memories: ReadonlyArray<NetworkContextMemory>,
  next: NetworkContextMemory,
): ReadonlyArray<NetworkContextMemory> {
  return Object.freeze([
    ...memories.filter((memory) => memory.catalogId !== next.catalogId),
    next,
  ].slice(-MAX_REMEMBERED_NETWORK_CONTEXTS));
}

export default function NoteNeuralNetwork({
  onOpenScale,
  state,
  onStateChange,
  embedded = false,
  active = true,
}: NoteNeuralNetworkProps) {
  const t = useT();
  const reduceMotion = Boolean(useReducedMotion());
  const mobileStatic = useMobileStaticGraph();
  const { root, familyId, relationship, selectedScaleId } = state;
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const semanticNodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pinAnnouncement, setPinAnnouncement] = useState("");
  const [graphViewportSize, setGraphViewportSize] = useState<GraphViewportSize>({
    width: DEFAULT_LAYOUT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  });
  const context = useMemo(
    () => createTheoryContext({
      root,
      scaleId: selectedScaleId,
      selectedRelationshipId: relationship,
    }),
    [relationship, root, selectedScaleId],
  );
  const seedCatalog = useMemo(() => buildTheoryRelationshipCatalog(context), [context]);
  const currentCatalogId = catalogIdentity(seedCatalog.selectedNodeId, familyId, relationship);
  const defaultContextMemory = useMemo<NetworkContextMemory>(() => ({
    catalogId: currentCatalogId,
    exploration: createNoteNetworkExplorationState(seedCatalog),
    pinnedNodeIds: Object.freeze([]),
    selectedNodeId: seedCatalog.selectedNodeId,
  }), [currentCatalogId, seedCatalog]);
  const [contextMemories, setContextMemories] = useState<ReadonlyArray<NetworkContextMemory>>(
    () => Object.freeze([defaultContextMemory]),
  );
  const currentMemory = contextMemories.find((memory) => memory.catalogId === currentCatalogId)
    ?? defaultContextMemory;
  const explorationState = currentMemory.exploration;
  const pinnedNodeIds = useMemo(
    () => new Set(currentMemory.pinnedNodeIds),
    [currentMemory.pinnedNodeIds],
  );
  const catalog = useMemo(
    () => buildNoteNetworkKnowledgeCatalog(seedCatalog, explorationState),
    [explorationState, seedCatalog],
  );
  const expandedNodeIds = useMemo(() => new Set(catalog.expandedNodeIds), [catalog.expandedNodeIds]);
  const selectedNodeId = currentMemory.selectedNodeId;
  const selectedNode = catalog.nodes.find((node) => node.id === selectedNodeId)
    ?? catalog.nodes.find((node) => node.id === catalog.selectedNodeId)
    ?? catalog.nodes[0];
  const detailCatalog = useMemo(() => {
    if (!selectedNode.expandable || expandedNodeIds.has(selectedNode.id)) return catalog;
    const preview = expandNoteNetworkKnowledge(seedCatalog, explorationState, selectedNode.id);
    return buildNoteNetworkKnowledgeCatalog(seedCatalog, preview);
  }, [catalog, expandedNodeIds, explorationState, seedCatalog, selectedNode]);
  const detailNode = detailCatalog.nodes.find((node) => node.id === selectedNode.id) ?? selectedNode;
  const selectedNodeFamily = selectedNode.chordSymbol
    ? chordFamilyPresentation(selectedNode.chordSymbol)
    : null;
  const relatedEdges = detailCatalog.edges.filter((edge) => (
    edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id
  ));
  const mobileLayout = useMemo(() => buildNoteNetworkLayout(seedCatalog, {
    width: Math.max(280, graphViewportSize.width),
    reducedMotion: true,
    mobileStatic: true,
  }), [graphViewportSize.width, seedCatalog]);
  const localizedCanvasLabels = useMemo(() => new Map(
    catalog.nodes.map((node) => [node.id, t(node.label)]),
  ), [catalog.nodes, t]);
  const toneForNode = useMemo(
    () => (node: NoteNetworkKnowledgeNode): NoteNetworkCanvasTone => nodeTone(node, root),
    [root],
  );

  useEffect(() => {
    if (!active || !mobileStatic) return;
    const container = graphContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 280 || height <= 0) return;
      setGraphViewportSize((current) => {
        const next = { width: Math.min(900, width), height };
        return current.width === next.width && current.height === next.height ? current : next;
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [active, mobileStatic]);

  function memoryForCurrentCatalog(
    memories: ReadonlyArray<NetworkContextMemory>,
  ): NetworkContextMemory {
    return memories.find((memory) => memory.catalogId === currentCatalogId)
      ?? defaultContextMemory;
  }

  function replaceExploration(
    memories: ReadonlyArray<NetworkContextMemory>,
    current: NetworkContextMemory,
    next: NoteNetworkExplorationState,
    selectedNodeId = current.selectedNodeId,
  ): ReadonlyArray<NetworkContextMemory> {
    const nextCatalog = buildNoteNetworkKnowledgeCatalog(seedCatalog, next);
    const visible = new Set(nextCatalog.nodes.map((node) => node.id));
    return rememberNetworkContext(memories, {
      catalogId: currentCatalogId,
      exploration: next,
      pinnedNodeIds: Object.freeze(current.pinnedNodeIds.filter((nodeId) => visible.has(nodeId))),
      selectedNodeId: visible.has(selectedNodeId) ? selectedNodeId : nextCatalog.selectedNodeId,
    });
  }

  function handleFamilyChange(nextFamily: ModeFamilyId): void {
    const nextNetwork = buildModeNetwork(root, nextFamily, relationship);
    onStateChange({
      ...state,
      familyId: nextFamily,
      selectedScaleId: nextNetwork.nodes[0].scaleId,
    });
  }

  function handleRelationshipChange(nextRelationship: ModeRelationship): void {
    onStateChange({ ...state, relationship: nextRelationship });
  }

  function inspectNode(node: NoteNetworkKnowledgeNode): void {
    setContextMemories((memories) => {
      const current = memoryForCurrentCatalog(memories);
      return rememberNetworkContext(memories, { ...current, selectedNodeId: node.id });
    });
  }

  function expandNode(node: NoteNetworkKnowledgeNode): void {
    setContextMemories((memories) => {
      const current = memoryForCurrentCatalog(memories);
      const next = expandNoteNetworkKnowledge(seedCatalog, current.exploration, node.id);
      return replaceExploration(memories, current, next, node.id);
    });
  }

  function collapseNode(node: NoteNetworkKnowledgeNode): void {
    setContextMemories((memories) => {
      const current = memoryForCurrentCatalog(memories);
      const next = collapseNoteNetworkKnowledgeBranch(seedCatalog, current.exploration, node.id);
      return replaceExploration(memories, current, next);
    });
  }

  function clearExploration(): void {
    setContextMemories((memories) => {
      const current = memoryForCurrentCatalog(memories);
      return replaceExploration(
        memories,
        current,
        clearNoteNetworkExploration(seedCatalog),
        seedCatalog.selectedNodeId,
      );
    });
  }

  function makeCenter(node: NoteNetworkKnowledgeNode): void {
    if (node.kind !== "scale" || !node.root || !node.scaleId) return;
    const nextFamily = modeFamilyForScale(node.scaleId);
    if (!nextFamily) return;
    const nextContext = createTheoryContext({
      root: node.root,
      scaleId: node.scaleId,
      selectedRelationshipId: relationship,
    });
    const nextSeedCatalog = buildTheoryRelationshipCatalog(nextContext);
    const nextCatalogId = catalogIdentity(nextSeedCatalog.selectedNodeId, nextFamily, relationship);
    setContextMemories((memories) => {
      const clearedCurrent = rememberNetworkContext(memories, {
        catalogId: currentCatalogId,
        exploration: clearNoteNetworkExploration(seedCatalog),
        pinnedNodeIds: Object.freeze([]),
        selectedNodeId: seedCatalog.selectedNodeId,
      });
      return rememberNetworkContext(clearedCurrent, {
        catalogId: nextCatalogId,
        exploration: createNoteNetworkExplorationState(nextSeedCatalog),
        pinnedNodeIds: Object.freeze([]),
        selectedNodeId: nextSeedCatalog.selectedNodeId,
      });
    });
    onStateChange({
      ...state,
      root: node.root,
      familyId: nextFamily,
      selectedScaleId: node.scaleId,
    });
  }

  function handlePinChange(node: NoteNetworkKnowledgeNode, pinned: boolean): void {
    if (node.id === catalog.selectedNodeId) return;
    setContextMemories((memories) => {
      const current = memoryForCurrentCatalog(memories);
      const nodeIds = new Set(current.pinnedNodeIds);
      if (pinned) nodeIds.add(node.id);
      else nodeIds.delete(node.id);
      return rememberNetworkContext(memories, {
        ...current,
        pinnedNodeIds: Object.freeze([...nodeIds]),
      });
    });
    setPinAnnouncement(`${t(node.label)} · ${t(pinned ? "Pinned" : "Unpinned")}`);
  }

  function selectSemanticNode(index: number): void {
    const normalized = ((index % catalog.nodes.length) + catalog.nodes.length) % catalog.nodes.length;
    inspectNode(catalog.nodes[normalized]);
    requestAnimationFrame(() => semanticNodeRefs.current[normalized]?.focus());
  }

  function handleSemanticKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key === "Enter") {
      event.preventDefault();
      expandNode(catalog.nodes[index]);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectSemanticNode(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectSemanticNode(catalog.nodes.length - 1);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight"
      && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    selectSemanticNode(index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1));
  }

  return (
    <section
      className={embedded ? "" : "hh-workspace"}
      data-testid="note-neural-network"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-exploration-count={catalog.expandedNodeIds.length}
      aria-label={embedded ? t("Note Neural Network") : undefined}
      aria-labelledby={embedded ? undefined : "note-network-title"}
      aria-hidden={active ? undefined : true}
    >
      <div className={embedded ? "" : "hh-workspace__inner"}>
        {embedded ? null : (
          <WorkspaceHeader
            titleId="note-network-title"
            title="Note Neural Network"
            description="See how modes connect without losing the notes beneath your hands."
          />
        )}

        <section className="hh-control-rail" aria-label={t("Mode network controls")}>
          {embedded ? null : (
            <WorkspaceSelectControl
              id="mode-network-root"
              label="Root"
              value={root}
              onChange={(value) => onStateChange({ ...state, root: value })}
              className="w-36"
            >
              {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
            </WorkspaceSelectControl>
          )}
          <WorkspaceSelectControl
            id="mode-network-family"
            label="Family"
            value={familyId}
            onChange={(value) => handleFamilyChange(value as ModeFamilyId)}
            className="w-56"
          >
            {MODE_FAMILIES.map((family) => (
              <option key={family.id} value={family.id}>{t(family.label)}</option>
            ))}
          </WorkspaceSelectControl>
          <WorkspaceSegmentedControl
            label="Relationship"
            value={relationship}
            onChange={handleRelationshipChange}
            reducedMotion={reduceMotion}
            options={[
              { value: "parallel", label: "Parallel" },
              { value: "relative", label: "Relative" },
            ]}
          />
          <button
            ref={helpTriggerRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0"
            aria-label={t("About Note Neural Network")}
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={20} aria-hidden="true" style={{ color: "var(--interactive-academy-text)" }} />
          </button>
        </section>

        <div className="hh-panel grid overflow-hidden lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.65fr)]">
          <div className="min-w-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--border-default)" }}>
            {mobileStatic ? (
              <div
                ref={graphContainerRef}
                className="relative overflow-clip"
                data-testid="mode-network-graph-scroller"
                data-graph-height={mobileLayout.height}
                data-graph-motion="static"
                data-graph-projection="mobile-static"
                data-layout-width={mobileLayout.width}
                data-viewport-height={graphViewportSize.height}
                style={{ backgroundColor: "#000", height: `${mobileLayout.height}px` }}
              >
                <svg
                  viewBox={`0 0 ${mobileLayout.width} ${mobileLayout.height}`}
                  className="block h-full w-full"
                  role="img"
                  aria-label={t(`${root} relationship network`)}
                >
                  <title>{t(`${root} relationship network`)}</title>
                  <desc>{t("A static mobile overview centers the active scale with its strongest related scales and chords. Use the complete list below to inspect every node.")}</desc>
                  <defs>
                    <marker id="note-network-mobile-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                    </marker>
                  </defs>
                  {mobileLayout.edges.map(({ edge, path }) => {
                    const edgeStyle = NOTE_NETWORK_EDGE_STYLES[edge.strengthLabel];
                    return (
                      <path
                        key={edge.id}
                        d={path}
                        fill="none"
                        stroke={edgeColor(edge.kind)}
                        strokeWidth={edgeStyle.lineWidth}
                        strokeDasharray={edgeStyle.dash.length > 0 ? edgeStyle.dash.join(" ") : undefined}
                        opacity={edgeStyle.opacity}
                        markerEnd={edge.direction === "outbound" ? "url(#note-network-mobile-arrow)" : undefined}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {mobileLayout.nodes.map((layoutNode) => {
                    const knowledgeNode = catalog.nodes.find((node) => node.id === layoutNode.node.id);
                    if (!knowledgeNode) return null;
                    const tone = toneForNode(knowledgeNode);
                    const locallySelected = layoutNode.node.id === selectedNode.id;
                    const localizedLabel = wrapNoteNetworkLabel(
                      t(layoutNode.label.fullLabel),
                      Math.max(4, Math.floor((layoutNode.width - 18) / 7)),
                    );
                    return (
                      <g
                        key={layoutNode.node.id}
                        transform={`translate(${layoutNode.bounds.x} ${layoutNode.bounds.y})`}
                        data-network-node={layoutNode.node.id}
                        data-network-kind={knowledgeNode.kind}
                        data-chord-family={knowledgeNode.chordSymbol
                          ? chordFamilyPresentation(knowledgeNode.chordSymbol).family
                          : undefined}
                      >
                        <title>{localizedLabel.fullLabel}</title>
                        <rect
                          width={layoutNode.width}
                          height={layoutNode.height}
                          rx={layoutNode.node.selected ? 16 : 11}
                          fill={tone.background}
                          stroke={locallySelected ? "var(--text-accent)" : tone.border}
                          strokeWidth={locallySelected ? 3 : 1.5}
                        />
                        <text
                          x={layoutNode.width / 2}
                          y={layoutNode.height / 2 - (localizedLabel.lines.length - 1) * 8}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={tone.text}
                          fontFamily="var(--font-mono)"
                          fontSize={knowledgeNode.chordSymbol ? "10" : "12"}
                          pointerEvents="none"
                        >
                          {localizedLabel.lines.map((line, lineIndex) => (
                            <tspan key={`${line}-${lineIndex}`} x={layoutNode.width / 2} dy={lineIndex === 0 ? 0 : 16}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <NoteNetworkCanvas
                active={active}
                ariaLabel={t(`${root} relationship network`)}
                catalog={catalog}
                expandedNodeIds={expandedNodeIds}
                inspectedNodeId={selectedNode.id}
                localizedLabels={localizedCanvasLabels}
                pinnedNodeIds={pinnedNodeIds}
                reducedMotion={reduceMotion}
                edgeColorFor={edgeColor}
                nodeToneFor={toneForNode}
                onExpand={expandNode}
                onInspect={inspectNode}
                onPinChange={handlePinChange}
              />
            )}

            <p className="border-t px-3 py-2 text-xs" data-testid="network-interaction-instructions" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
              {t(mobileStatic
                ? "Static overview for mobile. Use the complete node list below to inspect and expand; make a scale center from its details."
                : "Drag nodes to reshape the network. Drag empty space to pan, scroll to zoom, hover to isolate, double click to expand, or hold a node for 550ms to pin it.")}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }} aria-label={t("Relationship strength legend")}>
              {(["strong", "medium", "weak"] as const).map((strength) => {
                const visual = NOTE_NETWORK_EDGE_STYLES[strength];
                return (
                  <span key={strength} className="inline-flex items-center gap-2" data-relationship-strength={strength}>
                    <svg aria-hidden="true" width="44" height="12" viewBox="0 0 44 12">
                      <line
                        x1="1"
                        x2="43"
                        y1="6"
                        y2="6"
                        stroke="currentColor"
                        strokeWidth={visual.lineWidth}
                        strokeDasharray={visual.dash.length > 0 ? visual.dash.join(" ") : undefined}
                        opacity={visual.opacity}
                      />
                    </svg>
                    {t(`${strength[0].toUpperCase()}${strength.slice(1)} relationship`)}
                  </span>
                );
              })}
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="readout">──▶</span>
                {t("Arrow points toward the relationship target")}
              </span>
            </div>

            <ul className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-3" aria-label={t("Network nodes")} style={{ borderColor: "var(--border-default)" }}>
              {catalog.nodes.map((node, index) => {
                const family = node.chordSymbol ? chordFamilyPresentation(node.chordSymbol) : null;
                const tone = toneForNode(node);
                const pinned = pinnedNodeIds.has(node.id);
                const expanded = expandedNodeIds.has(node.id);
                return (
                  <li key={`semantic-${node.id}`} className="min-w-0">
                    <button
                      ref={(element) => { semanticNodeRefs.current[index] = element; }}
                      type="button"
                      data-network-node={node.id}
                      data-network-kind={node.kind}
                      data-network-expanded={expanded ? "true" : "false"}
                      data-network-pinned={pinned ? "true" : "false"}
                      aria-label={[
                        t(node.kind),
                        t(node.label),
                        pinned ? t("Pinned") : null,
                        expanded ? t("Expanded") : null,
                      ].filter(Boolean).join(" · ")}
                      aria-pressed={node.id === selectedNode.id}
                      onClick={() => inspectNode(node)}
                      onKeyDown={(event) => handleSemanticKeyDown(event, index)}
                      className="hh-action w-full min-w-0 justify-start"
                      style={{
                        backgroundColor: family?.backgroundColor ?? tone.background,
                        border: `1px solid ${node.id === selectedNode.id
                          ? "var(--interactive-accent-border)"
                          : family?.borderColor ?? tone.border}`,
                        color: family?.color ?? tone.text,
                      }}
                    >
                      <span aria-hidden="true" className="shrink-0 readout">{NODE_KIND_CUES[node.kind]}</span>
                      <span data-chord-family={family?.family} className="truncate">{t(node.label)}</span>
                      {expanded ? <span aria-hidden="true" className="ml-auto shrink-0">↗</span> : null}
                      {pinned ? <span className="ml-auto shrink-0 label-caps">{t("Pinned")}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="flex min-w-0 flex-col p-5 lg:p-7" aria-label={t(`${selectedNode.label} details`)}>
            <div className="flex items-start gap-3">
              <Network size={22} aria-hidden="true" style={{ color: "var(--interactive-academy-text)", marginTop: "0.25rem" }} />
              <div className="min-w-0">
                <p className="label-caps" data-testid="network-selection-kind" style={{ color: "var(--text-secondary)" }}>
                  {t("Selected")} · {t(selectedNode.kind).toLocaleUpperCase()}
                </p>
                <h2
                  data-chord-family={selectedNodeFamily?.family}
                  className="hh-panel-title mt-1 break-words rounded px-1.5 py-0.5"
                  style={{
                    color: selectedNodeFamily?.color ?? toneForNode(selectedNode).text,
                    backgroundColor: selectedNodeFamily?.backgroundColor,
                    border: selectedNodeFamily ? `1px solid ${selectedNodeFamily.borderColor}` : undefined,
                  }}
                >
                  <span aria-hidden="true" className="mr-2 readout">{NODE_KIND_CUES[selectedNode.kind]}</span>
                  {t(selectedNode.label)}
                </h2>
              </div>
            </div>

            <dl className="mt-5 divide-y" style={{ borderColor: "var(--border-default)" }}>
              {selectedNode.root && selectedNode.scaleId ? (
                <>
                  <div className="py-3">
                    <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Notes")}</dt>
                    <dd className="mt-2 break-words readout">{spellScaleNotes(selectedNode.root, selectedNode.scaleId).join(" · ")}</dd>
                  </div>
                  <div className="py-3">
                    <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Interval formula")}</dt>
                    <dd className="mt-2 readout">{scaleIntervalFormulaFor(selectedNode.scaleId).join(" · ")}</dd>
                  </div>
                </>
              ) : null}
              {detailNode.evidence.length > 0 ? (
                <div className="py-3">
                  <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Evidence")}</dt>
                  <dd className="mt-2 grid gap-1.5">
                    {detailNode.evidence.map((evidence) => <span key={evidence} className="text-sm">{t(evidence)}</span>)}
                  </dd>
                </div>
              ) : null}
              <div className="py-3">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Relationships")}</dt>
                <dd className="mt-2 grid max-h-80 gap-2 overflow-y-auto pr-1" data-testid="network-relationship-evidence">
                  {relatedEdges.map((edge) => {
                    const neighborId = edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId;
                    const neighbor = detailCatalog.nodes.find((node) => node.id === neighborId);
                    if (!neighbor) return null;
                    return (
                      <span key={edge.id} className="rounded border p-2 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                        <strong style={{ color: edgeColor(edge.kind) }}>{t(neighbor.label)}</strong>
                        <span className="mt-1 block" style={{ color: "var(--text-secondary)" }}>
                          {t(edge.evidence)} · {t(`${edge.strengthLabel} relationship`)}
                        </span>
                      </span>
                    );
                  })}
                </dd>
              </div>
              {selectedNode.functionKey ? (
                <div className="py-3">
                  <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Function")}</dt>
                  <dd className="mt-2">{t(selectedNode.functionKey)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2" aria-label={t("Selected node actions")}>
              {selectedNode.expandable && !expandedNodeIds.has(selectedNode.id) ? (
                <button type="button" className="hh-action" onClick={() => expandNode(selectedNode)}>
                  {t("Expand connections")}
                </button>
              ) : null}
              {expandedNodeIds.has(selectedNode.id) ? (
                <button type="button" className="hh-action" onClick={() => collapseNode(selectedNode)}>
                  {t("Collapse branch")}
                </button>
              ) : null}
              {selectedNode.kind === "scale" && selectedNode.id !== catalog.selectedNodeId
                && selectedNode.root && selectedNode.scaleId ? (
                  <button type="button" className="hh-action" onClick={() => makeCenter(selectedNode)}>
                    {t("Make center")}
                  </button>
                ) : null}
              {!mobileStatic && selectedNode.id !== catalog.selectedNodeId ? (
                <button
                  type="button"
                  className="hh-action"
                  aria-pressed={pinnedNodeIds.has(selectedNode.id)}
                  onClick={() => handlePinChange(selectedNode, !pinnedNodeIds.has(selectedNode.id))}
                >
                  {t(pinnedNodeIds.has(selectedNode.id) ? "Unpin node" : "Pin node")}
                </button>
              ) : null}
              {catalog.expandedNodeIds.length > 0 ? (
                <button type="button" className="hh-action" onClick={clearExploration}>
                  {t("Clear exploration")}
                </button>
              ) : null}
            </div>

            {mobileStatic && selectedNode.id !== catalog.selectedNodeId ? (
              <p className="mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                {t("Pinning and direct graph gestures are available on larger screens; mobile keeps a static graph to conserve resources.")}
              </p>
            ) : null}

            {selectedNode.root && selectedNode.scaleId ? (
              <button
                type="button"
                onClick={() => onOpenScale(selectedNode.root!, selectedNode.scaleId!)}
                className="hh-action mt-5"
                style={{
                  backgroundColor: "var(--interactive-academy-bg)",
                  border: "1px solid var(--interactive-academy-border)",
                  color: "var(--interactive-academy-text)",
                }}
              >
                {t("Open in Scale Synthesia")}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : null}
          </aside>
        </div>
        {active ? (
          <p className="sr-only" role="status" aria-live="polite" data-testid="network-pin-status">
            {pinAnnouncement}
          </p>
        ) : null}
      </div>

      {helpOpen ? (
        <AccessibleDialog
          title={t("How Note Neural Network works")}
          description={t("A guide to graph concepts, relationships, and controls.")}
          closeLabel={t("Close Note Neural Network help")}
          onRequestClose={() => setHelpOpen(false)}
          returnFocusRef={helpTriggerRef}
          maxWidth="44rem"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="label-caps">{t("Node kinds and exploration")}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("Scales use a double ring, chords a triangle, notes a solid dot, and intervals an outlined square. Inspect selects one concept; Expand adds its connections; Make center changes the shared scale; Collapse and Clear remove exploration branches.")}
              </p>
            </section>
            <section className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="label-caps">{t("Move and pin")}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("Drag a node while the network reacts, drag empty space to pan, and scroll to zoom. Hold a stationary node for 550ms to pin or unpin it; moving or cancelling first leaves its pin unchanged.")}
              </p>
            </section>
            <section className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="label-caps">{t("Strength and direction")}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("Strong links are heavy and bright, Medium links are thinner, and Weak links use a long dash. An arrow points toward the relationship target; details name the musical evidence.")}
              </p>
            </section>
            <section className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="label-caps">{t("Relative, Parallel, and mobile")}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("Relative compares modes that share a parent collection; Parallel compares modes on the same root. Mobile keeps a static graph and exposes every concept and action through the list and detail panel.")}
              </p>
            </section>
          </div>
        </AccessibleDialog>
      ) : null}
    </section>
  );
}

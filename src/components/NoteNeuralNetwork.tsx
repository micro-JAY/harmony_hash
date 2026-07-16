import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Network,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import {
  buildModeNetwork,
  buildNoteNetworkLayout,
  buildTheoryRelationshipCatalog,
  calculateNoteNetworkPanBounds,
  clampNoteNetworkPan,
  clampNoteNetworkZoom,
  createTheoryContext,
  MODE_FAMILIES,
  NOTE_NETWORK_ZOOM_BOUNDS,
  scaleIntervalFormulaFor,
  spellScaleNotes,
  wrapNoteNetworkLabel,
  type ModeFamilyId,
  type ModeRelationship,
  type ScaleFormulaType,
  type TheoryRelationshipNode,
} from "../lib/theory";
import { useT } from "../i18n/I18nContext";
import { chordFamilyPresentation } from "../lib/visual/chordFamily";
import {
  WorkspaceHeader,
  WorkspaceSegmentedControl,
  WorkspaceSelectControl,
} from "./WorkspaceChrome";

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

interface PanOffset {
  readonly x: number;
  readonly y: number;
}

interface GraphViewportSize {
  readonly width: number;
  readonly height: number;
}

interface GraphViewportState {
  readonly zoom: number;
  readonly pan: PanOffset;
}

interface NodeSelection {
  readonly catalogId: string;
  readonly nodeId: string;
}

const DEFAULT_LAYOUT_WIDTH = 760;
const DEFAULT_VIEWPORT_HEIGHT = 544;

function edgeColor(kind: string): string {
  if (kind === "fifths" || kind === "relative_major_minor") return "var(--text-accent)";
  if (kind === "modal_family") return "var(--text-academy)";
  if (kind === "diatonic_function" || kind === "secondary_dominant") {
    return "var(--interactive-warm-text)";
  }
  return "var(--text-muted)";
}

function nodeTone(node: TheoryRelationshipNode): {
  background: string;
  border: string;
  text: string;
} {
  if (node.chordSymbol) {
    const presentation = chordFamilyPresentation(node.chordSymbol);
    return {
      background: presentation.backgroundColor,
      border: presentation.borderColor,
      text: presentation.color,
    };
  }
  if (node.selected) {
    return {
      background: "var(--interactive-academy-bg)",
      border: "var(--interactive-academy-border)",
      text: "var(--interactive-academy-text)",
    };
  }
  if (node.cluster === "modes") {
    return {
      background: "var(--interactive-academy-bg)",
      border: "var(--interactive-academy-border)",
      text: "var(--interactive-academy-text)",
    };
  }
  if (node.cluster === "chords") {
    return {
      background: "var(--interactive-warm-bg)",
      border: "var(--interactive-warm-border)",
      text: "var(--interactive-warm-text)",
    };
  }
  return {
    background: "var(--interactive-secondary-bg)",
    border: "var(--interactive-secondary-border)",
    text: "var(--interactive-secondary-text)",
  };
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
  const { root, familyId, relationship, selectedScaleId } = state;
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const semanticNodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [graphViewportSize, setGraphViewportSize] = useState<GraphViewportSize>({
    width: DEFAULT_LAYOUT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  });
  const [graphViewport, setGraphViewport] = useState<GraphViewportState>({
    zoom: NOTE_NETWORK_ZOOM_BOUNDS.default,
    pan: { x: 0, y: 0 },
  });
  const context = useMemo(
    () => createTheoryContext({
      root,
      scaleId: selectedScaleId,
      selectedRelationshipId: relationship,
    }),
    [relationship, root, selectedScaleId],
  );
  const catalog = useMemo(() => buildTheoryRelationshipCatalog(context), [context]);
  const [nodeSelection, setNodeSelection] = useState<NodeSelection | null>(null);
  const selectedNodeId = nodeSelection?.catalogId === catalog.selectedNodeId
    ? nodeSelection.nodeId
    : catalog.selectedNodeId;
  const layout = useMemo(() => buildNoteNetworkLayout(catalog, {
    width: Math.max(280, graphViewportSize.width),
    reducedMotion: reduceMotion,
  }), [catalog, graphViewportSize.width, reduceMotion]);
  const panBounds = calculateNoteNetworkPanBounds(
    layout.width,
    layout.height,
    graphViewportSize.width,
    graphViewportSize.height,
    graphViewport.zoom,
  );
  const visiblePan = clampNoteNetworkPan(graphViewport.pan, panBounds);
  const selectedNode = catalog.nodes.find((node) => node.id === selectedNodeId)
    ?? catalog.nodes.find((node) => node.id === catalog.selectedNodeId)
    ?? catalog.nodes[0];
  const selectedNodeFamily = selectedNode.chordSymbol
    ? chordFamilyPresentation(selectedNode.chordSymbol)
    : null;
  const relatedEdges = catalog.edges.filter((edge) => (
    edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id
  ));

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  function handleFamilyChange(nextFamily: ModeFamilyId): void {
    const nextNetwork = buildModeNetwork(root, nextFamily, relationship);
    onStateChange({
      ...state,
      familyId: nextFamily,
      selectedScaleId: nextNetwork.nodes[0].scaleId,
    });
  }

  function handleRelationshipChange(nextRelationship: ModeRelationship): void {
    setNodeSelection(null);
    onStateChange({ ...state, relationship: nextRelationship });
  }

  function selectNode(node: TheoryRelationshipNode): void {
    setNodeSelection({ catalogId: catalog.selectedNodeId, nodeId: node.id });
    if (node.root && node.scaleId) {
      onStateChange({ ...state, root: node.root, selectedScaleId: node.scaleId });
    }
  }

  function selectSemanticNode(index: number): void {
    const normalized = ((index % catalog.nodes.length) + catalog.nodes.length) % catalog.nodes.length;
    selectNode(catalog.nodes[normalized]);
    requestAnimationFrame(() => semanticNodeRefs.current[normalized]?.focus());
  }

  function handleSemanticKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
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

  function panBy(x: number, y: number): void {
    setGraphViewport((current) => {
      const bounds = calculateNoteNetworkPanBounds(
        layout.width,
        layout.height,
        graphViewportSize.width,
        graphViewportSize.height,
        current.zoom,
      );
      const currentPan = clampNoteNetworkPan(current.pan, bounds);
      return {
        ...current,
        pan: clampNoteNetworkPan({ x: currentPan.x + x, y: currentPan.y + y }, bounds),
      };
    });
  }

  function zoomBy(delta: number): void {
    setGraphViewport((current) => {
      const zoom = clampNoteNetworkZoom(current.zoom + delta);
      const bounds = calculateNoteNetworkPanBounds(
        layout.width,
        layout.height,
        graphViewportSize.width,
        graphViewportSize.height,
        zoom,
      );
      return { zoom, pan: clampNoteNetworkPan(current.pan, bounds) };
    });
  }

  function resetViewport(): void {
    setGraphViewport({ zoom: NOTE_NETWORK_ZOOM_BOUNDS.default, pan: { x: 0, y: 0 } });
  }

  return (
    <section
      className={embedded ? "" : "hh-workspace"}
      data-testid="note-neural-network"
      data-reduced-motion={reduceMotion ? "true" : "false"}
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
        </section>

        <div className="hh-panel grid overflow-hidden lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.65fr)]">
          <div className="min-w-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border-default)" }}>
              <div className="flex flex-wrap gap-1" role="group" aria-label={t("Network viewport controls")}>
                <button type="button" className="hh-action" disabled={visiblePan.y >= panBounds.maxY} onClick={() => panBy(0, 28)} aria-label={t("Pan up")}><ArrowUp size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" disabled={visiblePan.x >= panBounds.maxX} onClick={() => panBy(28, 0)} aria-label={t("Pan left")}><ArrowLeft size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" disabled={visiblePan.x <= panBounds.minX} onClick={() => panBy(-28, 0)} aria-label={t("Pan right")}><ArrowRight size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" disabled={visiblePan.y <= panBounds.minY} onClick={() => panBy(0, -28)} aria-label={t("Pan down")}><ArrowDown size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" onClick={() => zoomBy(-NOTE_NETWORK_ZOOM_BOUNDS.step)} aria-label={t("Zoom out")}><ZoomOut size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" onClick={() => zoomBy(NOTE_NETWORK_ZOOM_BOUNDS.step)} aria-label={t("Zoom in")}><ZoomIn size={15} aria-hidden="true" /></button>
                <button type="button" className="hh-action" onClick={resetViewport} aria-label={t("Reset network view")}><RotateCcw size={15} aria-hidden="true" /></button>
              </div>
              <span className="readout" aria-live="polite" style={{ color: "var(--text-secondary)" }}>
                {Math.round(graphViewport.zoom * 100)}%
              </span>
            </div>

            <div
              ref={graphContainerRef}
              className="relative max-h-[34rem] min-h-72 overflow-hidden"
              data-testid="mode-network-graph-scroller"
              data-graph-height={layout.height}
              data-layout-width={layout.width}
              data-pan-min-y={panBounds.minY}
              data-pan-y={visiblePan.y}
              data-viewport-height={graphViewportSize.height}
            >
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="block h-auto w-full"
                role="img"
                aria-label={t(`${root} relationship network`)}
              >
                <title>{t(`${root} relationship network`)}</title>
                <desc>{t("Keys, modes, and chords are grouped in stable clusters. Edge weight and line style show relationship strength.")}</desc>
                <g transform={`translate(${visiblePan.x} ${visiblePan.y}) scale(${graphViewport.zoom})`} style={{ transformOrigin: "center" }}>
                  {layout.edges.map(({ edge, path }) => (
                    <path
                      key={edge.id}
                      d={path}
                      fill="none"
                      stroke={edgeColor(edge.kind)}
                      strokeWidth={edge.strength}
                      strokeDasharray={edge.strength === 1 ? "5 5" : undefined}
                      strokeOpacity={edge.strength === 1 ? 0.58 : 0.82}
                      aria-hidden="true"
                    />
                  ))}
                  {layout.nodes.map((layoutNode) => {
                    const tone = nodeTone(layoutNode.node);
                    const locallySelected = layoutNode.node.id === selectedNode.id;
                    const localizedLabel = wrapNoteNetworkLabel(
                      t(layoutNode.label.fullLabel),
                      Math.max(4, Math.floor((layoutNode.width - 18) / 7)),
                    );
                    return (
                      <g
                        key={layoutNode.node.id}
                        transform={`translate(${layoutNode.bounds.x} ${layoutNode.bounds.y})`}
                        role="button"
                        tabIndex={-1}
                        aria-label={`${localizedLabel.fullLabel}, ${t(layoutNode.node.cluster)}`}
                        data-network-node={layoutNode.node.id}
                        data-chord-family={layoutNode.node.chordSymbol
                          ? chordFamilyPresentation(layoutNode.node.chordSymbol).family
                          : undefined}
                        onClick={() => selectNode(layoutNode.node)}
                        style={{ cursor: "pointer" }}
                      >
                        <title>{localizedLabel.fullLabel}</title>
                        <rect
                          width={layoutNode.width}
                          height={layoutNode.height}
                          rx="12"
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
                          fontSize="12"
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
                </g>
              </svg>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }} aria-label={t("Relationship strength legend")}>
              <span><span aria-hidden="true">━━━</span> {t("Strong relationship")}</span>
              <span><span aria-hidden="true">━━</span> {t("Medium relationship")}</span>
              <span><span aria-hidden="true">┄┄</span> {t("Weak relationship")}</span>
            </div>

            <ul className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-3" aria-label={t("Network nodes")} style={{ borderColor: "var(--border-default)" }}>
              {catalog.nodes.map((node, index) => {
                const family = node.chordSymbol ? chordFamilyPresentation(node.chordSymbol) : null;
                return (
                <li key={`semantic-${node.id}`} className="min-w-0">
                  <button
                    ref={(element) => { semanticNodeRefs.current[index] = element; }}
                    type="button"
                    aria-pressed={node.id === selectedNode.id}
                    onClick={() => selectNode(node)}
                    onKeyDown={(event) => handleSemanticKeyDown(event, index)}
                    className="hh-action w-full min-w-0 justify-start"
                    style={{
                      backgroundColor: family?.backgroundColor ?? (node.id === selectedNode.id
                        ? "var(--interactive-academy-bg)"
                        : "var(--interactive-secondary-bg)"),
                      border: `1px solid ${node.id === selectedNode.id
                        ? "var(--interactive-accent-border)"
                        : family?.borderColor ?? "var(--interactive-secondary-border)"}`,
                      color: family?.color ?? (node.id === selectedNode.id
                        ? "var(--interactive-academy-text)"
                        : "var(--interactive-secondary-text)"),
                    }}
                  >
                    <span data-chord-family={family?.family} className="truncate">{t(node.label)}</span>
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
                <h2
                  data-chord-family={selectedNodeFamily?.family}
                  className="hh-panel-title break-words rounded px-1.5 py-0.5"
                  style={{
                    color: selectedNodeFamily?.color ?? "var(--interactive-academy-text)",
                    backgroundColor: selectedNodeFamily?.backgroundColor,
                    border: selectedNodeFamily ? `1px solid ${selectedNodeFamily.borderColor}` : undefined,
                  }}
                >
                  {t(selectedNode.label)}
                </h2>
                <p className="mt-1 label-caps" style={{ color: "var(--text-secondary)" }}>{t(selectedNode.kind)}</p>
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
              <div className="py-3">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Relationships")}</dt>
                <dd className="mt-2 grid gap-2">
                  {relatedEdges.map((edge) => (
                    <span key={edge.id} className="text-sm">
                      {t(edge.kind)} · {t(`${edge.strengthLabel} relationship`)}
                    </span>
                  ))}
                </dd>
              </div>
              {selectedNode.functionKey ? (
                <div className="py-3">
                  <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Function")}</dt>
                  <dd className="mt-2">{t(selectedNode.functionKey)}</dd>
                </div>
              ) : null}
            </dl>

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
      </div>
    </section>
  );
}

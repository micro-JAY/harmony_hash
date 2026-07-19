import {
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  createNoteNetworkSimulation,
  moveNoteNetworkNode,
  NOTE_NETWORK_ZOOM_BOUNDS,
  releaseNoteNetworkNode,
  resizeNoteNetworkSimulation,
  settleNoteNetworkSimulation,
  stepNoteNetworkSimulation,
  wakeNoteNetworkSimulation,
  wrapNoteNetworkLabel,
  type NoteNetworkPhysicsNode,
  type NoteNetworkSimulation,
  type TheoryRelationshipCatalog,
  type TheoryRelationshipKind,
  type TheoryRelationshipNode,
} from "../lib/theory";
import { useT } from "../i18n/I18nContext";

export interface NoteNetworkCanvasTone {
  readonly background: string;
  readonly border: string;
  readonly text: string;
}

interface NoteNetworkCanvasProps {
  readonly active: boolean;
  readonly ariaLabel: string;
  readonly catalog: TheoryRelationshipCatalog;
  readonly inspectedNodeId: string;
  readonly localizedLabels: ReadonlyMap<string, string>;
  readonly reducedMotion: boolean;
  readonly edgeColorFor: (kind: TheoryRelationshipKind) => string;
  readonly nodeToneFor: (node: TheoryRelationshipNode) => NoteNetworkCanvasTone;
  readonly onActivate: (node: TheoryRelationshipNode) => void;
  readonly onInspect: (node: TheoryRelationshipNode) => void;
}

interface CameraState {
  panX: number;
  panY: number;
  scale: number;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

interface CanvasNodeColors {
  readonly background: string;
  readonly border: string;
  readonly text: string;
}

interface CanvasPalette {
  readonly accent: string;
  readonly muted: string;
  readonly primary: string;
  readonly mono: string;
  readonly edgeColors: ReadonlyMap<TheoryRelationshipKind, string>;
  readonly nodeColors: ReadonlyMap<string, CanvasNodeColors>;
}

interface PointerGesture {
  readonly pointerId: number;
  readonly mode: "node" | "pan";
  readonly nodeId?: string;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startPanX: number;
  readonly startPanY: number;
  moved: boolean;
}

const MIN_CANVAS_SIZE = 280;
const PAN_STEP = 42;
const DRAG_THRESHOLD = 4;
const DEFAULT_CANVAS_HEIGHT = 580;
const EDGE_KINDS: ReadonlyArray<TheoryRelationshipKind> = Object.freeze([
  "fifths",
  "relative_major_minor",
  "modal_family",
  "diatonic_function",
  "secondary_dominant",
  "distant",
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolveCssColor(value: string, style: CSSStyleDeclaration, fallback: string): string {
  const variable = value.match(/^var\((--[^,)]+)/)?.[1];
  if (variable) return style.getPropertyValue(variable).trim() || fallback;
  return value.trim() || fallback;
}

function buildCanvasPalette(
  catalog: TheoryRelationshipCatalog,
  edgeColorFor: NoteNetworkCanvasProps["edgeColorFor"],
  nodeToneFor: NoteNetworkCanvasProps["nodeToneFor"],
): CanvasPalette {
  const style = getComputedStyle(document.documentElement);
  const edgeColors = new Map<TheoryRelationshipKind, string>();
  for (const kind of EDGE_KINDS) {
    edgeColors.set(kind, resolveCssColor(edgeColorFor(kind), style, "#727484"));
  }
  const nodeColors = new Map<string, CanvasNodeColors>();
  for (const node of catalog.nodes) {
    const tone = nodeToneFor(node);
    nodeColors.set(node.id, Object.freeze({
      background: resolveCssColor(tone.background, style, "rgba(168, 169, 184, 0.16)"),
      border: resolveCssColor(tone.border, style, "#a8a9b8"),
      text: resolveCssColor(tone.text, style, "#f3f3f7"),
    }));
  }
  return Object.freeze({
    accent: style.getPropertyValue("--text-accent").trim() || "#E8C05A",
    muted: style.getPropertyValue("--text-muted").trim() || "#727484",
    primary: style.getPropertyValue("--text-primary").trim() || "#f3f3f7",
    mono: style.getPropertyValue("--font-mono").trim() || "monospace",
    edgeColors,
    nodeColors,
  });
}

function screenToWorld(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  size: CanvasSize,
  camera: CameraState,
): Readonly<{ x: number; y: number }> {
  const bounds = canvas.getBoundingClientRect();
  const screenX = clientX - bounds.left;
  const screenY = clientY - bounds.top;
  return Object.freeze({
    x: (screenX - size.width / 2 - camera.panX) / camera.scale + size.width / 2,
    y: (screenY - size.height / 2 - camera.panY) / camera.scale + size.height / 2,
  });
}

function hitTestNode(
  simulation: NoteNetworkSimulation,
  point: Readonly<{ x: number; y: number }>,
  cameraScale: number,
): NoteNetworkPhysicsNode | undefined {
  const padding = 6 / cameraScale;
  let closest: NoteNetworkPhysicsNode | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const node of simulation.nodes) {
    const distance = Math.hypot(point.x - node.x, point.y - node.y);
    if (distance <= node.radius + padding && distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  }
  return closest;
}

function roundedLabelBackground(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const radius = 4;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function connectedNodeIds(
  simulation: NoteNetworkSimulation,
  hoveredNodeId: string | null,
): ReadonlySet<string> | null {
  if (!hoveredNodeId) return null;
  const connected = new Set([hoveredNodeId]);
  for (const edge of simulation.edges) {
    const source = simulation.nodes[edge.sourceIndex];
    const target = simulation.nodes[edge.targetIndex];
    if (source.id === hoveredNodeId) connected.add(target.id);
    if (target.id === hoveredNodeId) connected.add(source.id);
  }
  return connected;
}

function drawCanvasGraph(
  context: CanvasRenderingContext2D,
  simulation: NoteNetworkSimulation,
  camera: CameraState,
  size: CanvasSize,
  palette: CanvasPalette,
  labels: ReadonlyMap<string, string>,
  hoveredNodeId: string | null,
  inspectedNodeId: string,
): void {
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = "#000";
  context.fillRect(0, 0, size.width, size.height);
  context.save();
  context.translate(size.width / 2 + camera.panX, size.height / 2 + camera.panY);
  context.scale(camera.scale, camera.scale);
  context.translate(-size.width / 2, -size.height / 2);

  const connected = connectedNodeIds(simulation, hoveredNodeId);
  for (const physicsEdge of simulation.edges) {
    const source = simulation.nodes[physicsEdge.sourceIndex];
    const target = simulation.nodes[physicsEdge.targetIndex];
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const directionX = dx / distance;
    const directionY = dy / distance;
    const hoveredEdge = hoveredNodeId === source.id || hoveredNodeId === target.id;
    const unrelated = connected !== null && !hoveredEdge;
    context.beginPath();
    context.moveTo(source.x + directionX * source.radius, source.y + directionY * source.radius);
    context.lineTo(target.x - directionX * target.radius, target.y - directionY * target.radius);
    context.strokeStyle = palette.edgeColors.get(physicsEdge.edge.kind) ?? palette.muted;
    context.globalAlpha = unrelated
      ? 0.055
      : hoveredEdge
        ? 0.98
        : 0.16 + physicsEdge.edge.strength * 0.13;
    context.lineWidth = (0.55 + physicsEdge.edge.strength * 0.48) / camera.scale
      + (hoveredEdge ? 0.9 / camera.scale : 0);
    context.setLineDash(physicsEdge.edge.strength === 1 ? [5 / camera.scale, 7 / camera.scale] : []);
    context.stroke();
  }
  context.setLineDash([]);

  for (const node of simulation.nodes) {
    const colors = palette.nodeColors.get(node.id);
    if (!colors) continue;
    const related = connected === null || connected.has(node.id);
    const hovered = node.id === hoveredNodeId;
    const inspected = node.id === inspectedNodeId;
    context.save();
    context.globalAlpha = related ? 1 : 0.16;
    context.shadowColor = colors.text;
    context.shadowBlur = hovered ? 24 : related ? 11 : 2;
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fillStyle = colors.background === "transparent" ? colors.text : colors.background;
    if (colors.background === "transparent") context.globalAlpha *= 0.24;
    context.fill();
    context.globalAlpha = related ? 0.94 : 0.2;
    context.strokeStyle = hovered || inspected ? palette.accent : colors.border;
    context.lineWidth = (hovered || inspected ? 2.8 : node.anchored ? 2.2 : 1.45) / camera.scale;
    context.stroke();
    context.restore();
  }

  for (const node of simulation.nodes) {
    const colors = palette.nodeColors.get(node.id);
    if (!colors) continue;
    const label = labels.get(node.id) ?? node.node.label;
    const wrapped = wrapNoteNetworkLabel(label, node.anchored ? 24 : node.node.chordSymbol ? 12 : 18);
    const related = connected === null || connected.has(node.id);
    const hovered = node.id === hoveredNodeId;
    const inspected = node.id === inspectedNodeId;
    const fontSize = node.anchored ? 13 : node.node.chordSymbol ? 10.5 : 11;
    context.font = `${node.anchored ? 650 : 520} ${fontSize}px ${palette.mono}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const lineHeight = fontSize + 3;
    const labelWidth = Math.max(...wrapped.lines.map((line) => context.measureText(line).width)) + 12;
    const labelHeight = wrapped.lines.length * lineHeight + 6;
    const labelTop = node.y + node.radius + 5;
    context.save();
    context.globalAlpha = related ? (hovered || inspected || node.anchored ? 1 : 0.82) : 0.12;
    context.fillStyle = "rgba(0, 0, 0, 0.78)";
    roundedLabelBackground(
      context,
      node.x - labelWidth / 2,
      labelTop,
      labelWidth,
      labelHeight,
    );
    context.fillStyle = hovered || inspected ? palette.primary : colors.text;
    wrapped.lines.forEach((line, index) => {
      context.fillText(
        line,
        node.x,
        labelTop + 3 + lineHeight / 2 + index * lineHeight,
      );
    });
    context.restore();
  }
  context.restore();
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function cameraPanLimit(size: CanvasSize, scale: number): Readonly<{ x: number; y: number }> {
  return Object.freeze({
    x: size.width * 0.7 * scale,
    y: size.height * 0.7 * scale,
  });
}

export default function NoteNetworkCanvas({
  active,
  ariaLabel,
  catalog,
  inspectedNodeId,
  localizedLabels,
  reducedMotion,
  edgeColorFor,
  nodeToneFor,
  onActivate,
  onInspect,
}: NoteNetworkCanvasProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomReadoutRef = useRef<HTMLOutputElement>(null);
  const simulationRef = useRef<NoteNetworkSimulation | null>(null);
  const sizeRef = useRef<CanvasSize>({ width: MIN_CANVAS_SIZE, height: DEFAULT_CANVAS_HEIGHT, dpr: 1 });
  const cameraRef = useRef<CameraState>({ panX: 0, panY: 0, scale: 1 });
  const paletteRef = useRef<CanvasPalette | null>(null);
  const pointerRef = useRef<PointerGesture | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const inspectedNodeIdRef = useRef(inspectedNodeId);
  const needsDrawRef = useRef(true);
  const onInspectRef = useRef(onInspect);
  const onActivateRef = useRef(onActivate);

  useEffect(() => {
    inspectedNodeIdRef.current = inspectedNodeId;
    onInspectRef.current = onInspect;
    onActivateRef.current = onActivate;
    needsDrawRef.current = true;
  }, [inspectedNodeId, onActivate, onInspect]);

  const labels = useMemo(() => new Map(localizedLabels), [localizedLabels]);

  function updateCameraDataset(): void {
    const canvas = canvasRef.current;
    const readout = zoomReadoutRef.current;
    if (!canvas) return;
    canvas.dataset.cameraScale = cameraRef.current.scale.toFixed(3);
    canvas.dataset.cameraPanX = cameraRef.current.panX.toFixed(2);
    canvas.dataset.cameraPanY = cameraRef.current.panY.toFixed(2);
    if (readout) readout.textContent = `${Math.round(cameraRef.current.scale * 100)}%`;
  }

  function clampCamera(): void {
    const limit = cameraPanLimit(sizeRef.current, cameraRef.current.scale);
    cameraRef.current.panX = clamp(cameraRef.current.panX, -limit.x, limit.x);
    cameraRef.current.panY = clamp(cameraRef.current.panY, -limit.y, limit.y);
  }

  function panCamera(deltaX: number, deltaY: number): void {
    cameraRef.current.panX += deltaX;
    cameraRef.current.panY += deltaY;
    clampCamera();
    updateCameraDataset();
    needsDrawRef.current = true;
  }

  function zoomCameraAt(nextScale: number, screenX: number, screenY: number): void {
    const current = cameraRef.current;
    const bounded = clamp(nextScale, NOTE_NETWORK_ZOOM_BOUNDS.min, NOTE_NETWORK_ZOOM_BOUNDS.max);
    if (bounded === current.scale) return;
    const size = sizeRef.current;
    const worldX = (screenX - size.width / 2 - current.panX) / current.scale + size.width / 2;
    const worldY = (screenY - size.height / 2 - current.panY) / current.scale + size.height / 2;
    current.scale = bounded;
    current.panX = screenX - size.width / 2 - (worldX - size.width / 2) * bounded;
    current.panY = screenY - size.height / 2 - (worldY - size.height / 2) * bounded;
    clampCamera();
    updateCameraDataset();
    needsDrawRef.current = true;
  }

  function resetCamera(): void {
    cameraRef.current = { panX: 0, panY: 0, scale: 1 };
    updateCameraDataset();
    needsDrawRef.current = true;
  }

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || typeof ResizeObserver === "undefined") return;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("NOTE NEURAL NETWORK requires a 2D canvas context");
    paletteRef.current = buildCanvasPalette(catalog, edgeColorFor, nodeToneFor);

    const resize = (): void => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(MIN_CANVAS_SIZE, bounds.width);
      const height = Math.max(MIN_CANVAS_SIZE, bounds.height);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const previous = sizeRef.current;
      const unchanged = Math.abs(previous.width - width) < 0.5
        && Math.abs(previous.height - height) < 0.5
        && previous.dpr === dpr;
      if (unchanged && simulationRef.current) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sizeRef.current = { width, height, dpr };
      canvas.dataset.cssWidth = width.toFixed(2);
      canvas.dataset.cssHeight = height.toFixed(2);
      canvas.dataset.devicePixelRatio = dpr.toFixed(2);
      container.dataset.layoutWidth = width.toFixed(2);
      container.dataset.graphHeight = height.toFixed(2);
      if (simulationRef.current) {
        resizeNoteNetworkSimulation(simulationRef.current, width, height);
      } else {
        simulationRef.current = createNoteNetworkSimulation(catalog, width, height);
      }
      if (reducedMotion) settleNoteNetworkSimulation(simulationRef.current);
      resetCamera();
      needsDrawRef.current = true;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize, { passive: true });
    resize();

    const handleVisibility = (): void => {
      const simulation = simulationRef.current;
      if (!document.hidden && simulation && !reducedMotion) wakeNoteNetworkSimulation(simulation);
      needsDrawRef.current = true;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      const screenX = event.clientX - bounds.left;
      const screenY = event.clientY - bounds.top;
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomCameraAt(cameraRef.current.scale * factor, screenX, screenY);
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    let frameId = 0;
    const animate = (): void => {
      const simulation = simulationRef.current;
      if (!document.hidden && simulation) {
        if (!reducedMotion && !simulation.sleeping) {
          stepNoteNetworkSimulation(simulation);
          needsDrawRef.current = true;
        }
        if (needsDrawRef.current && paletteRef.current) {
          drawCanvasGraph(
            context,
            simulation,
            cameraRef.current,
            sizeRef.current,
            paletteRef.current,
            labels,
            hoveredNodeIdRef.current,
            inspectedNodeIdRef.current,
          );
          canvas.dataset.simulationState = simulation.sleeping ? "settled" : "active";
          canvas.dataset.simulationFrame = String(simulation.frame);
          canvas.dataset.simulationEnergy = simulation.energy.toFixed(5);
          canvas.dataset.nodeCount = String(simulation.nodes.length);
          const selectedNode = simulation.nodes[simulation.selectedNodeIndex];
          canvas.dataset.selectedNodeX = selectedNode.x.toFixed(2);
          canvas.dataset.selectedNodeY = selectedNode.y.toFixed(2);
          needsDrawRef.current = false;
        }
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("wheel", handleWheel);
      simulationRef.current = null;
      pointerRef.current = null;
      hoveredNodeIdRef.current = null;
    };
  }, [active, catalog, edgeColorFor, labels, nodeToneFor, reducedMotion]);

  function nodeAtPointer(event: Pick<ReactPointerEvent<HTMLCanvasElement>, "clientX" | "clientY">): NoteNetworkPhysicsNode | undefined {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (!canvas || !simulation) return undefined;
    const world = screenToWorld(
      event.clientX,
      event.clientY,
      canvas,
      sizeRef.current,
      cameraRef.current,
    );
    return hitTestNode(simulation, world, cameraRef.current.scale);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (!canvas || !simulation) return;
    const node = nodeAtPointer(event);
    pointerRef.current = {
      pointerId: event.pointerId,
      mode: node ? "node" : "pan",
      nodeId: node?.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: cameraRef.current.panX,
      startPanY: cameraRef.current.panY,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
    if (node) {
      const point = screenToWorld(
        event.clientX,
        event.clientY,
        canvas,
        sizeRef.current,
        cameraRef.current,
      );
      moveNoteNetworkNode(simulation, node.id, point.x, point.y);
      canvas.dataset.draggedNode = node.id;
    }
    needsDrawRef.current = true;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    if (!canvas || !simulation) return;
    const gesture = pointerRef.current;
    if (gesture?.pointerId === event.pointerId) {
      const deltaX = event.clientX - gesture.startClientX;
      const deltaY = event.clientY - gesture.startClientY;
      if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) gesture.moved = true;
      if (gesture.mode === "node" && gesture.nodeId) {
        const point = screenToWorld(
          event.clientX,
          event.clientY,
          canvas,
          sizeRef.current,
          cameraRef.current,
        );
        moveNoteNetworkNode(simulation, gesture.nodeId, point.x, point.y);
      } else {
        cameraRef.current.panX = gesture.startPanX + deltaX;
        cameraRef.current.panY = gesture.startPanY + deltaY;
        clampCamera();
        updateCameraDataset();
      }
      needsDrawRef.current = true;
      return;
    }

    const hovered = nodeAtPointer(event)?.id ?? null;
    if (hovered === hoveredNodeIdRef.current) return;
    hoveredNodeIdRef.current = hovered;
    canvas.dataset.hoveredNode = hovered ?? "";
    canvas.style.cursor = hovered ? "grab" : "move";
    needsDrawRef.current = true;
  }

  function finishPointer(event: ReactPointerEvent<HTMLCanvasElement>, cancelled: boolean): void {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    const gesture = pointerRef.current;
    if (!canvas || !simulation || !gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.mode === "node" && gesture.nodeId) {
      const node = releaseNoteNetworkNode(simulation, gesture.nodeId);
      if (!cancelled && !gesture.moved) onInspectRef.current(node.node);
      canvas.dataset.draggedNode = "";
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointerRef.current = null;
    needsDrawRef.current = true;
  }

  function handleDoubleClick(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const node = nodeAtPointer(event);
    if (node) onActivateRef.current(node.node);
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("Network viewport controls")}>
          <button type="button" className="hh-action" onClick={() => panCamera(0, PAN_STEP)} aria-label={t("Pan up")}><ArrowUp size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={() => panCamera(PAN_STEP, 0)} aria-label={t("Pan left")}><ArrowLeft size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={() => panCamera(-PAN_STEP, 0)} aria-label={t("Pan right")}><ArrowRight size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={() => panCamera(0, -PAN_STEP)} aria-label={t("Pan down")}><ArrowDown size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={() => zoomCameraAt(cameraRef.current.scale - NOTE_NETWORK_ZOOM_BOUNDS.step, sizeRef.current.width / 2, sizeRef.current.height / 2)} aria-label={t("Zoom out")}><ZoomOut size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={() => zoomCameraAt(cameraRef.current.scale + NOTE_NETWORK_ZOOM_BOUNDS.step, sizeRef.current.width / 2, sizeRef.current.height / 2)} aria-label={t("Zoom in")}><ZoomIn size={15} aria-hidden="true" /></button>
          <button type="button" className="hh-action" onClick={resetCamera} aria-label={t("Reset network view")}><RotateCcw size={15} aria-hidden="true" /></button>
        </div>
        <output ref={zoomReadoutRef} className="readout" aria-live="polite" style={{ color: "var(--text-secondary)" }}>100%</output>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-clip"
        data-testid="mode-network-graph-scroller"
        data-graph-motion={reducedMotion ? "settled" : "force"}
        data-graph-projection="desktop-force-canvas"
        style={{ backgroundColor: "#000", height: "clamp(34rem, 58vw, 41.25rem)" }}
      >
        <canvas
          ref={canvasRef}
          data-testid="note-network-canvas"
          className="block h-full w-full"
          role="img"
          aria-label={ariaLabel}
          onDoubleClick={handleDoubleClick}
          onPointerCancel={(event) => finishPointer(event, true)}
          onPointerDown={handlePointerDown}
          onPointerLeave={() => {
            if (pointerRef.current) return;
            hoveredNodeIdRef.current = null;
            if (canvasRef.current) {
              canvasRef.current.dataset.hoveredNode = "";
              canvasRef.current.style.cursor = "move";
            }
            needsDrawRef.current = true;
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event, false)}
          style={{ backgroundColor: "#000", cursor: "move", touchAction: "none" }}
        >
          {t("Use the complete node list below to inspect every relationship.")}
        </canvas>
      </div>
    </>
  );
}

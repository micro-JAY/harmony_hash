import { useRef, type KeyboardEvent } from "react";
import { ArrowRight, Network } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import {
  buildModeNetwork,
  MODE_FAMILIES,
  scaleIntervalFormulaFor,
  type ModeFamilyId,
  type ModeNetworkNode,
  type ModeRelationship,
  type ScaleFormulaType,
} from "../lib/theory";
import { fretboardIntervalColor } from "./fretboardVisuals";
import { useLocale, useT } from "../i18n/I18nContext";
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
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const CENTER: Point = Object.freeze({ x: 350, y: 340 });
const SATELLITE_RADIUS = 238;
const NODE_INTERVAL_COLORS = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

function satellitePoint(index: number): Point {
  const radians = ((-90 + (index - 1) * 60) * Math.PI) / 180;
  return {
    x: CENTER.x + Math.cos(radians) * SATELLITE_RADIUS,
    y: CENTER.y + Math.sin(radians) * SATELLITE_RADIUS,
  };
}

function pointForNode(index: number, selectedIndex: number): Point {
  if (index === selectedIndex) return CENTER;
  return satellitePoint(index < selectedIndex ? index + 1 : index);
}

function modeLabelLines(label: string): ReadonlyArray<string> {
  const words = label.split(" ");
  if (words.length <= 2) return Object.freeze([label]);
  const midpoint = Math.ceil(words.length / 2);
  return Object.freeze([words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")]);
}

export default function NoteNeuralNetwork({
  onOpenScale,
  state,
  onStateChange,
}: NoteNeuralNetworkProps) {
  const t = useT();
  const { locale } = useLocale();
  const reduceMotion = Boolean(useReducedMotion());
  const { root, familyId, relationship, selectedScaleId } = state;
  const nodeRefs = useRef<Array<SVGGElement | null>>([]);
  const network = buildModeNetwork(root, familyId, relationship);
  const selectedIndex = network.nodes.findIndex((node) => node.scaleId === selectedScaleId);
  const resolvedSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedNode = network.nodes[resolvedSelectedIndex];

  function selectAndFocus(index: number): void {
    const normalized = ((index % network.nodes.length) + network.nodes.length) % network.nodes.length;
    onStateChange({ ...state, selectedScaleId: network.nodes[normalized].scaleId });
    requestAnimationFrame(() => nodeRefs.current[normalized]?.focus());
  }

  function handleNodeKeyDown(event: KeyboardEvent<SVGGElement>, index: number): void {
    if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(network.nodes.length - 1);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    selectAndFocus(index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1));
  }

  function handleFamilyChange(nextFamily: ModeFamilyId): void {
    const nextNetwork = buildModeNetwork(root, nextFamily, relationship);
    onStateChange({
      ...state,
      familyId: nextFamily,
      selectedScaleId: nextNetwork.nodes[0].scaleId,
    });
  }

  function renderNode(node: ModeNetworkNode, index: number) {
    const point = pointForNode(index, resolvedSelectedIndex);
    const selected = index === resolvedSelectedIndex;
    const central = selected;
    const color = fretboardIntervalColor(NODE_INTERVAL_COLORS[index]);
    const lines = modeLabelLines(t(node.learning.label));
    return (
      <g
        key={node.id}
        ref={(element) => { nodeRefs.current[index] = element; }}
        id={`mode-network-node-${index}`}
        role="option"
        aria-label={`${t(node.label)}${locale === "ja" ? "。" : ". "}${t(node.characteristicInterval)}`}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        className="mode-network-node"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        onClick={() => onStateChange({ ...state, selectedScaleId: node.scaleId })}
        onKeyDown={(event) => handleNodeKeyDown(event, index)}
      >
        <circle
          cx={point.x}
          cy={point.y}
          r={central ? 84 : 66}
          fill={selected
            ? "var(--interactive-academy-bg)"
            : central ? "var(--interactive-accent-bg)" : "var(--surface-overlay)"}
          stroke={selected ? "var(--interactive-academy-text)" : color}
          strokeWidth={selected ? 4 : central ? 3 : 2}
        />
        <text
          x={point.x}
          y={point.y - (lines.length > 1 ? 18 : 11)}
          textAnchor="middle"
          fill={selected ? "var(--interactive-academy-text)" : color}
          fontFamily="var(--font-display)"
          fontSize={central ? 31 : 25}
          fontWeight="700"
          pointerEvents="none"
        >
          {node.root}
        </text>
        {lines.map((line, lineIndex) => (
          <text
            key={line}
            x={point.x}
            y={point.y + 17 + lineIndex * 18}
            textAnchor="middle"
            fill={selected ? "var(--interactive-academy-text)" : color}
            fontFamily="var(--font-mono)"
            fontSize={central ? 15 : 12}
            pointerEvents="none"
          >
            {line}
          </text>
        ))}
      </g>
    );
  }

  return (
    <section
      className="hh-workspace"
      data-testid="note-neural-network"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby="note-network-title"
    >
      <div className="hh-workspace__inner">
        <WorkspaceHeader
          titleId="note-network-title"
          title="Note Neural Network"
          description="See how modes connect without losing the notes beneath your hands."
        />

        <section className="hh-control-rail" aria-label={t("Mode network controls")}>
          <WorkspaceSelectControl
            id="mode-network-root"
            label="Root"
            value={root}
            onChange={(value) => onStateChange({ ...state, root: value })}
            className="w-36"
          >
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </WorkspaceSelectControl>

          <WorkspaceSelectControl
            id="mode-network-family"
            label="Family"
            value={familyId}
            onChange={(value) => handleFamilyChange(value as ModeFamilyId)}
            className="w-56"
          >
            {MODE_FAMILIES.map((family) => <option key={family.id} value={family.id}>{t(family.label)}</option>)}
          </WorkspaceSelectControl>

          <WorkspaceSegmentedControl
            label="Relationship"
            value={relationship}
            onChange={(value) => onStateChange({ ...state, relationship: value })}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "parallel", label: "Parallel" },
              { value: "relative", label: "Relative" },
            ]}
          />
        </section>

        <div className="hh-panel grid overflow-hidden lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)]">
          <div
            className="min-w-0 overflow-x-auto p-2 sm:p-5 lg:p-7"
            data-testid="mode-network-graph-scroller"
          >
            <svg
              viewBox="0 0 700 680"
              className="mx-auto block aspect-square w-full min-w-[42rem] max-w-[44rem] sm:min-w-0"
              role="listbox"
              aria-label={t(`${root} ${t(network.familyLabel)} ${t(relationship)} mode relationships`)}
            >
              <circle cx={CENTER.x} cy={CENTER.y} r="286" fill="var(--surface-sunken)" stroke="var(--border-subtle)" />
              {network.nodes.map((node, index) => {
                if (index === resolvedSelectedIndex) return null;
                const point = pointForNode(index, resolvedSelectedIndex);
                return (
                  <g key={`edge-${node.id}`} aria-hidden="true">
                    <line
                      x1={CENTER.x}
                      y1={CENTER.y}
                      x2={point.x}
                      y2={point.y}
                      className="mode-network-edge"
                      data-reduced-motion={reduceMotion ? "true" : "false"}
                      stroke={fretboardIntervalColor(NODE_INTERVAL_COLORS[index])}
                      strokeWidth="2"
                      strokeOpacity="0.72"
                    />
                    <circle cx={point.x * 0.2 + CENTER.x * 0.8} cy={point.y * 0.2 + CENTER.y * 0.8} r="4" fill={fretboardIntervalColor(NODE_INTERVAL_COLORS[index])} />
                  </g>
                );
              })}
              {network.nodes.map(renderNode)}
            </svg>
          </div>

          <aside className="flex flex-col border-t p-6 lg:border-l lg:border-t-0 lg:p-8" style={{ borderColor: "var(--border-default)" }} aria-label={t(`${t(selectedNode.label)} details`)}>
            <div className="flex items-start gap-3">
              <Network size={23} aria-hidden="true" style={{ color: "var(--interactive-academy-text)", marginTop: "0.35rem" }} />
              <h2 className="hh-panel-title" style={{ color: "var(--interactive-academy-text)" }}>{t(selectedNode.label)}</h2>
            </div>

            <dl className="mt-6 divide-y" style={{ borderColor: "var(--border-default)" }}>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Notes")}</dt>
                <dd className="mt-2 readout" style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)" }}>{selectedNode.notes.join(" · ")}</dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Characteristic interval")}</dt>
                <dd className="mt-2" style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)" }}>{t(selectedNode.characteristicInterval)}</dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Interval formula")}</dt>
                <dd className="mt-2 readout" style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)" }}>
                  {scaleIntervalFormulaFor(selectedNode.scaleId).join(" · ")}
                </dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Steps")}</dt>
                <dd className="mt-2 readout" style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)" }}>{selectedNode.steps.join(" · ")}</dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Use it over")}</dt>
                <dd className="mt-2" style={{ color: "var(--interactive-accent-text)" }}>{t(selectedNode.learning.useItOver)}</dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Hear it in")}</dt>
                <dd className="mt-2" style={{ color: "var(--interactive-academy-text)" }}>{t(selectedNode.learning.hearItIn)}</dd>
              </div>
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Relationship")}</dt>
                <dd className="mt-2" style={{ color: "var(--text-primary)" }}>
                  {relationship === "relative"
                    ? locale === "ja"
                      ? t("Relative: same seven notes, heard from a different tonal center.")
                      : "Relative: same seven notes, new tonal center"
                    : locale === "ja"
                      ? t("Parallel: same root, different interval color and harmonic gravity.")
                      : `Parallel: same ${root} root, new interval formula`}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => onOpenScale(selectedNode.root, selectedNode.scaleId)}
              className="hh-action mt-6"
              style={{ backgroundColor: "var(--interactive-academy-bg)", border: "1px solid var(--interactive-academy-border)", color: "var(--interactive-academy-text)" }}
            >
              {t("Open in Scale Synthesia")}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import { WorkspaceHeader } from "./WorkspaceChrome";
import { useReducedMotion } from "framer-motion";
import {
  adjacentCircleKeys,
  buildTheoryRelationshipCatalog,
  CIRCLE_KEYS,
  canonicalTheoryRoot,
  circleKeyAt,
  createTheoryContext,
  scaleIntervalFormulaFor,
  scaleLearningDefinitionFor,
  selectCircleRelationshipEdges,
  spellScaleNotes,
  type CircleKey,
  type ScaleFormulaType,
} from "../lib/theory";
import { useLocale, useT } from "../i18n/I18nContext";
import { chordFamilyPresentation } from "../lib/visual/chordFamily";

interface CircleOfFifthsProps {
  onUseKey: (key: CircleKey) => void;
  selectedRoot?: string;
  selectedScaleId?: ScaleFormulaType;
  onRootChange?: (root: string) => void;
  onOpenImprov?: (root: string, returnFocusId?: string) => void;
  embedded?: boolean;
}

const CENTER = 360;
const OUTER_RADIUS = 324;
const INNER_RADIUS = 146;
const DIVIDER_RADIUS = 232;
const SECTOR_DEGREES = 360 / CIRCLE_KEYS.length;
const CANONICAL_KEY_SIGNATURES: Readonly<Record<string, string>> = Object.freeze({
  C: "No sharps or flats",
  "C#": "7 sharps",
  D: "2 sharps",
  Eb: "3 flats",
  E: "4 sharps",
  F: "1 flat",
  "F#": "6 sharps",
  G: "1 sharp",
  Ab: "4 flats",
  A: "3 sharps",
  Bb: "2 flats",
  B: "5 sharps",
});

interface Point {
  readonly x: number;
  readonly y: number;
}

function pointAt(radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
}

function ringSegmentPath(index: number, innerRadius: number, outerRadius: number): string {
  const startAngle = -90 - SECTOR_DEGREES / 2 + index * SECTOR_DEGREES;
  const endAngle = startAngle + SECTOR_DEGREES;
  const outerStart = pointAt(outerRadius, startAngle);
  const outerEnd = pointAt(outerRadius, endAngle);
  const innerEnd = pointAt(innerRadius, endAngle);
  const innerStart = pointAt(innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function modulationArcPath(fromIndex: number, toIndex: number): string {
  const fromAngle = -90 + fromIndex * SECTOR_DEGREES;
  const toAngle = -90 + toIndex * SECTOR_DEGREES;
  const from = pointAt(306, fromAngle);
  const to = pointAt(306, toAngle);
  const control = pointAt(342, (fromAngle + toAngle) / 2);
  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
}

function displayRoot(key: CircleKey): string {
  return key.major.replace(" major", "");
}

function displayMinorRoot(key: CircleKey): string {
  return key.relativeMinor.replace(" minor", "");
}

function circleIndexForRoot(root: string): number {
  const enharmonicRoot = root === "C#" ? "Db" : root === "F#" ? "F#" : root;
  const index = CIRCLE_KEYS.findIndex((key) => (
    key.builderKey === enharmonicRoot
    || key.id.split(" / ").includes(enharmonicRoot)
  ));
  return index >= 0 ? index : 0;
}

export default function CircleOfFifths({
  onUseKey,
  selectedRoot,
  selectedScaleId = "major",
  onRootChange,
  onOpenImprov,
  embedded = false,
}: CircleOfFifthsProps) {
  const t = useT();
  const { locale } = useLocale();
  const [localSelectedIndex, setLocalSelectedIndex] = useState(0);
  const selectedIndex = selectedRoot === undefined
    ? localSelectedIndex
    : circleIndexForRoot(selectedRoot);
  const sectorRefs = useRef<Array<SVGGElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const selectedKey = circleKeyAt(selectedIndex);
  const [counterClockwiseKey, clockwiseKey] = adjacentCircleKeys(selectedIndex);
  const relationshipRoot = canonicalTheoryRoot(selectedRoot ?? selectedKey.builderKey);
  const contextScale = scaleLearningDefinitionFor(selectedScaleId);
  const contextLabel = `${relationshipRoot} ${contextScale.label}`;
  const contextNotes = spellScaleNotes(relationshipRoot, selectedScaleId);
  const contextFormula = scaleIntervalFormulaFor(selectedScaleId);
  const contextSignature = CANONICAL_KEY_SIGNATURES[relationshipRoot] ?? selectedKey.signature;
  const contextRelativeMinor = selectedScaleId === "major"
    ? `${contextNotes[5]} minor`
    : null;
  const relationshipCatalog = buildTheoryRelationshipCatalog(createTheoryContext({
    root: relationshipRoot,
    scaleId: selectedScaleId,
  }));
  const relationshipNodes = new Map(relationshipCatalog.nodes.map((node) => [node.id, node]));
  const contextRelationships = selectCircleRelationshipEdges(relationshipCatalog);
  const diatonicChordRows = contextNotes.flatMap((note) => {
    const edge = relationshipCatalog.edges.find((candidate) => (
      candidate.kind === "diatonic_function"
      && candidate.sourceId === relationshipCatalog.selectedNodeId
      && relationshipNodes.get(candidate.targetId)?.root === note
    ));
    const node = edge ? relationshipNodes.get(edge.targetId) : undefined;
    return edge && node ? [{ edge, node }] : [];
  });

  function selectIndex(index: number): number {
    const normalized = ((index % CIRCLE_KEYS.length) + CIRCLE_KEYS.length) % CIRCLE_KEYS.length;
    setLocalSelectedIndex(normalized);
    onRootChange?.(canonicalTheoryRoot(circleKeyAt(normalized).builderKey));
    return normalized;
  }

  function selectAndFocus(index: number): void {
    const normalized = selectIndex(index);
    requestAnimationFrame(() => sectorRefs.current[normalized]?.focus());
  }

  function handleSectorKeyDown(event: KeyboardEvent<SVGGElement>, index: number): void {
    if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(CIRCLE_KEYS.length - 1);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    selectAndFocus(index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1));
  }

  return (
    <section
      className={embedded ? "" : "hh-workspace"}
      data-testid="circle-of-fifths"
      aria-labelledby={embedded ? "theory-tool-circle-heading" : "circle-title"}
    >
      <div className={embedded ? "" : "hh-workspace__inner"}>
      {embedded ? null : (
        <WorkspaceHeader
          titleId="circle-title"
          title="Circle of Fifths"
          description="Move by fifths to compare keys, relatives, and nearby modulation paths."
        />
      )}

      <div
        className="hh-panel grid overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(24rem,1fr)]"
      >
        <div className="min-w-0 p-3 sm:p-6 lg:p-8">
          <svg
            viewBox="0 0 720 720"
            className="mx-auto block aspect-square w-full max-w-[46rem]"
            role="listbox"
            aria-label={t("Major keys and relative minor keys around the Circle of Fifths")}
            aria-activedescendant={`circle-key-${selectedIndex}`}
            data-reduced-motion={reduceMotion ? "true" : "false"}
          >
            <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill="var(--surface-sunken)" />
            {[selectedIndex - 1, selectedIndex + 1].map((targetIndex, arcIndex) => (
              <path
                key={targetIndex}
                d={modulationArcPath(selectedIndex, targetIndex)}
                className="circle-modulation-arc"
                data-reduced-motion={reduceMotion ? "true" : "false"}
                fill="none"
                stroke={arcIndex === 0 ? "var(--text-academy)" : "var(--text-accent)"}
                strokeWidth="3"
                strokeDasharray="8 8"
                aria-hidden="true"
              />
            ))}

            {CIRCLE_KEYS.map((key, index) => {
              const selected = index === selectedIndex;
              const adjacent = index === (selectedIndex + 1) % CIRCLE_KEYS.length
                || index === (selectedIndex - 1 + CIRCLE_KEYS.length) % CIRCLE_KEYS.length;
              const majorPoint = pointAt(278, -90 + index * SECTOR_DEGREES);
              const minorPoint = pointAt(190, -90 + index * SECTOR_DEGREES);
              return (
                <g
                  key={key.id}
                  id={`circle-key-${index}`}
                  ref={(element) => { sectorRefs.current[index] = element; }}
                  role="option"
                  aria-selected={selected}
                  aria-label={locale === "ja"
                    ? `${t(key.major)}、${t("Relative")}：${t(key.relativeMinor)}、${t(key.signature)}`
                    : `${key.major}, relative ${key.relativeMinor}, ${key.signature}`}
                  tabIndex={selected ? 0 : -1}
                  className="circle-key-sector"
                  onClick={() => selectIndex(index)}
                  onKeyDown={(event) => handleSectorKeyDown(event, index)}
                >
                  <path
                    d={ringSegmentPath(index, INNER_RADIUS, OUTER_RADIUS)}
                    className="circle-key-sector__path"
                    fill={selected ? "var(--interactive-accent-bg)" : "var(--surface-overlay)"}
                    stroke={selected
                      ? "var(--text-accent)"
                      : adjacent ? "var(--interactive-academy-border)" : "var(--border-default)"}
                    strokeWidth={selected ? 4 : adjacent ? 2 : 1.5}
                  />
                  <path
                    d={ringSegmentPath(index, DIVIDER_RADIUS - 1, DIVIDER_RADIUS)}
                    fill="var(--border-default)"
                    aria-hidden="true"
                  />
                  <text
                    x={majorPoint.x}
                    y={majorPoint.y - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={selected ? "var(--text-accent)" : "var(--text-primary)"}
                    fontFamily="var(--font-display)"
                    fontSize="27"
                    fontWeight={selected ? "700" : "600"}
                    pointerEvents="none"
                  >
                    {displayRoot(key)}
                  </text>
                  <text
                    x={majorPoint.x}
                    y={majorPoint.y + 23}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-secondary)"
                    fontFamily="var(--font-mono)"
                    fontSize="12"
                    pointerEvents="none"
                  >
                    {t("major")}
                  </text>
                  <text
                    x={minorPoint.x}
                    y={minorPoint.y - 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={selected ? "var(--text-accent)" : "var(--text-secondary)"}
                    fontFamily="var(--font-mono)"
                    fontSize="18"
                    fontWeight={selected ? "650" : "500"}
                    pointerEvents="none"
                  >
                    {displayMinorRoot(key)}
                  </text>
                  <text
                    x={minorPoint.x}
                    y={minorPoint.y + 19}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    pointerEvents="none"
                  >
                    {t("minor")}
                  </text>
                </g>
              );
            })}

            <circle cx={CENTER} cy={CENTER} r="108" fill="var(--surface-raised)" stroke="var(--border-subtle)" />
            <text x={CENTER} y={CENTER - 8} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-display)" fontSize="31" fontWeight="700">
              {displayRoot(selectedKey)}
            </text>
            <text x={CENTER} y={CENTER + 27} textAnchor="middle" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="13">
              {t(selectedKey.signature)}
            </text>
          </svg>
        </div>

        <aside
          className="flex flex-col border-t p-6 lg:border-l lg:border-t-0 lg:p-8"
          style={{ borderColor: "var(--border-default)" }}
          aria-label={`${t(contextLabel)} ${t("details")}`}
        >
          <div>
            <h2 className="hh-panel-title">{t(contextLabel)}</h2>
            {contextRelativeMinor ? (
              <p className="mt-2 readout" style={{ color: "var(--text-accent)", fontSize: "var(--text-xl)" }}>
                {t(contextRelativeMinor)}
              </p>
            ) : null}
          </div>

          <dl className="my-7 divide-y border-y" style={{ borderColor: "var(--border-default)" }}>
            {selectedScaleId === "major" ? (
              <div className="py-4">
                <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Circle key signature")}</dt>
                <dd className="mt-2 readout">{t(contextSignature)}</dd>
              </div>
            ) : null}
            <div className="py-4">
              <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Scale notes")}</dt>
              <dd className="mt-2 break-words readout">{contextNotes.join(" · ")}</dd>
            </div>
            <div className="py-4">
              <dt className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Interval formula")}</dt>
              <dd className="mt-2 readout">{contextFormula.join(" · ")}</dd>
            </div>
          </dl>

          <section aria-labelledby="circle-diatonic-heading">
            <h3 id="circle-diatonic-heading" style={{ fontSize: "var(--text-lg)" }}>{t("Diatonic chords")}</h3>
            <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4" aria-label={`${t(contextLabel)} ${t("Diatonic chords")}`}>
              {diatonicChordRows.map(({ edge, node }) => {
                const familyPresentation = chordFamilyPresentation(node.chordSymbol ?? node.label);
                return (
                  <li
                    key={edge.id}
                    className="flex min-h-16 flex-col items-center justify-center rounded-md px-2 py-2 text-center"
                    style={{ backgroundColor: "var(--surface-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    <span
                      className="readout inline-flex rounded px-1.5 py-0.5"
                      data-chord-family={familyPresentation.family}
                      style={{
                        color: familyPresentation.color,
                        backgroundColor: familyPresentation.backgroundColor,
                        border: `1px solid ${familyPresentation.borderColor}`,
                      }}
                    >
                      {node.label}
                    </span>
                    {node.functionKey ? (
                      <span className="mt-1 text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>
                        {t(node.functionKey)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="mt-7" aria-labelledby="circle-nearby-heading">
            <h3 id="circle-nearby-heading" style={{ fontSize: "var(--text-lg)" }}>{t("Nearby keys")}</h3>
            <div className="mt-3 grid gap-2">
              {[clockwiseKey, counterClockwiseKey].map((key, index) => (
                <button
                  key={key.id}
                  type="button"
                  onClick={() => selectAndFocus(CIRCLE_KEYS.indexOf(key))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: "var(--interactive-secondary-bg)",
                    border: `1px solid ${index === 0 ? "var(--interactive-accent-border)" : "var(--interactive-academy-border)"}`,
                    color: index === 0 ? "var(--interactive-accent-text)" : "var(--interactive-academy-text)",
                  }}
                >
                  <ArrowRight size={17} aria-hidden="true" />
                  <span>{t(key.major)}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => onUseKey(selectedKey)}
            className="hh-action mt-8 transition-colors"
            style={{
              backgroundColor: "var(--interactive-accent-bg)",
              border: "1px solid var(--interactive-accent-border)",
              color: "var(--interactive-accent-text)",
            }}
          >
            {t("HASH it")}
          </button>

          {onOpenImprov ? (
            <button
              id="circle-improv-trigger"
              type="button"
              onClick={() => onOpenImprov(relationshipRoot, "circle-improv-trigger")}
              className="hh-action mt-3 transition-colors"
              style={{
                backgroundColor: "var(--music-insight-action-bg)",
                border: "1px solid var(--music-insight-action-border)",
                color: "var(--music-insight-action-text)",
                transitionDuration: reduceMotion ? "0ms" : "var(--duration-fast)",
              }}
            >
              {t("IMPROV INSIGHT")}
            </button>
          ) : null}

          <p className="mt-auto pt-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("Use arrow keys to move around the circle.")}
          </p>
        </aside>

        <section
          className="border-t p-6 lg:col-span-2 lg:p-8"
          style={{ borderColor: "var(--border-default)" }}
          aria-labelledby="circle-relationships-heading"
        >
          <h3 id="circle-relationships-heading" style={{ fontSize: "var(--text-lg)" }}>{t("Relationships")}</h3>
          <ul className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
            {contextRelationships.map((edge) => {
              const relatedId = edge.sourceId === relationshipCatalog.selectedNodeId
                ? edge.targetId
                : edge.sourceId;
              const related = relationshipNodes.get(relatedId);
              const relatedFamily = related?.chordSymbol
                ? chordFamilyPresentation(related.chordSymbol)
                : null;
              return (
                <li key={edge.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span
                      data-chord-family={relatedFamily?.family}
                      className="inline-flex max-w-full truncate rounded px-1.5 py-0.5"
                      style={relatedFamily ? {
                        color: relatedFamily.color,
                        backgroundColor: relatedFamily.backgroundColor,
                        border: `1px solid ${relatedFamily.borderColor}`,
                      } : undefined}
                    >
                      {t(related?.label ?? relatedId)}
                    </span>
                    <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                      {related?.functionKey ? `${t(related.functionKey)} · ` : null}
                      {t(edge.kind)}
                    </span>
                  </span>
                  <span className="readout" style={{ color: edge.strength === 3
                    ? "var(--text-accent)"
                    : edge.strength === 2
                      ? "var(--text-academy)"
                      : "var(--text-muted)" }}>
                    <span aria-hidden="true">{edge.strength === 3 ? "━━━" : edge.strength === 2 ? "━━" : "┄┄"}</span>{" "}
                    {t(`${edge.strengthLabel} relationship`)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }} aria-label={t("Relationship strength legend")}>
            {t("Solid heavy lines are strong; medium lines are related; dashed lines are weak.")}
          </p>
        </section>
      </div>
      </div>
    </section>
  );
}

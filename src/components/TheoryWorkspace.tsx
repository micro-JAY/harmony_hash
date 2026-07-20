import { lazy, Suspense, useMemo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ALL_KEYS } from "../lib/harmonyBrain";
import {
  MOODS,
  SCALE_LEARNING,
  THEORY_MOOD_ANY,
  canonicalTheoryRoot,
  modeFamilyForScale,
  moodDefinitionFor,
  type CircleKey,
  type MoodId,
  type ScaleFormulaType,
  type TheoryContext,
} from "../lib/theory";
import { useT } from "../i18n/I18nContext";
import type { NoteNeuralNetworkState } from "./NoteNeuralNetwork";
import {
  WorkspaceHeader,
  WorkspaceSelectControl,
} from "./WorkspaceChrome";

const CircleOfFifths = lazy(() => import("./CircleOfFifths"));
const ScaleSynthesia = lazy(() => import("./ScaleSynthesia"));
const NoteNeuralNetwork = lazy(() => import("./NoteNeuralNetwork"));

export type TheoryWorkspaceContext = TheoryContext;

export type TheoryToolId = "circle" | "scales" | "network";
export type TheoryDisclosures = Readonly<Record<TheoryToolId, boolean>>;

interface TheoryWorkspaceProps {
  context: TheoryWorkspaceContext;
  onContextChange: (context: TheoryWorkspaceContext) => void;
  disclosures: TheoryDisclosures;
  onDisclosureChange: (tool: TheoryToolId, expanded: boolean) => void;
  networkState: NoteNeuralNetworkState;
  onNetworkStateChange: (state: NoteNeuralNetworkState) => void;
  onUseCircleKey: (key: CircleKey) => void;
  onUseScaleInHasher: (root: string, scaleId: ScaleFormulaType) => void;
  onOpenImprov: (root: string, returnFocusId?: string) => void;
  active: boolean;
}

interface TheoryToolSectionProps {
  id: TheoryToolId;
  title: string;
  summary: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
}

function TheoryToolSection({
  id,
  title,
  summary,
  expanded,
  onExpandedChange,
  children,
}: TheoryToolSectionProps) {
  const t = useT();
  const bodyId = `theory-tool-${id}`;
  const headingId = `${bodyId}-heading`;
  return (
    <section className="hh-panel overflow-hidden" data-theory-tool={id}>
      <header className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => onExpandedChange(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          style={{ color: "var(--text-primary)" }}
        >
          <ChevronDown
            size={20}
            aria-hidden="true"
            style={{
              flex: "0 0 auto",
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform var(--duration-normal) var(--ease-standard)",
            }}
          />
          <span className="min-w-0">
            <span id={headingId} role="heading" aria-level={2} className="block hh-panel-title">{t(title)}</span>
            <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>
              {t(summary)}
            </span>
          </span>
        </button>
      </header>
      <div
        id={bodyId}
        hidden={!expanded}
        className="border-t p-3 sm:p-5"
        style={{ borderColor: "var(--border-default)" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function TheoryWorkspace({
  context,
  onContextChange,
  disclosures,
  onDisclosureChange,
  networkState,
  onNetworkStateChange,
  onUseCircleKey,
  onUseScaleInHasher,
  onOpenImprov,
  active,
}: TheoryWorkspaceProps) {
  const t = useT();
  const moodScaleIds = useMemo(
    () => context.mood === THEORY_MOOD_ANY
      ? null
      : new Set<ScaleFormulaType>(moodDefinitionFor(context.mood).scales),
    [context.mood],
  );
  const visibleScaleDefinitions = useMemo(
    () => moodScaleIds === null
      ? SCALE_LEARNING
      : SCALE_LEARNING.filter((scale) => (
        moodScaleIds.has(scale.id) || scale.id === context.scaleId
      )),
    [context.scaleId, moodScaleIds],
  );

  function updateRoot(nextRoot: string): void {
    const root = canonicalTheoryRoot(nextRoot);
    onContextChange({ ...context, root });
    onNetworkStateChange({ ...networkState, root });
  }

  function updateScale(scaleId: ScaleFormulaType): void {
    const familyId = modeFamilyForScale(scaleId) ?? "major";
    onContextChange({ ...context, scaleId });
    onNetworkStateChange({
      ...networkState,
      root: context.root,
      familyId,
      selectedScaleId: scaleId,
    });
  }

  function selectCircleInsight(nextRoot: string, scaleId: ScaleFormulaType): void {
    const root = canonicalTheoryRoot(nextRoot);
    const familyId = modeFamilyForScale(scaleId) ?? "major";
    onContextChange({ ...context, root, scaleId });
    onNetworkStateChange({
      ...networkState,
      root,
      familyId,
      selectedScaleId: scaleId,
    });
  }

  function updateNetwork(nextState: NoteNeuralNetworkState): void {
    const root = canonicalTheoryRoot(nextState.root);
    onNetworkStateChange({ ...nextState, root });
    onContextChange({
      ...context,
      root,
      scaleId: nextState.selectedScaleId,
    });
  }

  const scaleLabel = SCALE_LEARNING.find((scale) => scale.id === context.scaleId)?.label
    ?? context.scaleId;
  const moodLabel = context.mood !== THEORY_MOOD_ANY
    ? MOODS.find((mood) => mood.id === context.mood)?.label ?? context.mood
    : "Any";
  const contextSummary = `${context.root} · ${t(scaleLabel)} · ${t(moodLabel)}`;

  return (
    <section
      className="hh-workspace"
      data-testid="theory-workspace"
      aria-labelledby="theory-workspace-title"
      aria-hidden={active ? undefined : true}
    >
      <div className="hh-workspace__inner">
        <WorkspaceHeader
          titleId="theory-workspace-title"
          title="Tune Toolbox"
          description="Connect keys, scales, and mode relationships without losing your place."
        />

        <section className="hh-control-rail" aria-label={t("Shared theory context")}>
          <WorkspaceSelectControl
            id="theory-root"
            label="Root"
            value={context.root}
            onChange={updateRoot}
            className="w-36"
          >
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl
            id="theory-scale"
            label="Scale or mode"
            value={context.scaleId}
            onChange={(scaleId) => updateScale(scaleId as ScaleFormulaType)}
            className="w-64"
          >
            {visibleScaleDefinitions.map((scale) => (
              <option key={scale.id} value={scale.id}>{t(scale.label)}</option>
            ))}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl
            id="theory-mood"
            label="Mood"
            value={context.mood === THEORY_MOOD_ANY ? "" : context.mood}
            onChange={(moodId) => onContextChange({
              ...context,
              mood: moodId === "" ? THEORY_MOOD_ANY : moodId as MoodId,
            })}
            className="w-52"
          >
            <option value="">{t("Any")}</option>
            {MOODS.map((mood) => (
              <option key={mood.id} value={mood.id}>{t(mood.label)}</option>
            ))}
          </WorkspaceSelectControl>
        </section>

        <p className="mb-4 readout" role="status" style={{ color: "var(--text-secondary)" }}>
          {contextSummary}
        </p>

        <div className="grid gap-4">
          <TheoryToolSection
            id="scales"
            title="Scale Synthesia"
            summary={contextSummary}
            expanded={disclosures.scales}
            onExpandedChange={(expanded) => onDisclosureChange("scales", expanded)}
          >
            <Suspense fallback={<span className="readout">{t("Loading Scale Synthesia…")}</span>}>
              <ScaleSynthesia
                embedded
                active={active && disclosures.scales}
                root={context.root}
                scaleId={context.scaleId}
                moodId={context.mood === THEORY_MOOD_ANY ? null : context.mood}
                onRootChange={updateRoot}
                onScaleChange={updateScale}
                onMoodChange={(moodId) => onContextChange({
                  ...context,
                  mood: moodId ?? THEORY_MOOD_ANY,
                })}
                onUseInHasher={onUseScaleInHasher}
              />
            </Suspense>
          </TheoryToolSection>

          <TheoryToolSection
            id="circle"
            title="The Circle"
            summary={contextSummary}
            expanded={disclosures.circle}
            onExpandedChange={(expanded) => onDisclosureChange("circle", expanded)}
          >
            <Suspense fallback={<span className="readout">{t("Loading The Circle…")}</span>}>
              <CircleOfFifths
                embedded
                selectedRoot={context.root}
                selectedScaleId={context.scaleId}
                onRootChange={updateRoot}
                onInsightSelect={selectCircleInsight}
                onUseKey={onUseCircleKey}
                onOpenImprov={onOpenImprov}
              />
            </Suspense>
          </TheoryToolSection>

          <TheoryToolSection
            id="network"
            title="Note Neural Network"
            summary={contextSummary}
            expanded={disclosures.network}
            onExpandedChange={(expanded) => onDisclosureChange("network", expanded)}
          >
            <Suspense fallback={<span className="readout">{t("Loading Note Neural Network…")}</span>}>
              <NoteNeuralNetwork
                embedded
                active={active && disclosures.network}
                onOpenScale={(root, scaleId) => {
                  const canonicalRoot = canonicalTheoryRoot(root);
                  onContextChange({ ...context, root: canonicalRoot, scaleId });
                  onNetworkStateChange({
                    ...networkState,
                    root: canonicalRoot,
                    familyId: modeFamilyForScale(scaleId) ?? "major",
                    selectedScaleId: scaleId,
                  });
                  onDisclosureChange("scales", true);
                }}
                state={networkState}
                onStateChange={updateNetwork}
              />
            </Suspense>
          </TheoryToolSection>
        </div>
      </div>
    </section>
  );
}

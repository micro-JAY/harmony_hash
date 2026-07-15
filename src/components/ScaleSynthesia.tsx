import { useEffect, useMemo, useRef, useState } from "react";
import { Guitar, Keyboard, Pause, Play } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import { playSchedule, type PlaybackHandle } from "../lib/audioEngine";
import {
  buildFretboardPattern,
  buildFretboardRows,
  buildScalePlaybackSchedule,
  buildScalePracticeSequence,
  decorateFretboardPositions,
  fretboardTuningDefinitionFor,
  MOODS,
  moodDefinitionFor,
  SCALE_FAMILIES,
  SCALE_LEARNING,
  scaleLearningDefinitionFor,
  scaleDegreeName,
  scaleStepLabels,
  spellScaleNotes,
  scaleIntervalsFor,
  type ArpeggioType,
  type MoodId,
  type PracticeDirection,
  type PracticeMaterial,
  type ScaleFamilyId,
  type ScaleFormulaType,
  type FretboardStringRow,
} from "../lib/theory";
import HorizontalFretboard from "./HorizontalFretboard";
import { fretboardIntervalColor } from "./fretboardVisuals";
import { useT } from "../i18n/I18nContext";
import ScalePianoKeyboard from "./ScalePianoKeyboard";
import {
  WorkspaceHeader,
  WorkspaceSegmentedControl,
  WorkspaceSelectControl,
} from "./WorkspaceChrome";

interface ScaleSynthesiaProps {
  moodId: MoodId | null;
  onMoodChange: (moodId: MoodId | null) => void;
  initialRoot?: string;
  initialScaleId?: ScaleFormulaType;
  root?: string;
  scaleId?: ScaleFormulaType;
  onRootChange?: (root: string) => void;
  onScaleChange?: (scaleId: ScaleFormulaType) => void;
  onUseInHasher?: (root: string, scaleId: ScaleFormulaType) => void;
  embedded?: boolean;
  active?: boolean;
}

type PracticeInstrument = "piano" | "guitar";

function rowsForPracticeMaterial(
  rows: ReadonlyArray<FretboardStringRow>,
  intervals: ReadonlySet<number>,
): ReadonlyArray<FretboardStringRow> {
  return Object.freeze(rows.map((row) => Object.freeze({
    string: row.string,
    positions: Object.freeze(row.positions.map((position) => {
      if (!position.isScaleTone || (position.interval !== null && intervals.has(position.interval))) {
        return position;
      }
      return Object.freeze({
        ...position,
        isScaleTone: false,
        isRoot: false,
        degree: null,
        interval: null,
        intervalLabel: null,
      });
    })),
  })));
}

export default function ScaleSynthesia({
  moodId,
  onMoodChange,
  initialRoot = "F#",
  initialScaleId = "harmonic_minor",
  root: controlledRoot,
  scaleId: controlledScaleId,
  onRootChange,
  onScaleChange,
  onUseInHasher,
  embedded = false,
  active = true,
}: ScaleSynthesiaProps) {
  const t = useT();
  const reduceMotion = Boolean(useReducedMotion());
  const initialDefinition = scaleLearningDefinitionFor(initialScaleId);
  const [instrument, setInstrument] = useState<PracticeInstrument>("piano");
  const [localRoot, setLocalRoot] = useState(initialRoot);
  const [family, setFamily] = useState<ScaleFamilyId>(initialDefinition.family);
  const [localScaleId, setLocalScaleId] = useState<ScaleFormulaType>(initialScaleId);
  const root = controlledRoot ?? localRoot;
  const scaleId = controlledScaleId ?? localScaleId;
  const [direction, setDirection] = useState<PracticeDirection>("ascending");
  const [material, setMaterial] = useState<PracticeMaterial>("scale");
  const [arpeggioType, setArpeggioType] = useState<ArpeggioType>("triad");
  const [activeSequenceIndex, setActiveSequenceIndex] = useState<number | null>(null);
  const [previousActive, setPreviousActive] = useState(active);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);

  if (previousActive !== active) {
    setPreviousActive(active);
    if (!active && activeSequenceIndex !== null) setActiveSequenceIndex(null);
  }

  const moodScaleIds = useMemo(
    () => moodId ? new Set<ScaleFormulaType>(moodDefinitionFor(moodId).scales) : null,
    [moodId],
  );
  const availableDefinitions = useMemo(
    () => moodScaleIds
      ? SCALE_LEARNING.filter((definition) => moodScaleIds.has(definition.id) || definition.id === scaleId)
      : SCALE_LEARNING,
    [moodScaleIds, scaleId],
  );
  const matchingDefinitionCount = moodScaleIds
    ? SCALE_LEARNING.filter((definition) => moodScaleIds.has(definition.id)).length
    : SCALE_LEARNING.length;
  const selectedScaleOutsideMood = moodScaleIds !== null && !moodScaleIds.has(scaleId);
  const availableFamilies = useMemo(
    () => SCALE_FAMILIES.filter((candidate) =>
      availableDefinitions.some((definition) => definition.family === candidate.id)),
    [availableDefinitions],
  );
  const requestedFamily = controlledScaleId
    ? scaleLearningDefinitionFor(controlledScaleId).family
    : family;
  const resolvedFamily = availableFamilies.some((candidate) => candidate.id === requestedFamily)
    ? requestedFamily
    : availableFamilies[0].id;
  const familyDefinitions = availableDefinitions.filter(
    (definition) => definition.family === resolvedFamily,
  );
  const definition = familyDefinitions.find((candidate) => candidate.id === scaleId)
    ?? familyDefinitions[0];
  const resolvedScaleId = definition.id;
  const practiceSequence = buildScalePracticeSequence(
    root,
    resolvedScaleId,
    material,
    arpeggioType,
    direction,
  );
  const intervals = scaleIntervalsFor(resolvedScaleId);
  const scaleNotes = spellScaleNotes(root, resolvedScaleId);
  const steps = scaleStepLabels(resolvedScaleId);
  const activeMidi = activeSequenceIndex === null
    ? null
    : practiceSequence[activeSequenceIndex]?.midi ?? null;
  const isPlaying = activeSequenceIndex !== null;

  const guitarRows = buildFretboardRows("guitar", root, resolvedScaleId, 15, "guitar-standard");
  const practiceIntervals = new Set(practiceSequence.map((note) => note.interval));
  const displayedGuitarRows = material === "scale"
    ? guitarRows
    : rowsForPracticeMaterial(guitarRows, practiceIntervals);
  const guitarPattern = buildFretboardPattern(
    displayedGuitarRows,
    "guitar",
    "guitar-standard",
    root,
    resolvedScaleId,
    { family: "all", cagedForm: "e", threeNpsStartDegree: 1 },
  );
  const decoratedGuitarPositions = decorateFretboardPositions(
    displayedGuitarRows,
    guitarPattern,
    [],
  );

  useEffect(() => () => {
    playbackRef.current?.stop();
  }, []);

  useEffect(() => {
    if (active) return;
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, [active]);

  function updateRoot(nextRoot: string): void {
    setLocalRoot(nextRoot);
    onRootChange?.(nextRoot);
  }

  function updateScale(nextScaleId: ScaleFormulaType): void {
    setLocalScaleId(nextScaleId);
    onScaleChange?.(nextScaleId);
  }

  async function handlePlayback(): Promise<void> {
    if (isPlaying) {
      playbackRef.current?.stop();
      playbackRef.current = null;
      setActiveSequenceIndex(null);
      return;
    }
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    setActiveSequenceIndex(0);
    if (context.state === "suspended") await context.resume();
    playbackRef.current = playSchedule(
      buildScalePlaybackSchedule(practiceSequence),
      context,
      (index) => {
        setActiveSequenceIndex(index);
        if (index === null) playbackRef.current = null;
      },
    );
  }

  function handleFamilyChange(nextFamily: string): void {
    const typedFamily = nextFamily as ScaleFamilyId;
    const first = availableDefinitions.find((candidate) => candidate.family === typedFamily);
    if (!first) throw new RangeError(`No scales available for family ${typedFamily}`);
    setFamily(typedFamily);
    updateScale(first.id);
  }

  return (
    <section
      className={embedded ? "" : "hh-workspace"}
      data-testid="scale-synthesia"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby={embedded ? "theory-tool-scales-heading" : "scale-synthesia-title"}
    >
      <div className={embedded ? "" : "hh-workspace__inner"}>
        {embedded ? null : (
          <WorkspaceHeader
            titleId="scale-synthesia-title"
            title="Scale Synthesia"
            description="See the scale, hear the sound, and feel the pattern—one step at a time."
          />
        )}

        <section
          aria-label={t("Scale practice controls")}
          className="hh-control-rail"
        >
          <WorkspaceSegmentedControl
            label="Instrument"
            value={instrument}
            onChange={setInstrument}
            reducedMotion={reduceMotion}
            options={[
              { value: "piano", label: "Piano", icon: <Keyboard size={15} aria-hidden="true" /> },
              { value: "guitar", label: "Guitar", icon: <Guitar size={15} aria-hidden="true" /> },
            ]}
          />
          {embedded ? null : (
            <>
              <WorkspaceSelectControl id="scale-root" label="Root" value={root} onChange={updateRoot} className="w-32">
                {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
              </WorkspaceSelectControl>
              <WorkspaceSelectControl id="scale-family" label="Family" value={resolvedFamily} onChange={handleFamilyChange} className="w-52">
                {availableFamilies.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{t(candidate.label)}</option>
                ))}
              </WorkspaceSelectControl>
              <WorkspaceSelectControl
                id="scale-mode"
                label="Scale or mode"
                value={resolvedScaleId}
                onChange={(value) => updateScale(value as ScaleFormulaType)}
                className="w-56"
              >
                {familyDefinitions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{t(candidate.label)}</option>
                ))}
              </WorkspaceSelectControl>
              <WorkspaceSelectControl
                id="scale-mood"
                label="Mood lens"
                value={moodId ?? ""}
                onChange={(value) => onMoodChange(value === "" ? null : value as MoodId)}
                className="w-44"
              >
                <option value="">{t("Any harmony")}</option>
                {MOODS.map((mood) => <option key={mood.id} value={mood.id}>{t(mood.label)}</option>)}
              </WorkspaceSelectControl>
            </>
          )}
          <WorkspaceSegmentedControl
            label="Direction"
            value={direction}
            onChange={setDirection}
            reducedMotion={reduceMotion}
            options={[
              { value: "ascending", label: "Ascending" },
              { value: "descending", label: "Descending" },
            ]}
          />
          <WorkspaceSegmentedControl
            label="Material"
            value={material}
            onChange={setMaterial}
            reducedMotion={reduceMotion}
            options={[
              { value: "scale", label: "Scale" },
              { value: "arpeggio", label: "Arpeggio" },
            ]}
          />
          {material === "arpeggio" ? (
            <WorkspaceSelectControl
              id="arpeggio-type"
              label="Arpeggio type"
              value={arpeggioType}
              onChange={(value) => setArpeggioType(value as ArpeggioType)}
              className="w-44"
            >
              <option value="triad">{t("Triad")} (1 3 5)</option>
              <option value="seventh">{t("Seventh")} (1 3 5 7)</option>
            </WorkspaceSelectControl>
          ) : null}
          <button
            type="button"
            onClick={() => void handlePlayback()}
            className="hh-action ml-auto"
            aria-label={t(isPlaying ? "Stop scale playback" : "Play scale")}
            style={{
              backgroundColor: "var(--interactive-accent-bg)",
              border: "1px solid var(--interactive-accent-border)",
              color: "var(--interactive-accent-text)",
            }}
          >
            {isPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
            {t(isPlaying ? "Stop scale" : "Play scale")}
          </button>
          {onUseInHasher ? (
            <button
              type="button"
              onClick={() => onUseInHasher(root, resolvedScaleId)}
              className="hh-action"
              style={{
                backgroundColor: "var(--interactive-accent-bg)",
                border: "1px solid var(--interactive-accent-border)",
                color: "var(--interactive-accent-text)",
              }}
            >
              {t("Use this in Hasher")}
            </button>
          ) : null}
        </section>

        {moodId ? (
          <p className="mb-4 text-sm" role="status" style={{ color: "var(--status-academy-text)" }}>
            {t(`${moodDefinitionFor(moodId).label} lens · showing ${matchingDefinitionCount} matching scales from the shared mood vocabulary.`)}
            {selectedScaleOutsideMood ? ` ${t("Current selection remains available for comparison.")}` : null}
          </p>
        ) : null}

        <section
          aria-label={t(`${root} ${definition.label} ${t(instrument)} practice map`)}
          className="hh-panel overflow-hidden"
          style={{ backgroundColor: "var(--surface-sunken)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
            <p style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>
              {root} {t(definition.label)} · {t(direction === "ascending" ? "Ascending" : "Descending")}
            </p>
            <ol className="flex flex-wrap gap-2" aria-label={t("Playback sequence")}>
              {practiceSequence.map((note, index) => (
                <li
                  key={`${note.midi}-${index}`}
                  className="h-2.5 w-2.5 rounded-full"
                  aria-label={t(`${index + 1}: ${note.label}, degree ${note.degree}`)}
                  data-playing={activeSequenceIndex === index ? "true" : "false"}
                  style={{
                    backgroundColor: activeSequenceIndex === index
                      ? fretboardIntervalColor(note.interval)
                      : "var(--border-strong)",
                    boxShadow: activeSequenceIndex === index ? `0 0 0 3px color-mix(in srgb, ${fretboardIntervalColor(note.interval)} 25%, transparent)` : "none",
                  }}
                />
              ))}
            </ol>
          </div>
          <div className="p-3 md:p-5">
            {instrument === "piano" ? (
              <ScalePianoKeyboard
                notes={practiceSequence}
                activeMidi={activeMidi}
                reducedMotion={reduceMotion}
              />
            ) : (
              <HorizontalFretboard
                instrument="guitar"
                tuning={fretboardTuningDefinitionFor("guitar", "guitar-standard")}
                handedness="right"
                rows={displayedGuitarRows}
                labelMode="notes"
                pattern={guitarPattern}
                decoratedPositions={decoratedGuitarPositions}
                keyName={root}
                modeLabel={definition.label}
              />
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-label={t("Scale learning guide")}>
          <div className="min-w-0 border-l-2 pl-5 md:pl-7" style={{ borderColor: "var(--border-accent)" }}>
            <div className="grid gap-y-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-6">
              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Scale notes")}</h2>
              <ol className="flex flex-wrap items-center gap-2" aria-label={t("Scale notes")}>
                {[...scaleNotes, scaleNotes[0]].map((note, index) => (
                  <li key={`${note}-${index}`} className="flex items-center gap-2 readout" style={{ color: fretboardIntervalColor(intervals[index] ?? 0), fontSize: "var(--text-lg)" }}>
                    {note}{index < scaleNotes.length ? <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>›</span> : null}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Interval formula")}</h2>
              <ol className="flex flex-wrap gap-2" aria-label={t("Whole and half step formula")}>
                {steps.map((step, index) => (
                  <li key={`${step}-${index}`} className="min-w-12 rounded-md px-3 py-1.5 text-center readout" style={{ border: `1px solid ${fretboardIntervalColor(intervals[index])}`, color: fretboardIntervalColor(intervals[index]) }}>
                    {step}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Named degrees")}</h2>
              <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label={t("Named scale degrees")}>
                {intervals.map((interval, index) => (
                  <li key={`${interval}-${index}`} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full readout" style={{ border: `1px solid ${fretboardIntervalColor(interval)}`, color: fretboardIntervalColor(interval) }}>
                      {index + 1}
                    </span>
                    {t(scaleDegreeName(interval, resolvedScaleId))}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Use it for")}</h2>
              <p style={{ color: "var(--interactive-accent-text)", fontSize: "var(--text-lg)" }}>{t(definition.useItFor)}</p>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Hear it in")}</h2>
              <p style={{ color: "var(--interactive-academy-text)", fontSize: "var(--text-lg)" }}>{t(definition.hearItIn)}</p>
            </div>
          </div>

          <aside className="hh-panel p-5" aria-label={t("Practice summary")}>
            <span className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Current practice")}</span>
            <p className="mt-3" style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>
              {material === "scale" ? t(definition.label) : `${t(definition.label)} ${t(arpeggioType)}`}
            </p>
            <p className="mt-2 readout" style={{ color: "var(--text-secondary)" }}>
              {practiceSequence.map((note) => note.label).join(" · ")}
            </p>
            <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("Root color stays gold in both instrument views. Every other degree keeps its interval color.")}
            </p>
          </aside>
        </section>
      </div>
    </section>
  );
}

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
}: ScaleSynthesiaProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const initialDefinition = scaleLearningDefinitionFor(initialScaleId);
  const [instrument, setInstrument] = useState<PracticeInstrument>("piano");
  const [root, setRoot] = useState(initialRoot);
  const [family, setFamily] = useState<ScaleFamilyId>(initialDefinition.family);
  const [scaleId, setScaleId] = useState<ScaleFormulaType>(initialScaleId);
  const [direction, setDirection] = useState<PracticeDirection>("ascending");
  const [material, setMaterial] = useState<PracticeMaterial>("scale");
  const [arpeggioType, setArpeggioType] = useState<ArpeggioType>("triad");
  const [activeSequenceIndex, setActiveSequenceIndex] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);

  const moodScaleIds = useMemo(
    () => moodId ? new Set<ScaleFormulaType>(moodDefinitionFor(moodId).scales) : null,
    [moodId],
  );
  const availableDefinitions = useMemo(
    () => moodScaleIds
      ? SCALE_LEARNING.filter((definition) => moodScaleIds.has(definition.id))
      : SCALE_LEARNING,
    [moodScaleIds],
  );
  const availableFamilies = useMemo(
    () => SCALE_FAMILIES.filter((candidate) =>
      availableDefinitions.some((definition) => definition.family === candidate.id)),
    [availableDefinitions],
  );
  const resolvedFamily = availableFamilies.some((candidate) => candidate.id === family)
    ? family
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
    setScaleId(first.id);
  }

  return (
    <section
      className="hh-workspace"
      data-testid="scale-synthesia"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby="scale-synthesia-title"
    >
      <div className="hh-workspace__inner">
        <WorkspaceHeader
          titleId="scale-synthesia-title"
          title="Scale Synthesia"
          description="See the scale, hear the sound, and feel the pattern—one step at a time."
        />

        <section
          aria-label="Scale practice controls"
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
          <WorkspaceSelectControl id="scale-root" label="Root" value={root} onChange={setRoot} className="w-32">
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl id="scale-family" label="Family" value={resolvedFamily} onChange={handleFamilyChange} className="w-52">
            {availableFamilies.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl
            id="scale-mode"
            label="Scale or mode"
            value={resolvedScaleId}
            onChange={(value) => setScaleId(value as ScaleFormulaType)}
            className="w-56"
          >
            {familyDefinitions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl
            id="scale-mood"
            label="Mood lens"
            value={moodId ?? ""}
            onChange={(value) => onMoodChange(value === "" ? null : value as MoodId)}
            className="w-44"
          >
            <option value="">Any harmony</option>
            {MOODS.map((mood) => <option key={mood.id} value={mood.id}>{mood.label}</option>)}
          </WorkspaceSelectControl>
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
              <option value="triad">Triad (1 3 5)</option>
              <option value="seventh">Seventh (1 3 5 7)</option>
            </WorkspaceSelectControl>
          ) : null}
          <button
            type="button"
            onClick={() => void handlePlayback()}
            className="hh-action ml-auto"
            aria-label={isPlaying ? "Stop scale playback" : "Play scale"}
            style={{
              backgroundColor: "var(--interactive-accent-bg)",
              border: "1px solid var(--interactive-accent-border)",
              color: "var(--interactive-accent-text)",
            }}
          >
            {isPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
            {isPlaying ? "Stop" : "Play scale"}
          </button>
        </section>

        {moodId ? (
          <p className="mb-4 text-sm" role="status" style={{ color: "var(--status-academy-text)" }}>
            {moodDefinitionFor(moodId).label} lens · showing {availableDefinitions.length} matching scales from the shared mood vocabulary.
          </p>
        ) : null}

        <section
          aria-label={`${root} ${definition.label} ${instrument} practice map`}
          className="hh-panel overflow-hidden"
          style={{ backgroundColor: "var(--surface-sunken)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
            <p style={{ color: "var(--text-primary)", fontWeight: "var(--weight-semibold)" }}>
              {root} {definition.label} · {direction === "ascending" ? "Ascending" : "Descending"}
            </p>
            <ol className="flex flex-wrap gap-2" aria-label="Playback sequence">
              {practiceSequence.map((note, index) => (
                <li
                  key={`${note.midi}-${index}`}
                  className="h-2.5 w-2.5 rounded-full"
                  aria-label={`${index + 1}: ${note.label}, degree ${note.degree}`}
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-label="Scale learning guide">
          <div className="min-w-0 border-l-2 pl-5 md:pl-7" style={{ borderColor: "var(--border-accent)" }}>
            <div className="grid gap-y-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-6">
              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>Scale notes</h2>
              <ol className="flex flex-wrap items-center gap-2" aria-label="Scale notes">
                {[...scaleNotes, scaleNotes[0]].map((note, index) => (
                  <li key={`${note}-${index}`} className="flex items-center gap-2 readout" style={{ color: fretboardIntervalColor(intervals[index] ?? 0), fontSize: "var(--text-lg)" }}>
                    {note}{index < scaleNotes.length ? <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>›</span> : null}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>Interval formula</h2>
              <ol className="flex flex-wrap gap-2" aria-label="Whole and half step formula">
                {steps.map((step, index) => (
                  <li key={`${step}-${index}`} className="min-w-12 rounded-md px-3 py-1.5 text-center readout" style={{ border: `1px solid ${fretboardIntervalColor(intervals[index])}`, color: fretboardIntervalColor(intervals[index]) }}>
                    {step}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>Named degrees</h2>
              <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Named scale degrees">
                {intervals.map((interval, index) => (
                  <li key={`${interval}-${index}`} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full readout" style={{ border: `1px solid ${fretboardIntervalColor(interval)}`, color: fretboardIntervalColor(interval) }}>
                      {index + 1}
                    </span>
                    {scaleDegreeName(interval, resolvedScaleId)}
                  </li>
                ))}
              </ol>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>Use it for</h2>
              <p style={{ color: "var(--interactive-accent-text)", fontSize: "var(--text-lg)" }}>{definition.useItFor}</p>

              <h2 className="label-caps" style={{ color: "var(--text-secondary)" }}>Hear it in</h2>
              <p style={{ color: "var(--interactive-academy-text)", fontSize: "var(--text-lg)" }}>{definition.hearItIn}</p>
            </div>
          </div>

          <aside className="hh-panel p-5" aria-label="Practice summary">
            <span className="label-caps" style={{ color: "var(--text-secondary)" }}>Current practice</span>
            <p className="mt-3" style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>
              {material === "scale" ? definition.label : `${definition.label} ${arpeggioType}`}
            </p>
            <p className="mt-2 readout" style={{ color: "var(--text-secondary)" }}>
              {practiceSequence.map((note) => note.label).join(" · ")}
            </p>
            <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Root color stays gold in both instrument views. Every other degree keeps its interval color.
            </p>
          </aside>
        </section>
      </div>
    </section>
  );
}

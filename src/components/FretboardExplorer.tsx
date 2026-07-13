import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Guitar, Music2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import type { IndexedChord } from "../lib/types";
import type { ScaleFormulaType } from "../lib/theory/scaleBasics";
import {
  buildFretboardPattern,
  buildFretboardRows,
  CAGED_FORM_OPTIONS,
  decorateFretboardPositions,
  deriveChordTones,
  fretboardTuningDefinitionFor,
  fretboardTuningsFor,
  THREE_NPS_OPTIONS,
  type CagedFormId,
  type FretboardInstrument,
  type FretboardPatternFamily,
  type FretboardTuningId,
  type ThreeNpsStartDegree,
} from "../lib/theory";
import ChordOverlayPicker from "./ChordOverlayPicker";
import HorizontalFretboard, {
  type FretboardHandedness,
  type FretboardLabelMode,
} from "./HorizontalFretboard";
import { fretboardIntervalColor, fretboardIntervalName } from "./fretboardVisuals";

const MODE_OPTIONS: ReadonlyArray<{ value: ScaleFormulaType; label: string }> = [
  { value: "major", label: "Major" },
  { value: "natural_minor", label: "Natural Minor" },
  { value: "harmonic_minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "lydian", label: "Lydian" },
  { value: "phrygian", label: "Phrygian" },
  { value: "major_pentatonic", label: "Major Pentatonic" },
  { value: "minor_pentatonic", label: "Minor Pentatonic" },
  { value: "major_blues", label: "Major Blues" },
  { value: "minor_blues", label: "Minor Blues" },
];

const DEFAULT_TUNINGS: Readonly<Record<FretboardInstrument, FretboardTuningId>> = Object.freeze({
  guitar: "guitar-standard",
  bass: "bass-standard",
});

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SegmentOption<T>>;
  onChange: (value: T) => void;
  reducedMotion: boolean;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  reducedMotion,
}: SegmentedControlProps<T>) {
  return (
    <div>
      <span
        className="mb-2 block"
        style={{
          color: "var(--text-secondary)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-full p-1"
        style={{ backgroundColor: "var(--surface-overlay)" }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className="flex min-h-9 items-center gap-2 rounded-full px-4 text-sm"
              style={{
                backgroundColor: active ? "var(--interactive-accent-bg)" : "transparent",
                color: active ? "var(--interactive-accent-text)" : "var(--text-secondary)",
                border: active ? "1px solid var(--interactive-accent-border)" : "1px solid transparent",
                fontFamily: "var(--font-body)",
                fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                transitionDuration: reducedMotion ? "0ms" : "var(--duration-normal)",
              }}
            >
              {option.value === "guitar" && <Guitar size={14} aria-hidden="true" />}
              {option.value === "bass" && <Music2 size={14} aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectControl<T extends string>({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="block w-40 min-w-0">
      <span
        className="mb-2 block"
        style={{
          color: "var(--text-secondary)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <select
        id={id}
        aria-label={`Fretboard ${label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          backgroundColor: "var(--surface-overlay)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {children}
      </select>
    </label>
  );
}

export default function FretboardExplorer() {
  const reduceMotion = useReducedMotion();
  const [instrument, setInstrument] = useState<FretboardInstrument>("guitar");
  const [keyName, setKeyName] = useState("C");
  const [scaleType, setScaleType] = useState<ScaleFormulaType>("major");
  const [labelMode, setLabelMode] = useState<FretboardLabelMode>("intervals");
  const [handedness, setHandedness] = useState<FretboardHandedness>("right");
  const [tuningByInstrument, setTuningByInstrument] = useState(() => ({ ...DEFAULT_TUNINGS }));
  const [patternFamily, setPatternFamily] = useState<FretboardPatternFamily>("all");
  const [cagedForm, setCagedForm] = useState<CagedFormId>("e");
  const [threeNpsStartDegree, setThreeNpsStartDegree] = useState<ThreeNpsStartDegree>(1);
  const [overlay, setOverlay] = useState<{ chord: IndexedChord; displayName: string }>();
  const tuningId = tuningByInstrument[instrument];
  const tuning = fretboardTuningDefinitionFor(instrument, tuningId);
  const tuningOptions = fretboardTuningsFor(instrument);
  const rows = useMemo(
    () => buildFretboardRows(instrument, keyName, scaleType, 15, tuningId),
    [instrument, keyName, scaleType, tuningId],
  );
  const scaleNotes = useMemo(() => {
    const byDegree = new Map<number, { note: string; interval: string; semitones: number }>();
    for (const row of rows) {
      for (const position of row.positions) {
        if (position.degree !== null && position.interval !== null && position.intervalLabel !== null && !byDegree.has(position.degree)) {
          byDegree.set(position.degree, {
            note: position.noteLabel,
            interval: position.intervalLabel,
            semitones: position.interval,
          });
        }
      }
    }
    return [...byDegree.entries()]
      .sort(([degreeA], [degreeB]) => degreeA - degreeB)
      .map(([, value]) => value);
  }, [rows]);
  const modeLabel = MODE_OPTIONS.find((option) => option.value === scaleType)?.label ?? scaleType;
  const pattern = useMemo(() => buildFretboardPattern(
    rows,
    instrument,
    tuningId,
    keyName,
    scaleType,
    { family: patternFamily, cagedForm, threeNpsStartDegree },
  ), [rows, instrument, tuningId, keyName, scaleType, patternFamily, cagedForm, threeNpsStartDegree]);
  const chordTones = useMemo(
    () => overlay ? deriveChordTones(overlay.chord) : [],
    [overlay],
  );
  const decoratedPositions = useMemo(
    () => decorateFretboardPositions(rows, pattern, chordTones),
    [rows, pattern, chordTones],
  );

  return (
    <section
      className="flex-1 px-4 py-6 md:py-10"
      data-testid="fretboard-workspace"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby="fretboard-title"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1
              id="fretboard-title"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-3xl)",
                fontWeight: "var(--weight-bold)",
                letterSpacing: "var(--tracking-tight)",
                lineHeight: "var(--leading-tight)",
              }}
            >
              Fretboard Explorer
            </h1>
            <p
              className="mt-2 max-w-3xl"
              style={{ color: "var(--text-secondary)", fontSize: "var(--text-md)" }}
            >
              See a scale across the whole instrument. Roots stay gold; interval roles keep the same color wherever they repeat.
            </p>
          </div>
          <div
            className="readout self-start rounded-full px-3 py-1.5 md:self-auto"
            style={{ backgroundColor: "var(--surface-overlay)", border: "1px solid var(--border-subtle)" }}
          >
            <span data-testid="fretboard-tuning-readout">
              {tuning.label} · {tuning.pitchSequence} · frets 0–15
            </span>
          </div>
        </header>

        <section
          aria-label="Fretboard controls"
          className="mb-6 flex flex-wrap items-end gap-x-2 gap-y-4 rounded-xl p-4 md:p-5"
          style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
        >
          <SegmentedControl
            label="Instrument"
            value={instrument}
            onChange={setInstrument}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "guitar", label: "Guitar" },
              { value: "bass", label: "Bass" },
            ]}
          />
          <SelectControl
            id="fretboard-tuning"
            label="Tuning"
            value={tuningId}
            onChange={(nextTuningId) => {
              setTuningByInstrument((current) => ({
                ...current,
                [instrument]: nextTuningId,
              }));
            }}
          >
            {tuningOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.pitchSequence}
              </option>
            ))}
          </SelectControl>
          <SegmentedControl
            label="Handedness"
            value={handedness}
            onChange={setHandedness}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "right", label: "Right-handed" },
              { value: "left", label: "Left-handed" },
            ]}
          />
          <SelectControl id="fretboard-root" label="Root" value={keyName} onChange={setKeyName}>
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </SelectControl>
          <SelectControl
            id="fretboard-mode"
            label="Mode"
            value={scaleType}
            onChange={setScaleType}
          >
            {MODE_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </SelectControl>
          <SegmentedControl
            label="Labels"
            value={labelMode}
            onChange={setLabelMode}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "intervals", label: "Intervals" },
              { value: "notes", label: "Notes" },
            ]}
          />
        </section>

        <section
          aria-label="Fretboard learning controls and current map"
          className="mb-5 grid min-w-0 gap-4 rounded-xl p-4 md:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)]"
          data-testid="fretboard-learning-layer"
          style={{
            backgroundColor: "var(--status-academy-bg)",
            border: "1px solid var(--status-academy-border)",
          }}
        >
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-end gap-3">
              <SegmentedControl
                label="Pattern"
                value={patternFamily}
                onChange={setPatternFamily}
                reducedMotion={Boolean(reduceMotion)}
                options={[
                  { value: "all", label: "All" },
                  { value: "caged", label: "CAGED" },
                  { value: "three-nps", label: "3NPS" },
                ]}
              />
              {patternFamily === "caged" ? (
                <SelectControl
                  id="fretboard-caged-form"
                  label="CAGED form"
                  value={cagedForm}
                  onChange={setCagedForm}
                >
                  {CAGED_FORM_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </SelectControl>
              ) : null}
              {patternFamily === "three-nps" ? (
                <SelectControl
                  id="fretboard-three-nps-position"
                  label="3NPS position"
                  value={String(threeNpsStartDegree)}
                  onChange={(value) => setThreeNpsStartDegree(Number(value) as ThreeNpsStartDegree)}
                >
                  {THREE_NPS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </SelectControl>
              ) : null}
              <ChordOverlayPicker
                selectedLabel={overlay?.displayName}
                reducedMotion={Boolean(reduceMotion)}
                onSelect={setOverlay}
                onClear={() => setOverlay(undefined)}
              />
            </div>
            <p
              role="status"
              className="text-sm"
              style={{ color: pattern.available ? "var(--status-academy-text)" : "var(--status-warning-text)" }}
            >
              {pattern.available
                ? `${pattern.label} · ${pattern.positionKeys.length} scale positions`
                : `${pattern.reason}. Showing All while your choice stays remembered.`}
            </p>
          </div>

          <section
            aria-label={`${keyName} ${modeLabel} scale summary`}
            className="min-w-0 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
            style={{ borderColor: "var(--status-academy-border)" }}
          >
            <span className="label-caps" style={{ color: "var(--text-secondary)" }}>Current map</span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
                {keyName} {modeLabel} · {instrument === "guitar" ? "Guitar" : "Bass"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {pattern.available ? pattern.label : "All positions"}
                {overlay ? ` · ${overlay.displayName} overlay` : ""}
              </p>
            </div>
            <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Scale notes and intervals">
              {scaleNotes.map((item) => (
                <li
                  key={`${item.note}-${item.interval}`}
                  className="rounded-full px-2 py-1"
                  style={{
                    backgroundColor: item.interval === "1" ? "var(--interactive-accent-bg)" : "var(--surface-overlay)",
                    border: `1px solid ${item.interval === "1" ? "var(--interactive-accent-border)" : "var(--border-subtle)"}`,
                    color: item.interval === "1" ? "var(--interactive-accent-text)" : "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  {item.note} <span style={{ color: "var(--text-secondary)" }}>{item.interval}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>

        <HorizontalFretboard
          instrument={instrument}
          tuning={tuning}
          handedness={handedness}
          rows={rows}
          labelMode={labelMode}
          pattern={pattern}
          decoratedPositions={decoratedPositions}
          keyName={keyName}
          modeLabel={modeLabel}
          overlayLabel={overlay?.displayName}
        />

        <aside
          aria-label="Interval color legend"
          className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
          style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}
        >
          {scaleNotes.map((item) => {
            const label = fretboardIntervalName(item.semitones, scaleType);
            return (
            <span key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fretboardIntervalColor(item.semitones) }} />
              {item.interval} · {label}
            </span>
            );
          })}
          {overlay ? (
            <>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ border: "2px solid var(--interactive-primary-bg)" }} />
                Ring = chord tone
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ border: "2px dashed var(--status-warning-text)" }} />
                Dashed = outside selected scale
              </span>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

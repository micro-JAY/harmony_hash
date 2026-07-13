import { useMemo, useState } from "react";
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
import { useLocale, useT } from "../i18n/I18nContext";
import {
  WorkspaceHeader,
  WorkspaceSegmentedControl,
  WorkspaceSelectControl,
} from "./WorkspaceChrome";

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

export default function FretboardExplorer() {
  const t = useT();
  const { locale } = useLocale();
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
  const modeLabel = t(MODE_OPTIONS.find((option) => option.value === scaleType)?.label ?? scaleType);
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
      className="hh-workspace"
      data-testid="fretboard-workspace"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby="fretboard-title"
    >
      <div className="hh-workspace__inner">
        <WorkspaceHeader
          titleId="fretboard-title"
          title="Fretboard Explorer"
          description="See a scale across the whole instrument. Roots stay gold; interval roles keep the same color wherever they repeat."
          trailing={(
            <div
              className="readout rounded-full px-3 py-1.5"
              style={{ backgroundColor: "var(--surface-overlay)", border: "1px solid var(--border-subtle)" }}
            >
              <span data-testid="fretboard-tuning-readout">
                {t(tuning.label)} · {tuning.pitchSequence} · {t("frets")} 0–15
              </span>
            </div>
          )}
        />

        <section
          aria-label={t("Fretboard controls")}
          className="hh-control-rail"
        >
          <WorkspaceSegmentedControl
            label="Instrument"
            value={instrument}
            onChange={setInstrument}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "guitar", label: "Guitar", icon: <Guitar size={14} aria-hidden="true" /> },
              { value: "bass", label: "Bass", icon: <Music2 size={14} aria-hidden="true" /> },
            ]}
          />
          <WorkspaceSelectControl
            id="fretboard-tuning"
            label="Tuning"
            value={tuningId}
            className="w-48"
            ariaLabel="Fretboard tuning"
            onChange={(nextTuningId) => {
              setTuningByInstrument((current) => ({
                ...current,
                [instrument]: nextTuningId as FretboardTuningId,
              }));
            }}
          >
            {tuningOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.label)} · {option.pitchSequence}
              </option>
            ))}
          </WorkspaceSelectControl>
          <WorkspaceSegmentedControl
            label="Handedness"
            value={handedness}
            onChange={setHandedness}
            reducedMotion={Boolean(reduceMotion)}
            options={[
              { value: "right", label: "Right-handed" },
              { value: "left", label: "Left-handed" },
            ]}
          />
          <WorkspaceSelectControl id="fretboard-root" label="Root" value={keyName} onChange={setKeyName} className="w-32" ariaLabel="Fretboard root">
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </WorkspaceSelectControl>
          <WorkspaceSelectControl
            id="fretboard-mode"
            label="Mode"
            value={scaleType}
            onChange={(value) => setScaleType(value as ScaleFormulaType)}
            className="w-44"
            ariaLabel="Fretboard mode"
          >
            {MODE_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{t(mode.label)}</option>)}
          </WorkspaceSelectControl>
          <WorkspaceSegmentedControl
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
          aria-label={t("Fretboard learning controls and current map")}
          className="hh-panel hh-panel--academy mb-5 grid min-w-0 gap-4 p-4 md:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)]"
          data-testid="fretboard-learning-layer"
        >
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-end gap-3">
              <WorkspaceSegmentedControl
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
                <WorkspaceSelectControl
                  id="fretboard-caged-form"
                  label="CAGED form"
                  value={cagedForm}
                  onChange={(value) => setCagedForm(value as CagedFormId)}
                  className="w-40"
                  ariaLabel="Fretboard caged form"
                >
                  {CAGED_FORM_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </WorkspaceSelectControl>
              ) : null}
              {patternFamily === "three-nps" ? (
                <WorkspaceSelectControl
                  id="fretboard-three-nps-position"
                  label="3NPS position"
                  value={String(threeNpsStartDegree)}
                  onChange={(value) => setThreeNpsStartDegree(Number(value) as ThreeNpsStartDegree)}
                  className="w-40"
                  ariaLabel="Fretboard 3nps position"
                >
                  {THREE_NPS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </WorkspaceSelectControl>
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
                ? `${t(pattern.label)} · ${pattern.positionKeys.length} ${t("scale positions")}`
                : locale === "ja"
                  ? "選択したパターンはこの設定では利用できないため、選択を保持したまま「すべて」を表示しています。"
                  : `${pattern.reason}. Showing All while your choice stays remembered.`}
            </p>
          </div>

          <section
            aria-label={t(`${keyName} ${modeLabel} scale summary`)}
            className="min-w-0 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
            style={{ borderColor: "var(--status-academy-border)" }}
          >
            <span className="label-caps" style={{ color: "var(--text-secondary)" }}>{t("Current map")}</span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
                {keyName} {modeLabel} · {t(instrument === "guitar" ? "Guitar" : "Bass")}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t(pattern.available ? pattern.label : "All positions")}
                {overlay ? ` · ${overlay.displayName} ${t("overlay")}` : ""}
              </p>
            </div>
            <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={t("Scale notes and intervals")}>
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
          aria-label={t("Interval color legend")}
          className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
          style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}
        >
          {scaleNotes.map((item) => {
            const label = fretboardIntervalName(item.semitones, scaleType);
            return (
            <span key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fretboardIntervalColor(item.semitones) }} />
              {item.interval} · {t(label)}
            </span>
            );
          })}
          {overlay ? (
            <>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ border: "2px solid var(--interactive-primary-bg)" }} />
                {t("Ring = chord tone")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ border: "2px dashed var(--status-warning-text)" }} />
                {t("Dashed = outside selected scale")}
              </span>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

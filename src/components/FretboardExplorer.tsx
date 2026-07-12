import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Guitar, Music2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { ALL_KEYS } from "../lib/harmonyBrain";
import type { ScaleType } from "../lib/types";
import { buildFretboardRows, type FretboardInstrument } from "../lib/theory";
import HorizontalFretboard, { type FretboardLabelMode } from "./HorizontalFretboard";

const MODE_OPTIONS: ReadonlyArray<{ value: ScaleType; label: string }> = [
  { value: "major", label: "Major" },
  { value: "natural_minor", label: "Natural Minor" },
  { value: "harmonic_minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "lydian", label: "Lydian" },
  { value: "phrygian", label: "Phrygian" },
];

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
          color: "var(--text-muted)",
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
                color: active ? "var(--interactive-accent-text)" : "var(--text-muted)",
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

function SelectControl({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="block min-w-40">
      <span
        className="mb-2 block"
        style={{
          color: "var(--text-muted)",
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
        onChange={(event) => onChange(event.target.value)}
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
  const [scaleType, setScaleType] = useState<ScaleType>("major");
  const [labelMode, setLabelMode] = useState<FretboardLabelMode>("intervals");
  const rows = useMemo(
    () => buildFretboardRows(instrument, keyName, scaleType),
    [instrument, keyName, scaleType],
  );
  const scaleNotes = useMemo(() => {
    const byDegree = new Map<number, { note: string; interval: string }>();
    for (const row of rows) {
      for (const position of row.positions) {
        if (position.degree !== null && position.intervalLabel !== null && !byDegree.has(position.degree)) {
          byDegree.set(position.degree, { note: position.noteLabel, interval: position.intervalLabel });
        }
      }
    }
    return [...byDegree.entries()]
      .sort(([degreeA], [degreeB]) => degreeA - degreeB)
      .map(([, value]) => value);
  }, [rows]);
  const modeLabel = MODE_OPTIONS.find((option) => option.value === scaleType)?.label ?? scaleType;

  return (
    <section
      className="flex-1 px-4 py-6 md:py-10"
      data-testid="fretboard-workspace"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      aria-labelledby="fretboard-title"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1
              id="fretboard-title"
              style={{ color: "var(--text-primary)", fontSize: "var(--text-2xl)" }}
            >
              Fretboard Explorer
            </h1>
            <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              See a scale across the whole instrument. Roots stay gold; interval roles keep the same color wherever they repeat.
            </p>
          </div>
          <div
            className="readout self-start rounded-full px-3 py-1.5 md:self-auto"
            style={{ backgroundColor: "var(--surface-overlay)", border: "1px solid var(--border-subtle)" }}
          >
            Standard tuning · frets 0–15
          </div>
        </div>

        <section
          aria-label="Fretboard controls"
          className="mb-6 flex flex-wrap items-end gap-4 rounded-xl p-4 md:p-5"
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
          <SelectControl id="fretboard-root" label="Root" value={keyName} onChange={setKeyName}>
            {ALL_KEYS.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
          </SelectControl>
          <SelectControl
            id="fretboard-mode"
            label="Mode"
            value={scaleType}
            onChange={(value) => setScaleType(value as ScaleType)}
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
          aria-label={`${keyName} ${modeLabel} scale summary`}
          className="mb-5 flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "var(--surface-highlight)", border: "1px solid var(--border-subtle)" }}
        >
          <div>
            <span className="label-caps">Current map</span>
            <p className="mt-1" style={{ color: "var(--text-primary)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
              {keyName} {modeLabel} · {instrument === "guitar" ? "Guitar" : "Bass"}
            </p>
          </div>
          <ol className="flex flex-wrap gap-2" aria-label="Scale notes and intervals">
            {scaleNotes.map((item) => (
              <li
                key={`${item.note}-${item.interval}`}
                className="rounded-full px-3 py-1"
                style={{
                  backgroundColor: item.interval === "1" ? "var(--interactive-accent-bg)" : "var(--surface-overlay)",
                  border: `1px solid ${item.interval === "1" ? "var(--interactive-accent-border)" : "var(--border-subtle)"}`,
                  color: item.interval === "1" ? "var(--interactive-accent-text)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {item.note} <span style={{ color: "var(--text-muted)" }}>{item.interval}</span>
              </li>
            ))}
          </ol>
        </section>

        <HorizontalFretboard instrument={instrument} rows={rows} labelMode={labelMode} />

        <aside
          aria-label="Interval color legend"
          className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
          style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}
        >
          {[
            ["var(--interactive-accent-text)", "Root"],
            ["var(--interactive-warm-text)", "Third"],
            ["var(--interactive-academy-text)", "Fifth"],
            ["var(--interactive-soft-text)", "Seventh"],
            ["var(--text-primary)", "Other scale tone"],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </aside>
      </div>
    </section>
  );
}

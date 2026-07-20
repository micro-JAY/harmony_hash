import { useT } from "../i18n/I18nContext";
import { intervalColor } from "../lib/visual/musicVisuals";

const CHORD_DEGREE_LEGEND = Object.freeze([
  { interval: 0, degree: "1", name: "Root" },
  { interval: 1, degree: "b2", name: "Flat second" },
  { interval: 2, degree: "2", name: "Major second" },
  { interval: 3, degree: "b3", name: "Minor third" },
  { interval: 4, degree: "3", name: "Major third" },
  { interval: 5, degree: "4", name: "Perfect fourth" },
  { interval: 6, degree: "#4/b5", name: "Tritone" },
  { interval: 7, degree: "5", name: "Perfect fifth" },
  { interval: 8, degree: "b6", name: "Minor sixth" },
  { interval: 9, degree: "6", name: "Major sixth" },
  { interval: 10, degree: "b7", name: "Flat seventh" },
  { interval: 11, degree: "7", name: "Major seventh" },
] as const);

export default function HasherIntervalLegend() {
  const t = useT();

  return (
    <aside
      aria-label={t("Interval color legend")}
      data-testid="hasher-interval-legend"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5"
      style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}
    >
      <span className="label-caps shrink-0" style={{ color: "var(--text-muted)" }}>
        {t("Note colors")}
      </span>
      {CHORD_DEGREE_LEGEND.map(({ interval, degree, name }) => (
        <span
          key={interval}
          aria-label={`${degree} · ${t(name)}`}
          data-note-interval={interval}
          className="inline-flex shrink-0 items-center gap-1.5"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: intervalColor(interval) }}
          />
          <span style={{ fontFamily: "var(--font-mono)" }}>{degree}</span>
        </span>
      ))}
    </aside>
  );
}

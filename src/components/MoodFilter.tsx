import { MOODS, moodDefinitionFor, type MoodId } from "../lib/theory";
import { useT } from "../i18n/I18nContext";

interface MoodFilterProps {
  value: MoodId | null;
  onChange: (moodId: MoodId | null) => void;
}

const MOOD_OPTIONS = MOODS.filter((definition) => definition.kind === "mood");
const GENRE_OPTIONS = MOODS.filter((definition) => definition.kind === "genre");

function parseMoodSelection(value: string): MoodId | null {
  if (value === "") return null;
  const definition = MOODS.find((candidate) => candidate.id === value);
  if (!definition) throw new RangeError(`Unknown mood selection: ${value}`);
  return definition.id;
}

export default function MoodFilter({ value, onChange }: MoodFilterProps) {
  const t = useT();
  const activeDefinition = value ? moodDefinitionFor(value) : null;

  return (
    <section
      aria-labelledby="mood-filter-label"
      data-testid="mood-filter"
      data-mood-id={value ?? "none"}
      className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2 ${
        activeDefinition ? "min-h-[106px] sm:min-h-[79px]" : "min-h-[55px]"
      }`}
      style={{
        backgroundColor: "var(--surface-raised)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <span id="mood-filter-label" className="label-caps" style={{ color: "var(--text-academy)" }}>
        {t("Mood lens")}
      </span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {t("Optional · rankings only")}
      </span>

      <label className="ml-auto flex min-w-0 items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        {t("Feel")}
        <select
          aria-label={t("Mood or genre lens")}
          aria-describedby="mood-filter-description"
          value={value ?? ""}
          onChange={(event) => onChange(parseMoodSelection(event.target.value))}
          className="hh-select min-w-0 max-w-full sm:min-w-40"
          style={{
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <option value="">{t("Any harmony")}</option>
          <optgroup label={t("Moods")}>
            {MOOD_OPTIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>{t(definition.label)}</option>
            ))}
          </optgroup>
          <optgroup label={t("Genres & styles")}>
            {GENRE_OPTIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>{t(definition.label)}</option>
            ))}
          </optgroup>
        </select>
      </label>
      <p
        id="mood-filter-description"
        className={activeDefinition ? "w-full text-xs" : "sr-only"}
        aria-live="polite"
        data-testid="mood-filter-description"
        style={{ color: "var(--text-secondary)" }}
      >
        {activeDefinition
          ? t(activeDefinition.description)
          : t("Use the original key, next-chord, and compatible-scale scores.")}
      </p>
    </section>
  );
}

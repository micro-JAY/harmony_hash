import { useId, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { IndexedChord } from "../lib/types";
import { useT } from "../i18n/I18nContext";
import type { ChordModifierOption } from "../lib/chordModifiers";
import {
  rankContextualChordModifiers,
  type ContextualChordModifierOption,
  type HasherModifierContext,
} from "../lib/theory/modifierScoring";
import { chordFamilyColor } from "../lib/visual/chordFamily";
import AccessibleDialog from "./AccessibleDialog";
import { matchColorForPercent } from "./musicVisuals";

interface ChordModifierProps {
  chord: IndexedChord;
  displayName: string;
  onSelect: (option: ChordModifierOption) => void;
  context?: HasherModifierContext;
  selectedIndex: number;
  timeline: ReadonlyArray<IndexedChord>;
}

export default function ChordModifier({
  chord,
  displayName,
  onSelect,
  context,
  selectedIndex,
  timeline,
}: ChordModifierProps) {
  const t = useT();
  const optionListId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(
    () => rankContextualChordModifiers({
      selectedChord: chord,
      selectedIndex,
      timeline,
      context,
      displayName,
    }),
    [chord, context, displayName, selectedIndex, timeline],
  );
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (normalizedQuery) {
      return options.all.filter((option) =>
        option.label.toLocaleLowerCase().includes(normalizedQuery),
      );
    }
    const quickLabels = new Set(options.quick.map((option) => option.label));
    return options.all.filter((option) => !quickLabels.has(option.label));
  }, [options, query]);

  function closeModifier() {
    setIsOpen(false);
    setQuery("");
  }

  function handleSelect(option: ChordModifierOption) {
    onSelect(option);
    closeModifier();
  }

  function fitReason(option: ContextualChordModifierOption): string | null {
    const fit = option.fit;
    if (!fit) return null;
    const coverage = fit.reasons.find((reason) => reason.key === "modifier.reason.scaleCoverage");
    const matching = coverage?.data.matching;
    const total = coverage?.data.total;
    const functionLabel = t(`${fit.function} function`);
    return typeof matching === "number" && typeof total === "number"
      ? `${functionLabel} · ${t(`${matching}/${total} chord tones in scale`)}`
      : functionLabel;
  }

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t(`Modify ${displayName}`)}
        onClick={() => setIsOpen(true)}
        className="flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all"
        style={{
          alignSelf: "flex-start",
          backgroundColor: isOpen
            ? "var(--interactive-accent-bg)"
            : "var(--interactive-secondary-bg)",
          border: `1px solid ${isOpen ? "var(--interactive-accent-border)" : "var(--interactive-secondary-border)"}`,
          color: isOpen
            ? "var(--interactive-accent-text)"
            : "var(--interactive-secondary-text)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        <SlidersHorizontal size={13} aria-hidden="true" />
        {t("Modify")}
      </button>

      {isOpen ? (
        <AccessibleDialog
          title={(
            <span style={{ color: chordFamilyColor(chord) }}>
              {t(`Modify ${displayName} chord`)}
            </span>
          )}
          description={t(`${options.all.length} catalog choices`)}
          closeLabel={t("Close chord modifier")}
          onRequestClose={closeModifier}
          initialFocusRef={searchRef}
          returnFocusRef={triggerRef}
          maxWidth="40rem"
          contentClassName="flex min-w-0 flex-col gap-5"
        >
          <label
            className="flex min-w-0 items-center gap-2 rounded-lg px-3"
            style={{
              minHeight: "var(--control-min-height)",
              backgroundColor: "var(--surface-overlay)",
              border: "1px solid var(--border-default)",
              color: "var(--text-muted)",
            }}
          >
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">{t(`Search ${options.rootLabel} chord alternatives`)}</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(`Search ${options.rootLabel} chords`)}
              className="min-w-0 flex-1 bg-transparent py-2.5 outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
              }}
            />
          </label>

          {options.quick.length > 0 ? (
            <section aria-labelledby={`${optionListId}-top-picks`}>
              <h3
                id={`${optionListId}-top-picks`}
                className="mb-2"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "var(--tracking-wide)",
                  textTransform: "uppercase",
                }}
              >
                {t("Top picks")}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t("Quick chord changes")}>
                {options.quick.map((option, quickIndex) => {
                  const reason = fitReason(option);
                  const fitId = `${optionListId}-fit-${quickIndex}`;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-label={t(`Change ${displayName} to ${option.label}`)}
                      aria-describedby={option.fit ? fitId : undefined}
                      onClick={() => handleSelect(option)}
                      className="rounded-lg px-3 py-2.5 text-left transition-all"
                      style={{
                        minWidth: 0,
                        backgroundColor: "var(--surface-overlay)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span className="flex min-w-0 items-baseline justify-between gap-3">
                        <strong
                          className="min-w-0 truncate"
                          style={{
                            color: chordFamilyColor(option.chord),
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          {option.label}
                        </strong>
                        {option.fit ? (
                          <strong
                            style={{
                              flexShrink: 0,
                              color: matchColorForPercent(option.fit.score),
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-sm)",
                            }}
                          >
                            {option.fit.score}%
                          </strong>
                        ) : null}
                      </span>
                      {option.fit ? (
                        <span
                          id={fitId}
                          className="mt-1 block"
                          style={{
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-body)",
                            fontSize: "var(--text-xs)",
                            lineHeight: "var(--leading-normal)",
                          }}
                        >
                          {reason}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section aria-labelledby={`${optionListId}-all`}>
            <h3
              id={`${optionListId}-all`}
              className="mb-2"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              {t(query ? "Matches" : `More ${options.rootLabel} chords`)}
            </h3>
            {visibleOptions.length > 0 ? (
              <div
                className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1"
                aria-label={t("All chord alternatives")}
              >
                {visibleOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-label={t(`Change ${displayName} to ${option.label}`)}
                    onClick={() => handleSelect(option)}
                    className="rounded-md px-2.5 py-2 transition-all"
                    style={{
                      backgroundColor: "var(--interactive-secondary-bg)",
                      border: "1px solid var(--interactive-secondary-border)",
                      color: chordFamilyColor(option.chord),
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--weight-semibold)",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <p
                role="status"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {t("No matching catalog chord.")}
              </p>
            )}
          </section>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}

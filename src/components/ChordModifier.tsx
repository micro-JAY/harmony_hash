import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { IndexedChord } from "../lib/types";
import { useT } from "../i18n/I18nContext";
import {
  type ChordModifierOption,
} from "../lib/chordModifiers";
import {
  rankContextualChordModifiers,
  type ContextualChordModifierOption,
  type HasherModifierContext,
} from "../lib/theory/modifierScoring";

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
  const panelId = useId();
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

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  function closeAndRestoreFocus() {
    setIsOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function handleTrigger() {
    if (isOpen) {
      closeAndRestoreFocus();
      return;
    }
    setIsOpen(true);
  }

  function handleSelect(option: ChordModifierOption) {
    onSelect(option);
    setIsOpen(false);
    setQuery("");
    triggerRef.current?.focus();
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
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={t(`Modify ${displayName}`)}
        onClick={handleTrigger}
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
        <div
          id={panelId}
          role="region"
          aria-label={t(`Modify ${displayName} chord`)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndRestoreFocus();
            }
          }}
          className="hh-panel mt-2 flex w-full min-w-0 flex-col gap-3 p-3"
          style={{
            backgroundColor: "var(--surface-overlay)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                {t(`Change ${options.rootLabel}`)}
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {t(`${options.all.length} catalog choices`)}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("Close chord modifier")}
              onClick={closeAndRestoreFocus}
              className="rounded-md p-1.5"
              style={{
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <label
            className="flex min-w-0 items-center gap-2 rounded-md px-2.5"
            style={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Search size={14} aria-hidden="true" />
            <span className="sr-only">{t(`Search ${options.rootLabel} chord alternatives`)}</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(`Search ${options.rootLabel} chords`)}
              className="min-w-0 flex-1 bg-transparent py-2 outline-none"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
              }}
            />
          </label>

          {options.quick.length > 0 ? (
            <div>
              <p
                className="mb-1.5"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                {t("Quick changes")}
              </p>
              <div className="flex flex-wrap gap-1.5" aria-label={t("Quick chord changes")}>
                {options.quick.map((option, quickIndex) => {
                  const reason = fitReason(option);
                  const fitId = `${panelId}-fit-${quickIndex}`;
                  return (
                  <button
                    key={option.label}
                    type="button"
                    aria-label={t(`Change ${displayName} to ${option.label}`)}
                    aria-describedby={option.fit ? fitId : undefined}
                    onClick={() => handleSelect(option)}
                    className="rounded-md px-2.5 py-1.5 transition-all"
                    style={{
                      backgroundColor: "var(--interactive-warm-bg)",
                      border: "1px solid var(--interactive-warm-border)",
                      color: "var(--interactive-warm-text)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    <span className="block">{option.label}</span>
                    {option.fit ? (
                      <span id={fitId} className="mt-0.5 block text-left" style={{ fontFamily: "var(--font-body)" }}>
                        <strong>{option.fit.score}%</strong>{reason ? ` · ${reason}` : ""}
                      </span>
                    ) : null}
                  </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <p
              className="mb-1.5"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              {t(query ? "Matches" : `More ${options.rootLabel} chords`)}
            </p>
            {visibleOptions.length > 0 ? (
              <div
                className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-1"
                aria-label={t("All chord alternatives")}
              >
                {visibleOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-label={t(`Change ${displayName} to ${option.label}`)}
                    onClick={() => handleSelect(option)}
                    className="rounded-md px-2 py-1.5 transition-all"
                    style={{
                      backgroundColor: "var(--interactive-secondary-bg)",
                      border: "1px solid var(--interactive-secondary-border)",
                      color: "var(--interactive-secondary-text)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

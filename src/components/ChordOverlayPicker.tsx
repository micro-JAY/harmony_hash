import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { lookupChord, searchChordCatalog } from "../lib/chordData";
import type { IndexedChord } from "../lib/types";
import { useLocale, useT } from "../i18n/I18nContext";

interface ChordOverlayPickerProps {
  selectedLabel?: string;
  reducedMotion: boolean;
  onSelect: (selection: { chord: IndexedChord; displayName: string }) => void;
  onClear: () => void;
}

export default function ChordOverlayPicker({
  selectedLabel,
  reducedMotion,
  onSelect,
  onClear,
}: ChordOverlayPickerProps) {
  const { locale } = useLocale();
  const t = useT();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const results = useMemo(() => searchChordCatalog(query), [query]);

  useLayoutEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    setError("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const clearAndRestoreFocus = () => {
    setOpen(false);
    setQuery("");
    setError("");
    onClear();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const commitLabel = (label: string) => {
    const chord = lookupChord(label.trim());
    if (!chord) {
      setError(locale === "ja"
        ? `「${label.trim() || "そのコード"}」はHarmony Hashの辞書にありません。`
        : `“${label.trim() || "That chord"}” is not in the Harmony Hash dictionary.`);
      return;
    }
    onSelect({ chord, displayName: label.trim() || chord.displayName });
    setQuery("");
    closeAndRestoreFocus();
  };

  return (
    <div className="hh-control-group min-w-36 flex-1" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }}>
      <span className="hh-control-label">{t("Chord overlay")}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setError("");
            setOpen((current) => !current);
          }}
          className="min-h-11 whitespace-nowrap rounded-lg px-4 text-sm"
          style={{
            backgroundColor: selectedLabel ? "var(--interactive-academy-bg)" : "var(--surface-overlay)",
            border: `1px solid ${selectedLabel ? "var(--interactive-academy-border)" : "var(--border-default)"}`,
            color: selectedLabel ? "var(--interactive-academy-text)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            transitionDuration: reducedMotion ? "0ms" : "var(--duration-fast)",
          }}
        >
          {t(selectedLabel ? `Overlay: ${selectedLabel}` : "Choose a chord")}
        </button>
        {selectedLabel ? (
          <button
            type="button"
            aria-label={t(`Clear ${selectedLabel} chord overlay`)}
            onClick={clearAndRestoreFocus}
            className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
              transitionDuration: reducedMotion ? "0ms" : "var(--duration-fast)",
            }}
          >
            <X size={14} aria-hidden="true" /> {t("Clear")}
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={panelId}
          className="mt-3 max-w-xl rounded-xl p-3"
          style={{
            backgroundColor: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <form onSubmit={(event) => {
            event.preventDefault();
            commitLabel(query);
          }}>
            <label className="block" htmlFor={`${panelId}-search`}>
              <span className="sr-only">{t("Search chord overlay")}</span>
              <span className="relative block">
                <Search
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  ref={searchRef}
                  id={`${panelId}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                    setError("");
                  }}
                  placeholder={t("Try Cmaj7, G7#9, D/F#…")}
                  className="min-h-11 w-full rounded-lg py-2 pl-9 pr-3 text-sm"
                  style={{
                    backgroundColor: "var(--surface-sunken)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </span>
            </label>
          </form>
          {error ? (
            <p role="alert" className="mt-2 text-sm" style={{ color: "var(--status-error-text)" }}>
              {error}
            </p>
          ) : null}
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {t(`${results.length} dictionary result${results.length === 1 ? "" : "s"} · Enter submits the exact text`)}
          </p>
          <ul
            aria-label={t("Chord overlay results")}
            className="mt-2 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2"
          >
            {results.map((item) => (
              <li key={item.longName}>
                <button
                  type="button"
                  onClick={() => commitLabel(item.label)}
                  className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left"
                  style={{
                    color: "var(--text-primary)",
                    border: "1px solid transparent",
                    transitionDuration: reducedMotion ? "0ms" : "var(--duration-fast)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-semibold)" }}>
                    {item.label}
                  </span>
                  <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.longName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

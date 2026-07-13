import type { Instrument, Workspace } from "../lib/types";
import { useReducedMotion } from "framer-motion";
import type { Locale } from "../i18n/translations";
import { useLocale, useT } from "../i18n/I18nContext";
import InstrumentToggle from "./InstrumentToggle";

interface HeaderProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  workspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
}

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JP" },
];

export default function Header({
  instrument,
  onInstrumentChange,
  workspace,
  onWorkspaceChange,
}: HeaderProps) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <header className="tonari-topbar flex-wrap lg:flex-nowrap">
      <div className="tonari-brand">
        <span className="tonari-brand__name">
          HARMONY <span className="tonari-brand__name--accent">HASH</span>
        </span>
        <span className="tonari-brand__org">TONARI LABS</span>
      </div>

      <nav
        aria-label="Workspace"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        className="order-3 flex w-full justify-center gap-1 rounded-full p-1 lg:order-none lg:w-auto"
        style={{ backgroundColor: "var(--surface-overlay)" }}
      >
        {(["builder", "fretboard", "circle", "scales", "network"] as const).map((item) => {
          const active = workspace === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onWorkspaceChange(item)}
              aria-pressed={active}
              className="min-w-0 flex-1 rounded-full px-1.5 text-xs transition-all sm:min-w-20 sm:flex-none sm:px-3 sm:text-sm lg:min-w-24 lg:px-4"
              style={{
                minHeight: "var(--control-min-height)",
                backgroundColor: active ? "var(--interactive-accent-bg)" : "transparent",
                color: active ? "var(--interactive-accent-text)" : "var(--text-muted)",
                border: active ? "1px solid var(--interactive-accent-border)" : "1px solid transparent",
                fontFamily: "var(--font-body)",
                fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                transitionDuration: reduceMotion ? "0ms" : "var(--duration-normal)",
              }}
            >
              {t(item)}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <div className="tonari-locale-switcher">
          {LOCALES.map((loc) => {
            const active = locale === loc.value;
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => setLocale(loc.value)}
                className={`tonari-locale-switcher__btn${active ? " tonari-locale-switcher__btn--active" : ""}`}
                aria-pressed={active}
              >
                {loc.label}
              </button>
            );
          })}
        </div>

        {workspace === "builder" && (
          <InstrumentToggle
            instrument={instrument}
            onInstrumentChange={onInstrumentChange}
          />
        )}
      </div>
    </header>
  );
}

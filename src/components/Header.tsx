import type { RefObject } from "react";
import type { Instrument, Workspace } from "../lib/types";
import { useReducedMotion } from "framer-motion";
import { CircleHelp } from "lucide-react";
import type { Locale } from "../i18n/translations";
import { useLocale, useT } from "../i18n/I18nContext";
import InstrumentToggle from "./InstrumentToggle";

interface HeaderProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
  workspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
  onOpenHelp: () => void;
  helpButtonRef: RefObject<HTMLButtonElement | null>;
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
  onOpenHelp,
  helpButtonRef,
}: HeaderProps) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const reduceMotion = useReducedMotion();
  const theoryActive = workspace === "theory"
    || workspace === "circle"
    || workspace === "scales"
    || workspace === "network";
  const destinations = [
    { workspace: "builder", label: "Hasher" },
    { workspace: "theory", label: "Tune Toolbox" },
    { workspace: "fretboard", label: "Fret Finder" },
  ] as const;

  return (
    <header className="tonari-topbar flex-wrap lg:flex-nowrap">
      <div className="tonari-brand">
        <span className="tonari-brand__name">
          HARMONY <span className="tonari-brand__name--accent">HASH</span>
        </span>
        <span className="tonari-brand__org">TONARI LABS</span>
      </div>

      <nav
        aria-label={t("Workspace")}
        data-reduced-motion={reduceMotion ? "true" : "false"}
        className="order-3 flex w-full justify-center gap-1 rounded-full p-1 lg:order-none lg:w-auto"
        style={{ backgroundColor: "var(--surface-overlay)" }}
      >
        {destinations.map((destination) => {
          const active = destination.workspace === "theory"
            ? theoryActive
            : workspace === destination.workspace;
          return (
            <button
              key={destination.workspace}
              type="button"
              onClick={() => onWorkspaceChange(destination.workspace)}
              aria-pressed={active}
              className={locale === "ja"
                ? "min-w-0 flex-1 rounded-full px-1 py-2 text-[0.625rem] leading-tight transition-all sm:min-w-20 sm:flex-none sm:whitespace-nowrap sm:px-3 sm:text-sm lg:min-w-24 lg:px-4"
                : "min-w-0 flex-1 rounded-full px-1.5 text-xs transition-all sm:min-w-20 sm:flex-none sm:px-3 sm:text-sm lg:min-w-24 lg:px-4"}
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
              {t(destination.label)}
            </button>
          );
        })}
      </nav>

      <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
        <button
          ref={helpButtonRef}
          type="button"
          onClick={onOpenHelp}
          className="hh-action"
          style={{
            minHeight: "var(--control-min-height)",
            backgroundColor: "var(--interactive-secondary-bg)",
            border: "1px solid var(--interactive-secondary-border)",
            color: "var(--interactive-secondary-text)",
          }}
        >
          <CircleHelp size={16} aria-hidden="true" />
          {t("Help / About")}
        </button>
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

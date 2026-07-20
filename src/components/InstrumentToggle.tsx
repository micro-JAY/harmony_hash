import type { Instrument } from "../lib/types";
import { useReducedMotion } from "framer-motion";
import { useT } from "../i18n/I18nContext";

interface InstrumentToggleProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
}

export default function InstrumentToggle({ instrument, onInstrumentChange }: InstrumentToggleProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="group"
      aria-label={t("Instrument")}
      className="inline-flex rounded-md p-1"
      style={{
        backgroundColor: "var(--surface-overlay)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {(["guitar", "piano"] as const).map((inst) => {
        const active = instrument === inst;
        return (
          <button
            key={inst}
            type="button"
            onClick={() => onInstrumentChange(inst)}
            aria-pressed={active}
            className="rounded-sm px-3 text-sm font-medium transition-all"
            style={{
              minHeight: "var(--control-min-height)",
              fontFamily: "var(--font-body)",
              fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
              backgroundColor: active ? "var(--interactive-primary-bg)" : "transparent",
              color: active ? "var(--interactive-primary-text)" : "var(--text-muted)",
              border: active ? "1px solid var(--interactive-primary-bg)" : "1px solid transparent",
              transitionDuration: reduceMotion ? "0ms" : "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {t(inst)}
          </button>
        );
      })}
    </div>
  );
}

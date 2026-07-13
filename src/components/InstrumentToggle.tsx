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
      className="flex rounded-full p-1"
      style={{ backgroundColor: "var(--surface-overlay)" }}
    >
      {(["guitar", "piano"] as const).map((inst) => {
        const active = instrument === inst;
        return (
          <button
            key={inst}
            type="button"
            onClick={() => onInstrumentChange(inst)}
            aria-pressed={active}
            className="rounded-full px-4 text-sm font-medium transition-all"
            style={{
              minHeight: "var(--control-min-height)",
              fontFamily: "var(--font-body)",
              fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
              backgroundColor: active ? "var(--interactive-accent-bg)" : "transparent",
              color: active ? "var(--interactive-accent-text)" : "var(--text-muted)",
              border: active ? "1px solid var(--interactive-accent-border)" : "1px solid transparent",
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

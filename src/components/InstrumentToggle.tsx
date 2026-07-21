import type { Instrument } from "../lib/types";
import { useReducedMotion } from "framer-motion";
import { Guitar, Piano } from "lucide-react";
import { useT } from "../i18n/I18nContext";

interface InstrumentToggleProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
}

export default function InstrumentToggle({ instrument, onInstrumentChange }: InstrumentToggleProps) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const options = [
    { value: "guitar", label: "Guitar", Icon: Guitar },
    { value: "piano", label: "Piano", Icon: Piano },
  ] as const;

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
      {options.map(({ value, label, Icon }) => {
        const active = instrument === value;
        const accessibleLabel = t(label);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onInstrumentChange(value)}
            aria-pressed={active}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            data-instrument-option={value}
            className="inline-flex items-center justify-center rounded-sm transition-all"
            style={{
              minHeight: "var(--control-min-height)",
              minWidth: "var(--control-min-height)",
              padding: "var(--space-2)",
              backgroundColor: active ? "var(--interactive-primary-bg)" : "transparent",
              color: active ? "var(--interactive-primary-text)" : "var(--text-muted)",
              border: active ? "1px solid var(--interactive-primary-bg)" : "1px solid transparent",
              transitionDuration: reduceMotion ? "0ms" : "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

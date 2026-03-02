import type { Instrument } from "../lib/types";

interface InstrumentToggleProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
}

export default function InstrumentToggle({ instrument, onInstrumentChange }: InstrumentToggleProps) {
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
            onClick={() => onInstrumentChange(inst)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
              backgroundColor: active ? "var(--interactive-accent-bg)" : "transparent",
              color: active ? "var(--interactive-accent-text)" : "var(--text-muted)",
              border: active ? "1px solid var(--interactive-accent-border)" : "1px solid transparent",
              transitionDuration: "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {inst === "guitar" ? "Guitar" : "Piano"}
          </button>
        );
      })}
    </div>
  );
}

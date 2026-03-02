import type { Instrument } from "../lib/types";
import InstrumentToggle from "./InstrumentToggle";

interface HeaderProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
}

export default function Header({ instrument, onInstrumentChange }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--surface-raised)",
      }}
    >
      <div className="flex items-center gap-3">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "var(--tracking-tight)",
            color: "var(--text-primary)",
          }}
        >
          Harmony
          <span style={{ color: "var(--text-accent)" }}> Hash</span>
        </h1>
        <span
          className="text-xs uppercase tracking-widest"
          style={{
            color: "var(--text-muted)",
            letterSpacing: "var(--tracking-caps)",
            fontWeight: "var(--weight-medium)",
          }}
        >
          Tonari Labs
        </span>
      </div>

      <InstrumentToggle
        instrument={instrument}
        onInstrumentChange={onInstrumentChange}
      />
    </header>
  );
}

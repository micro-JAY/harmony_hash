import type { Instrument } from "../lib/types";
import type { Locale } from "../i18n/translations";
import { useLocale } from "../i18n/I18nContext";
import InstrumentToggle from "./InstrumentToggle";

interface HeaderProps {
  instrument: Instrument;
  onInstrumentChange: (instrument: Instrument) => void;
}

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JP" },
];

export default function Header({ instrument, onInstrumentChange }: HeaderProps) {
  const { locale, setLocale } = useLocale();

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

      <div className="flex items-center gap-3">
        <div
          className="flex rounded-full p-1"
          style={{ backgroundColor: "var(--surface-overlay)" }}
        >
          {LOCALES.map((loc) => {
            const active = locale === loc.value;
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => setLocale(loc.value)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
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
                {loc.label}
              </button>
            );
          })}
        </div>

        <InstrumentToggle
          instrument={instrument}
          onInstrumentChange={onInstrumentChange}
        />
      </div>
    </header>
  );
}

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
    <header className="tonari-topbar flex-wrap sm:flex-nowrap">
      <div className="tonari-brand">
        <span className="tonari-brand__name">
          HARMONY <span className="tonari-brand__name--accent">HASH</span>
        </span>
        <span className="tonari-brand__org">TONARI LABS</span>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
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

        <InstrumentToggle
          instrument={instrument}
          onInstrumentChange={onInstrumentChange}
        />
      </div>
    </header>
  );
}

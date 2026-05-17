import { useCallback, useState, type ReactNode } from "react";
import type { Locale } from "./translations";
import { translations } from "./translations";
import { I18nContext } from "./I18nContext";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const t = useCallback(
    (key: string): string => translations[locale][key] ?? translations.en[key] ?? key,
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

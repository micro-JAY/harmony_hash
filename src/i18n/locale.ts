import type { Locale } from "./translations";

/** Select the first supported language in the browser's ordered preferences. */
export function localeFromBrowserPreferences(
  languages: readonly string[] = [],
  language = "",
): Locale {
  for (const candidate of [...languages, language]) {
    const normalized = candidate.trim().toLowerCase();
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("en")) return "en";
  }

  return "en";
}

export function detectInitialLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return localeFromBrowserPreferences(navigator.languages, navigator.language);
}

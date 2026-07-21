import { describe, expect, it } from "vitest";
import { localeFromBrowserPreferences } from "./locale";

describe("localeFromBrowserPreferences", () => {
  it("selects Japanese for a Japanese browser locale", () => {
    expect(localeFromBrowserPreferences(["ja-JP"], "ja-JP")).toBe("ja");
  });

  it("respects the first supported language in the ordered preferences", () => {
    expect(localeFromBrowserPreferences(["fr-FR", "en-US", "ja-JP"], "fr-FR")).toBe("en");
    expect(localeFromBrowserPreferences(["fr-FR", "ja-JP", "en-US"], "fr-FR")).toBe("ja");
  });

  it("falls back to English when no supported language is present", () => {
    expect(localeFromBrowserPreferences(["de-DE"], "de-DE")).toBe("en");
  });
});

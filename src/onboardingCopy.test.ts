import { describe, expect, it } from "vitest";
import { translations } from "./i18n/translations";
import {
  ONBOARDING_DESCRIPTION_KEYS,
  randomOnboardingDescription,
} from "./onboardingCopy";

describe("onboarding copy", () => {
  it("offers eight unique messages and selects only from that pool", () => {
    expect(ONBOARDING_DESCRIPTION_KEYS).toHaveLength(8);
    expect(new Set(ONBOARDING_DESCRIPTION_KEYS)).toHaveLength(8);

    ONBOARDING_DESCRIPTION_KEYS.forEach((message, index) => {
      const random = () => (index + 0.5) / ONBOARDING_DESCRIPTION_KEYS.length;
      expect(randomOnboardingDescription(random)).toBe(message);
    });
  });

  it("has explicit English and Japanese translations for every message", () => {
    for (const message of ONBOARDING_DESCRIPTION_KEYS) {
      expect(translations.en[message]).toBe(message);
      expect(translations.ja[message]).toBeTruthy();
      expect(translations.ja[message]).not.toBe(message);
    }
  });
});

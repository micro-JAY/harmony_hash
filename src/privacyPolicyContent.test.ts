import { describe, expect, it } from "vitest";
import { privacyPolicyContent } from "./privacyPolicyContent";

describe("privacy policy content", () => {
  it.each(["en", "ja"] as const)("keeps the %s policy aligned with product behavior", (locale) => {
    const copy = privacyPolicyContent[locale];
    const policy = copy.sections.map((section) => `${section.title} ${section.body}`).join(" ");

    expect(policy).toContain("Jana Jennings");
    expect(policy).not.toContain("Google Fonts");
    expect(policy).not.toContain("operator placeholder");
  });

  it("discloses the bounded, temporary browser transcript in both locales", () => {
    const englishHanz = privacyPolicyContent.en.sections[4]?.body ?? "";
    const japaneseHanz = privacyPolicyContent.ja.sections[4]?.body ?? "";

    expect(englishHanz).toContain("up to 20 recent user and Hanz messages");
    expect(englishHanz).toContain("cleared when a conversation starts or disconnects");
    expect(japaneseHanz).toContain("直近20件まで");
    expect(japaneseHanz).toContain("会話の開始時または切断時に消去");
  });
});

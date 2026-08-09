import { describe, expect, it } from "vitest";
import { privacyPolicyContent } from "./privacyPolicyContent";

describe("privacy policy content", () => {
  it.each(["en", "ja"] as const)("keeps the %s policy aligned with product behavior", (locale) => {
    const copy = privacyPolicyContent[locale];
    const policy = copy.sections.map((section) => `${section.title} ${section.body}`).join(" ");

    expect(policy).toContain("Jana Jennings");
    expect(policy).toContain("OpenAI Realtime");
    expect(policy).not.toContain("Google Fonts");
    expect(policy).not.toContain("ElevenLabs");
    expect(policy).not.toContain("zero-day");
    expect(policy).not.toContain("保存0日");
    expect(policy).not.toContain("operator placeholder");
  });

  it("discloses the bounded, temporary browser transcript in both locales", () => {
    const englishHanz = privacyPolicyContent.en.sections[4]?.body ?? "";
    const japaneseHanz = privacyPolicyContent.ja.sections[4]?.body ?? "";

    expect(englishHanz).toContain("OpenAI Realtime");
    expect(englishHanz).toContain("up to 20 recent user and Hanz messages");
    expect(englishHanz).toContain("cleared whenever a session starts or disconnects");
    expect(englishHanz).toContain("does not persist those messages or audio");
    expect(englishHanz).toContain("security, abuse monitoring, or legal compliance");
    expect(japaneseHanz).toContain("OpenAI Realtime");
    expect(japaneseHanz).toContain("直近20件まで");
    expect(japaneseHanz).toContain("セッションの開始時または切断時に消去");
    expect(japaneseHanz).toContain("ブラウザストレージまたはアプリケーションデータベースへ保存しません");
    expect(japaneseHanz).toContain("セキュリティ、不正利用監視、法令遵守");
  });
});

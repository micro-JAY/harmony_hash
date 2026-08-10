import { describe, expect, it } from "vitest";
import { privacyPolicyContent } from "./privacyPolicyContent";

describe("privacy policy content", () => {
  it.each(["en", "ja"] as const)("keeps the %s policy aligned with product behavior", (locale) => {
    const copy = privacyPolicyContent[locale];
    const policy = [
      copy.title,
      copy.effective,
      copy.intro,
      copy.contact,
      ...copy.sections.flatMap((section) => [section.title, section.body]),
    ].join(" ");

    expect(policy).toContain("Tonari Labs");
    expect(policy).toContain("Jana Jennings");
    expect(policy).toContain("privacy@tonari.ai");
    expect(policy).toContain("OpenAI Realtime");
    expect(policy).not.toContain("hello@tonari.ai");
    expect(policy).not.toMatch(/\bG-[A-Z0-9]+\b/);
    expect(policy).not.toContain("Google Fonts");
    expect(policy).not.toContain("ElevenLabs");
    expect(policy).not.toContain("zero-day");
    expect(policy).not.toContain("保存0日");
    expect(policy).not.toContain("operator placeholder");
  });

  it("keeps the shared English heading separate from localized footer actions", () => {
    expect(privacyPolicyContent.en.title).toBe("PRIVACY POLICY");
    expect(privacyPolicyContent.en.button).toBe("Privacy Policy");
    expect(privacyPolicyContent.ja.title).toBe("プライバシーポリシー");
    expect(privacyPolicyContent.ja.button).toBe("プライバシーポリシー");
    expect(privacyPolicyContent.en.effective).toContain("Last updated August 10, 2026");
    expect(privacyPolicyContent.ja.effective).toContain("最終更新日：2026年8月10日");
  });

  it("limits Cloudflare disclosure to repository-supported processing", () => {
    const englishProviders = privacyPolicyContent.en.sections[6]?.body ?? "";
    const japaneseProviders = privacyPolicyContent.ja.sections[6]?.body ?? "";

    expect(englishProviders).toContain("request logs");
    expect(englishProviders).toContain("technical observability");
    expect(englishProviders).not.toContain("web analytics");
    expect(japaneseProviders).toContain("リクエストログ");
    expect(japaneseProviders).toContain("技術的な可観測性");
    expect(japaneseProviders).not.toContain("プライバシー重視の分析");
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

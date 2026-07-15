import { describe, expect, it } from "vitest";
import { translate } from "./translations";

describe("Japanese translations", () => {
  it("translates dynamic tool labels without changing chord symbols", () => {
    expect(translate("ja", "Modify G7#9 chord")).toBe("G7#9のコードを変更");
    expect(translate("ja", "Change G7 to G7#9")).toBe("G7をG7#9に変更");
    expect(translate("ja", "Compare voicings for Cmaj7")).toBe("Cmaj7のボイシングを比較");
    expect(translate("ja", "15 dictionary results · Enter submits the exact text")).toBe(
      "辞書の候補15件・Enterで入力内容を確定",
    );
  });

  it("keeps established musical terms while localizing tool chrome", () => {
    expect(translate("ja", "Major Pentatonic")).toBe("メジャー・ペンタトニック");
    expect(translate("ja", "Perfect fifth")).toBe("完全5度");
    expect(translate("ja", "Scale learning guide")).toBe("スケール学習ガイド");
    expect(translate("ja", "Hanz Hasher")).toBe("Hanz Hasher");
    expect(translate("ja", "E Harmonic Minor")).toBe("E ハーモニック・マイナー");
    expect(translate("ja", "Raised seventh over a minor sixth")).toBe("短6度と導音（長7度）の対比");
    expect(translate("ja", "7/7 unique progression tones covered")).toBe(
      "コード進行の固有音7音中7音をカバー",
    );
  });

  it("capitalizes English tool names without changing Hanz Hasher's name", () => {
    expect(translate("en", "Hasher")).toBe("HASHER");
    expect(translate("en", "Open Improv Insight")).toBe("Open IMPROV INSIGHT");
    expect(translate("en", "Open in Scale Synthesia")).toBe("Open in SCALE SYNTHESIA");
    expect(translate("en", "Hanz Hasher")).toBe("Hanz Hasher");
    expect(translate("en", "Ask Hanz Hasher about Improv Insight")).toBe(
      "Ask Hanz Hasher about IMPROV INSIGHT",
    );
  });

  it("localizes mood-aware learning summaries", () => {
    expect(translate("ja", "Dark lens · showing 5 preferred scale families")).toBe(
      "ムード・レンズ：暗い・優先スケール系統を5種類表示",
    );
    expect(
      translate("ja", "Dark lens · showing 5 matching scales from the shared mood vocabulary."),
    ).toBe("ムード・レンズ：暗い・共通のムード分類から該当する5スケールを表示しています。");
    expect(translate("ja", "Key fit in C メジャー")).toBe("C メジャーへの適合度");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NoteNeuralNetwork from "./NoteNeuralNetwork";
import { I18nContext } from "../i18n/I18nContext";
import { I18nProvider } from "../i18n/I18nProvider";
import { translate } from "../i18n/translations";

const DEFAULT_STATE = {
  root: "E",
  familyId: "harmonic_minor",
  relationship: "relative",
  selectedScaleId: "harmonic_minor",
} as const;

describe("NoteNeuralNetwork", () => {
  it("renders the default learning graph with an accessible selection model", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <NoteNeuralNetwork
          onOpenScale={() => undefined}
          state={DEFAULT_STATE}
          onStateChange={() => undefined}
        />
      </I18nProvider>,
    );

    expect(markup).toContain('aria-label="E relationship network"');
    expect(markup).toContain('aria-label="Network nodes"');
    expect(markup).toMatch(/<ul[^>]+aria-label="Network nodes"[^>]*>.*<li[^>]*><button/s);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="Relationship strength legend"');
    expect(markup).toContain("E Harmonic Minor");
    expect(markup).toContain("1 · 2 · b3 · 4 · 5 · b6 · 7");
    expect(markup).toContain("Open in SCALE SYNTHESIA");
  });

  it("keeps Family and Relationship exploration available when embedded", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <NoteNeuralNetwork
          embedded
          onOpenScale={() => undefined}
          state={DEFAULT_STATE}
          onStateChange={() => undefined}
        />
      </I18nProvider>,
    );

    expect(markup).toContain('aria-label="NOTE NEURAL NETWORK"');
    expect(markup).not.toContain('aria-labelledby="note-network-title"');
    expect(markup).toContain('id="mode-network-family"');
    expect(markup).toContain('aria-label="Relationship"');
    expect(markup).toContain("Parallel");
    expect(markup).toContain("Relative");
  });

  it("localizes graph, semantic-node, and detail labels", () => {
    const markup = renderToStaticMarkup(
      <I18nContext.Provider value={{
        locale: "ja",
        setLocale: () => undefined,
        t: (key) => translate("ja", key),
      }}>
        <NoteNeuralNetwork
          embedded
          onOpenScale={() => undefined}
          state={{ ...DEFAULT_STATE, root: "C", familyId: "major", selectedScaleId: "major" }}
          onStateChange={() => undefined}
        />
      </I18nContext.Provider>,
    );

    expect(markup).toContain('aria-label="ノート・ニューラル・ネットワーク"');
    expect(markup).toContain('aria-label="Cの関係ネットワーク"');
    expect(markup).toContain('aria-label="ネットワークのノード"');
    expect(markup).toContain("C メジャー（アイオニアン）");
    expect(markup).toContain('aria-label="C メジャー（アイオニアン）の詳細"');
  });
});

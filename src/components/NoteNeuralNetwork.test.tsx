import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NoteNeuralNetwork from "./NoteNeuralNetwork";
import { I18nProvider } from "../i18n/I18nProvider";

describe("NoteNeuralNetwork", () => {
  it("renders the default learning graph with an accessible selection model", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <NoteNeuralNetwork
          onOpenScale={() => undefined}
          state={{
            root: "E",
            familyId: "harmonic_minor",
            relationship: "relative",
            selectedScaleId: "harmonic_minor",
          }}
          onStateChange={() => undefined}
        />
      </I18nProvider>,
    );

    expect(markup).toContain('aria-label="E Harmonic Minor relative mode relationships"');
    expect(markup).toContain('role="option"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("E Harmonic Minor");
    expect(markup).toContain("1 · 2 · b3 · 4 · 5 · b6 · 7");
    expect(markup).toContain("Open in Scale Synthesia");
  });
});

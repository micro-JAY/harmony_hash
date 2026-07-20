import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import InstrumentToggle from "./InstrumentToggle";

describe("InstrumentToggle", () => {
  it("exposes one named two-button group with 44px-capable targets", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <InstrumentToggle instrument="guitar" onInstrumentChange={() => undefined} />
      </I18nProvider>,
    );

    expect(markup).toContain('role="group" aria-label="Instrument"');
    expect(markup.match(/min-height:var\(--control-min-height\)/g)).toHaveLength(2);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("var(--interactive-primary-bg)");
    expect(markup).toContain(">Guitar</button>");
    expect(markup).toContain(">Piano</button>");
  });
});

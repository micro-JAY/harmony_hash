import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import InstrumentToggle from "./InstrumentToggle";

describe("InstrumentToggle", () => {
  it("exposes one named icon-only group with 44px-capable targets", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <InstrumentToggle instrument="guitar" onInstrumentChange={() => undefined} />
      </I18nProvider>,
    );

    expect(markup).toContain('role="group" aria-label="Instrument"');
    expect(markup.match(/min-height:var\(--control-min-height\)/g)).toHaveLength(2);
    expect(markup.match(/min-width:var\(--control-min-height\)/g)).toHaveLength(2);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Guitar"');
    expect(markup).toContain('aria-label="Piano"');
    expect(markup).toContain('data-instrument-option="guitar"');
    expect(markup).toContain('data-instrument-option="piano"');
    expect(markup).toContain("var(--interactive-primary-bg)");
    expect(markup).toContain("lucide-guitar");
    expect(markup).toContain("lucide-piano");
    expect(markup).not.toContain(">Guitar</button>");
    expect(markup).not.toContain(">Piano</button>");
  });
});

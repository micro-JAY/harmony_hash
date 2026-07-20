import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import { intervalColor } from "../lib/visual/musicVisuals";
import HasherIntervalLegend from "./HasherIntervalLegend";

describe("HasherIntervalLegend", () => {
  it("renders every chromatic degree with visible non-color labels", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <HasherIntervalLegend />
      </I18nProvider>,
    );

    expect(markup).toContain('aria-label="Interval color legend"');
    expect(markup.match(/data-note-interval=/g)).toHaveLength(12);
    for (const degree of ["1", "b2", "2", "b3", "3", "4", "#4/b5", "5", "b6", "6", "b7", "7"]) {
      expect(markup).toContain(`>${degree}</span>`);
    }
    for (let interval = 0; interval < 12; interval += 1) {
      expect(markup).toContain(`background-color:${intervalColor(interval)}`);
    }
  });
});

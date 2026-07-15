import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { translate } from "../i18n/translations";
import GuidedTour, { type GuidedTourLabels } from "./GuidedTour";
import { calculateTourLayout } from "./guidedTourLayout";

const labels: GuidedTourLabels = {
  tour: "Guided tour",
  close: "Close guided tour",
  previous: "Previous",
  next: "Next",
  finish: "Finish tour",
  step: (current, total) => `Step ${current} of ${total}`,
};

describe("GuidedTour", () => {
  it("renders an accessible, dismissible step with screen and dialog navigation", () => {
    const markup = renderToStaticMarkup(
      <GuidedTour
        open
        labels={labels}
        steps={[
          {
            id: "instrument",
            targetSelector: "[data-tour=instrument]",
            title: "Choose your instrument",
            body: "Switch between guitar and piano without rebuilding your progression.",
          },
          {
            id: "playback",
            targetSelector: "[data-tour=playback]",
            title: "Play what you build",
            body: "Use PLAY to hear the full progression.",
          },
        ]}
        onRequestClose={() => undefined}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
    expect(markup).toContain('aria-label="Close guided tour"');
    expect(markup).toContain('data-target-missing="true"');
    expect(markup).toContain("Guided tour · Step 1 of 2");
    expect(markup).toContain("Choose your instrument");
    expect(markup).toContain("Switch between guitar and piano");
    expect(markup.match(/aria-label="Previous"/g)).toHaveLength(1);
    expect(markup.match(/aria-label="Next"/g)).toHaveLength(1);
    expect(markup).toContain("hh-guided-tour__actions");
  });

  it("renders nothing while closed or when no tour steps are available", () => {
    expect(renderToStaticMarkup(
      <GuidedTour open={false} labels={labels} steps={[]} onRequestClose={() => undefined} />,
    )).toBe("");
    expect(renderToStaticMarkup(
      <GuidedTour open labels={labels} steps={[]} onRequestClose={() => undefined} />,
    )).toBe("");
  });

  it("keeps a missing target centered and clamps a visible target inside the viewport", () => {
    expect(calculateTourLayout(
      null,
      { width: 1000, height: 700 },
      { width: 360, height: 240 },
    )).toEqual({ tooltipTop: 230, tooltipLeft: 320, placement: "center" });

    const visible = calculateTourLayout(
      { top: 620, right: 990, bottom: 680, left: 900, width: 90, height: 60 },
      { width: 1000, height: 700 },
      { width: 360, height: 240 },
    );
    expect(visible.placement).toBe("top");
    expect(visible.tooltipLeft).toBe(628);
    expect(visible.tooltipTop).toBe(364);
  });

  it("ships natural Japanese labels and guidance for instrument, playback, and tool handoff", () => {
    expect(translate("ja", "Show me around")).toBe("使い方を見る");
    expect(translate("ja", "Choose your instrument")).toBe("楽器を選ぶ");
    expect(translate("ja", "Play what you build")).toBe("作った進行を聴く");
    expect(translate("ja", "Carry ideas between tools")).toBe("ツール間でアイデアをつなぐ");
  });
});

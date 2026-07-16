import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import ProgressionTimelineComposer from "./ProgressionTimelineComposer";
import {
  getComposerDropBoundary,
  getComposerDropZone,
} from "./progressionTimelineComposerGeometry";

function renderComposer(): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <ProgressionTimelineComposer
        items={[
          { id: 12, value: "Cmaj7" },
          { id: null, value: "Dm7" },
        ]}
        insertionBoundary={2}
        onInsertionBoundaryChange={vi.fn()}
        onInsert={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />
    </I18nProvider>,
  );
}

describe("ProgressionTimelineComposer", () => {
  it("renders direct-manipulation chips and one trailing chord input", () => {
    const markup = renderComposer();

    expect(markup).toContain('data-timeline-item-id="12"');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain("Cmaj7");
    expect(markup).toContain("Dm7");
    expect(markup).toContain("Add another chord");
    expect(markup).not.toContain("timeline-insertion-slot");
    expect(markup).not.toContain("Move before");
    expect(markup).not.toContain("Move after");
    expect(markup).not.toContain("Remove chord");
    expect(markup).not.toContain("composer-remove-target");
    expect(markup).not.toContain(">Clear<");
  });

  it("chooses insertion boundaries from the closest wrapped row", () => {
    const rects = [
      { index: 0, left: 0, right: 80, top: 0, bottom: 40 },
      { index: 1, left: 88, right: 168, top: 0, bottom: 40 },
      { index: 2, left: 0, right: 80, top: 48, bottom: 88 },
      { index: 3, left: 88, right: 168, top: 48, bottom: 88 },
    ];

    expect(getComposerDropBoundary(rects, 12, 12)).toBe(0);
    expect(getComposerDropBoundary(rects, 130, 12)).toBe(2);
    expect(getComposerDropBoundary(rects, 12, 70)).toBe(2);
    expect(getComposerDropBoundary(rects, 160, 70)).toBe(4);
  });

  it("uses the nearest row when the pointer is between wrapped lines", () => {
    const rects = [
      { index: 0, left: 0, right: 80, top: 0, bottom: 32 },
      { index: 1, left: 0, right: 80, top: 64, bottom: 96 },
    ];

    expect(getComposerDropBoundary(rects, 10, 38)).toBe(0);
    expect(getComposerDropBoundary(rects, 10, 58)).toBe(1);
    expect(getComposerDropBoundary([], 10, 10)).toBe(0);
  });

  it("uses logical indexes when wrapped rows have uneven chip widths", () => {
    const rects = [
      { index: 0, left: 12, right: 58, top: 8, bottom: 48 },
      { index: 1, left: 66, right: 154, top: 8, bottom: 48 },
      { index: 2, left: 12, right: 112, top: 56, bottom: 96 },
      { index: 3, left: 120, right: 174, top: 56, bottom: 96 },
      { index: 4, left: 12, right: 78, top: 104, bottom: 144 },
    ];

    expect(getComposerDropBoundary(rects, 14, 76)).toBe(2);
    expect(getComposerDropBoundary(rects, 119, 76)).toBe(3);
    expect(getComposerDropBoundary(rects, 172, 76)).toBe(4);
    expect(getComposerDropBoundary(rects, 90, 130)).toBe(5);
  });

  it("recognizes only the composer and explicit removal target as valid drops", () => {
    const composer = { left: 20, right: 320, top: 20, bottom: 80 };
    const remove = { left: 20, right: 320, top: 92, bottom: 136 };

    expect(getComposerDropZone(composer, remove, 40, 40)).toBe("composer");
    expect(getComposerDropZone(composer, remove, 40, 110)).toBe("remove");
    expect(getComposerDropZone(composer, remove, 4, 110)).toBe("invalid");
    expect(getComposerDropZone(composer, null, 40, 110)).toBe("invalid");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import AccessibleDialog from "./AccessibleDialog";
import { dialogFocusTrapTargetIndex } from "./accessibleDialogFocus";

describe("AccessibleDialog", () => {
  it("renders a named modal with a close action and bounded scroll region", () => {
    const markup = renderToStaticMarkup(
      <AccessibleDialog
        title="Top picks"
        description="Choose a dictionary-valid variation."
        closeLabel="Close Top picks"
        onRequestClose={() => undefined}
        maxWidth="36rem"
      >
        <button type="button">Cmaj7</button>
      </AccessibleDialog>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="[^"]+"/);
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
    expect(markup).toContain('aria-label="Close Top picks"');
    expect(markup).toContain('data-dialog-backdrop="true"');
    expect(markup).toContain('data-dialog-scroll-region="true"');
    expect(markup).toContain("max-height:calc(100dvh - (2 * var(--space-2)))");
    expect(markup).toContain("--dialog-max-width:36rem");
  });

  it("supports optional focus targets, footer content, and un-described dialogs", () => {
    const initialFocusRef = createRef<HTMLButtonElement>();
    const returnFocusRef = createRef<HTMLButtonElement>();
    const markup = renderToStaticMarkup(
      <AccessibleDialog
        title="Compare voicings"
        closeLabel="Close comparison"
        onRequestClose={() => undefined}
        initialFocusRef={initialFocusRef}
        returnFocusRef={returnFocusRef}
        footer={<button type="button">Done</button>}
      >
        <p>Voice movement</p>
      </AccessibleDialog>,
    );

    expect(markup).not.toContain("aria-describedby");
    expect(markup).toContain("Compare voicings");
    expect(markup).toContain("Voice movement");
    expect(markup).toContain("Done");
    expect(markup).toContain('data-reduced-motion="false"');
  });

  it("wraps focus at both boundaries and recaptures focus from outside", () => {
    expect(dialogFocusTrapTargetIndex(3, 0, true)).toBe(2);
    expect(dialogFocusTrapTargetIndex(3, 2, false)).toBe(0);
    expect(dialogFocusTrapTargetIndex(3, -1, false)).toBe(0);
    expect(dialogFocusTrapTargetIndex(3, -1, true)).toBe(2);
    expect(dialogFocusTrapTargetIndex(3, 1, false)).toBeNull();
    expect(dialogFocusTrapTargetIndex(0, -1, false)).toBeNull();
  });
});

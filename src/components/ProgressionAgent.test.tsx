import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import ProgressionAgent from "./ProgressionAgent";

function renderAgent(currentChords: readonly string[]): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <ProgressionAgent
        onResult={() => undefined}
        currentChords={currentChords}
        timelineVersion={0}
        timelineVersionRef={{ current: 0 }}
        cancellationVersion={0}
        cancellationVersionRef={{ current: 0 }}
      />
    </I18nProvider>,
  );
}

describe("ProgressionAgent actions", () => {
  it("renders distinct Modify and Re-run controls with academy styling", () => {
    const markup = renderAgent(["Cmaj7", "Am7", "Dm7", "G7"]);

    expect(markup).toContain('aria-label="Modify current progression"');
    expect(markup).toContain('aria-label="Re-run progression agent"');
    expect(markup).toContain(
      'class="flex w-full shrink-0 gap-3 sm:w-auto"',
    );
  });

  it("keeps Modify unavailable without a current timeline", () => {
    const markup = renderAgent([]);

    expect(markup).toContain('title="Add 3–8 chords to modify the current progression"');
    expect(markup).toMatch(/aria-label="Modify current progression"[^>]*disabled=""/);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import { I18nProvider } from "../i18n/I18nProvider";
import ImprovInsight from "./ImprovInsight";

function renderInsight(): string {
  const chord = lookupChord("Cmaj7");
  if (!chord) throw new Error("Cmaj7 fixture is missing from the chord dictionary");

  return renderToStaticMarkup(
    <I18nProvider>
      <ImprovInsight
        chords={[{ input: "Cmaj7", chord }]}
        moodId={null}
        expanded
      />
    </I18nProvider>,
  );
}

describe("ImprovInsight presentation", () => {
  it("uses the shared interval palette for every scale note", () => {
    const markup = renderInsight();

    expect(markup).toContain('data-note-interval="0" style="color:var(--music-interval-root)"');
    expect(markup).toContain('data-note-interval="3" style="color:var(--music-interval-minor-3)"');
    expect(markup).toContain('data-note-interval="10" style="color:var(--music-interval-flat-7)"');
  });

  it("keeps scale names on the display face and metadata values neutral", () => {
    const markup = renderInsight();

    expect(markup).toContain("font-family:var(--font-display)");
    expect(markup).toMatch(/data-insight-metadata="style"[\s\S]*?color:var\(--text-secondary\)/);
    expect(markup).not.toMatch(/data-insight-metadata="style"[\s\S]*?var\(--text-academy\)/);
  });

  it("uses the dedicated soft-pink treatment for the disclosure and panel accents", () => {
    const markup = renderInsight();

    expect(markup).toContain("var(--interactive-soft-bg)");
    expect(markup).toContain("var(--interactive-soft-border)");
    expect(markup).not.toContain("var(--interactive-academy-bg)");
    expect(markup).not.toContain("var(--interactive-academy-text)");
  });
});

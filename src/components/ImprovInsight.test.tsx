import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import { I18nProvider } from "../i18n/I18nProvider";
import { rankCompatibleScales, SCALE_SUGGESTION_CANDIDATE_COUNT } from "../lib/theory/improvInsight";
import { intervalColor } from "../lib/visual/musicVisuals";
import { fretboardIntervalColor } from "./fretboardVisuals";
import ImprovInsight, { ScaleResult } from "./ImprovInsight";

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

function renderScaleResult(label: string): string {
  const chord = lookupChord("C7");
  if (!chord) throw new Error("C7 fixture is missing from the chord dictionary");
  const suggestion = rankCompatibleScales([chord], SCALE_SUGGESTION_CANDIDATE_COUNT)
    .find((candidate) => candidate.label === label);
  if (!suggestion) throw new Error(`${label} is missing from the scale catalogue`);

  return renderToStaticMarkup(
    <I18nProvider>
      <ScaleResult suggestion={suggestion} rank={1} />
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

  it("keeps Root, Ab minor-third, tritone, and flat-seventh colors identical across music tools", () => {
    for (const interval of [0, 3, 6, 10]) {
      expect(intervalColor(interval)).toBe(fretboardIntervalColor(interval));
    }

    const majorBlues = renderScaleResult("F Major Blues");
    expect(majorBlues).toContain('data-scale-result="F Major Blues"');
    expect(majorBlues).toContain('color:var(--music-interval-root);font-family:var(--font-display)');
    expect(majorBlues).toContain(
      'data-scale-note="Ab" data-note-interval="3" style="color:var(--music-interval-minor-3)"',
    );
    expect(majorBlues).toContain('aria-label="Ab, Minor third"');

    const minorBlues = renderScaleResult("C Minor Blues");
    expect(minorBlues).toContain(
      'data-scale-note="Gb" data-note-interval="6" style="color:var(--music-interval-tritone)"',
    );
  });

  it("keeps scale names on the display face and all metadata on the pink surface", () => {
    const markup = renderInsight();

    expect(markup).toContain("font-family:var(--font-display)");
    expect(markup).toMatch(/data-insight-metadata="style" data-insight-tone="pink"[\s\S]*?background-color:var\(--music-insight-surface-bg\)[\s\S]*?color:var\(--music-insight-surface-text\)/);
    expect(markup).toMatch(/data-insight-metadata="motion" data-insight-tone="pink"[\s\S]*?var\(--music-insight-surface-bg\)/);
    expect(markup).not.toMatch(/data-insight-metadata="style"[\s\S]*?var\(--text-academy\)/);
    expect(markup).toContain('data-testid="improv-vocabulary-icon"');
    expect(markup).toContain("background-color:transparent");
  });

  it("uses only the dedicated music-insight treatment for launch and panel accents", () => {
    const markup = renderInsight();

    expect(markup).toContain("var(--music-insight-action-bg)");
    expect(markup).toContain("var(--music-insight-action-border)");
    expect(markup).toContain("var(--music-insight-surface-bg)");
    expect(markup).toContain("var(--music-insight-surface-border)");
    expect(markup).not.toContain("var(--interactive-soft-bg)");
    expect(markup).not.toContain("var(--interactive-accent-bg)");
    expect(markup).not.toContain("var(--interactive-academy-bg)");
    expect(markup).not.toContain("var(--interactive-academy-text)");
  });
});

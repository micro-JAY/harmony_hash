import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import { I18nProvider } from "../i18n/I18nProvider";
import ChordCard from "./ChordCard";

function renderChordCard({
  isPlaying = false,
  isAgentHighlighted = false,
}: {
  isPlaying?: boolean;
  isAgentHighlighted?: boolean;
} = {}): string {
  const chord = lookupChord("Cmaj7");
  if (!chord) throw new Error("Cmaj7 fixture is missing from the chord dictionary");

  return renderToStaticMarkup(
    <I18nProvider>
      <ChordCard
        chord={chord}
        instrument="guitar"
        displayName="Cmaj7"
        variant={1}
        onVariantChange={() => undefined}
        isLocked={false}
        onToggleLock={() => undefined}
        voicing={{ notes: [], voicingType: "root" }}
        pianoStyle="auto"
        onPianoStyleChange={() => undefined}
        onChordChange={() => undefined}
        isPlaying={isPlaying}
        isAgentHighlighted={isAgentHighlighted}
      />
    </I18nProvider>,
  );
}

describe("ChordCard emphasis", () => {
  it("renders Hanz focus as a distinct visible and semantic state", () => {
    const markup = renderChordCard({ isAgentHighlighted: true });

    expect(markup).toContain('data-agent-highlighted="true"');
    expect(markup).not.toContain('data-playing="true"');
    expect(markup).toContain('aria-label="Hanz is focusing on Cmaj7"');
    expect(markup).toContain("Hanz focus");
    expect(markup).toContain("var(--status-academy-border)");
    expect(markup).toContain("var(--glow-academy)");
  });

  it("keeps playback gold without showing the Hanz marker", () => {
    const markup = renderChordCard({ isPlaying: true });

    expect(markup).toContain('data-playing="true"');
    expect(markup).not.toContain('data-agent-highlighted="true"');
    expect(markup).not.toContain("Hanz focus");
    expect(markup).toContain("var(--border-accent)");
    expect(markup).toContain("var(--glow-accent)");
  });

  it("preserves both non-color cues when playback and Hanz focus overlap", () => {
    const markup = renderChordCard({ isPlaying: true, isAgentHighlighted: true });

    expect(markup).toContain('data-playing="true"');
    expect(markup).toContain('data-agent-highlighted="true"');
    expect(markup).toContain("Hanz focus");
    expect(markup).toContain("var(--glow-accent), inset 3px 0 0 var(--status-academy-text)");
  });
});

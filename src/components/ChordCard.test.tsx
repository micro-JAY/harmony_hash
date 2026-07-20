import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import { I18nProvider } from "../i18n/I18nProvider";
import ChordCard from "./ChordCard";

function renderChordCard({
  isPlaying = false,
  isAgentHighlighted = false,
  chordName = "Cmaj7",
  instrument = "guitar",
}: {
  isPlaying?: boolean;
  isAgentHighlighted?: boolean;
  chordName?: string;
  instrument?: "guitar" | "piano";
} = {}): string {
  const chord = lookupChord(chordName);
  if (!chord) throw new Error(`${chordName} fixture is missing from the chord dictionary`);

  return renderToStaticMarkup(
    <I18nProvider>
      <ChordCard
        chord={chord}
        instrument={instrument}
        displayName={chordName}
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

describe("ChordCard visual controls", () => {
  it("colors the chord title by its harmonic family", () => {
    const markup = renderChordCard({ chordName: "Dm7" });

    expect(markup).toContain("var(--music-chord-minor)");
  });

  it("keeps guitar label modes together and omits them from piano cards", () => {
    const guitarMarkup = renderChordCard();
    const pianoMarkup = renderChordCard({ instrument: "piano" });

    expect(guitarMarkup).toContain('role="group" aria-label="Guitar labels for Cmaj7"');
    expect(guitarMarkup).toContain("Fingering");
    expect(guitarMarkup).toContain("Intervals");
    expect(pianoMarkup).not.toContain('aria-label="Guitar labels for Cmaj7"');
    expect(pianoMarkup).not.toContain(">Fingering<");
    expect(pianoMarkup).not.toContain(">Intervals<");
  });

  it("uses the shared interval palette on the primary piano keyboard", () => {
    const pianoMarkup = renderChordCard({ instrument: "piano" });

    expect(pianoMarkup).toContain('data-testid="piano-keyboard"');
    expect(pianoMarkup).toContain('data-color-mode="interval"');
  });
});

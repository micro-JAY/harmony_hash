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
  showLock = true,
  pianoOctaveOffset = 0,
  auditionable = false,
}: {
  isPlaying?: boolean;
  isAgentHighlighted?: boolean;
  chordName?: string;
  instrument?: "guitar" | "piano" | "ukulele";
  showLock?: boolean;
  pianoOctaveOffset?: number;
  auditionable?: boolean;
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
        showLock={showLock}
        voicing={{ notes: [], voicingType: "root" }}
        pianoStyle="auto"
        onPianoStyleChange={() => undefined}
        pianoOctaveOffset={pianoOctaveOffset}
        onPianoOctaveShift={instrument === "piano" ? () => undefined : undefined}
        onChordChange={() => undefined}
        isPlaying={isPlaying}
        isAgentHighlighted={isAgentHighlighted}
        onAudition={auditionable ? () => undefined : undefined}
      />
    </I18nProvider>,
  );
}

describe("ChordCard emphasis", () => {
  it("renders Harmony focus as a distinct visible and semantic state", () => {
    const markup = renderChordCard({ isAgentHighlighted: true });

    expect(markup).toContain('data-agent-highlighted="true"');
    expect(markup).not.toContain('data-playing="true"');
    expect(markup).toContain('aria-label="Harmony is focusing on Cmaj7"');
    expect(markup).toContain("Harmony focus");
    expect(markup).toContain("var(--status-academy-border)");
    expect(markup).toContain("var(--glow-academy)");
  });

  it("keeps playback gold without showing the Harmony marker", () => {
    const markup = renderChordCard({ isPlaying: true });

    expect(markup).toContain('data-playing="true"');
    expect(markup).not.toContain('data-agent-highlighted="true"');
    expect(markup).not.toContain("Harmony focus");
    expect(markup).toContain("var(--border-accent)");
    expect(markup).toContain("var(--glow-accent)");
  });

  it("preserves both non-color cues when playback and Harmony focus overlap", () => {
    const markup = renderChordCard({ isPlaying: true, isAgentHighlighted: true });

    expect(markup).toContain('data-playing="true"');
    expect(markup).toContain('data-agent-highlighted="true"');
    expect(markup).toContain("Harmony focus");
    expect(markup).toContain("var(--glow-accent), inset 3px 0 0 var(--status-academy-text)");
  });
});

describe("ChordCard visual controls", () => {
  it("exposes the full card heading as a native chord-audition button when playable", () => {
    const playable = renderChordCard({ chordName: "Fm6", auditionable: true });
    const unavailable = renderChordCard({ chordName: "Fm6" });

    expect(playable).toContain('<button type="button" aria-label="Play chord: Fm6"');
    expect(playable).toContain("dark, emotional");
    expect(playable).toContain("hh-chord-card__audition");
    expect(unavailable).not.toContain('aria-label="Play chord: Fm6"');
  });

  it("renders genuine ukulele shapes and honest limitations per card", () => {
    const markup = renderChordCard({ instrument: "ukulele", chordName: "C" });
    expect(markup).toContain('data-testid="ukulele-chord-diagram"');
    expect(markup).toContain('data-frets="0-0-0-3"');
    expect(markup).not.toContain('data-testid="guitar-chord-diagram"');
    expect(markup).not.toContain('data-testid="piano-keyboard"');
    expect(markup).toContain("Next ukulele variant");
    expect(renderChordCard({ instrument: "ukulele", chordName: "C9" }))
      .toContain("Reduced voicing; omitted tones");
    const unavailable = renderChordCard({ instrument: "ukulele", chordName: "Dm7/C#" });
    expect(unavailable).toContain('data-testid="ukulele-unavailable"');
    expect(unavailable).toContain("No playable shape with this bass");
    expect(unavailable).toContain("Dm7/C#");
  });
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

  it("shows bounded per-card octave controls and shifts the rendered window", () => {
    const raised = renderChordCard({ instrument: "piano", pianoOctaveOffset: 1 });
    expect(raised).toContain('data-testid="piano-octave-control"');
    expect(raised).toContain('aria-label="Lower chord octave: Cmaj7"');
    expect(raised).toContain('aria-label="Raise chord octave: Cmaj7"');
    expect(raised).toContain('data-octave-offset="1"');

    const maximum = renderChordCard({ instrument: "piano", pianoOctaveOffset: 2 });
    expect(maximum).toMatch(/aria-label="Raise chord octave: Cmaj7"[^>]*disabled=""/);
  });

  it("can omit timeline locking for visual-only floating cards", () => {
    const markup = renderChordCard({ showLock: false });

    expect(markup).not.toContain('aria-label="Lock chord card"');
    expect(markup).not.toContain('aria-label="Unlock chord card"');
    expect(markup).toContain('data-testid="chord-card"');
  });
});

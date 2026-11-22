import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Discovery from "./Discovery";
import DiscoveryPiano from "./DiscoveryPiano";
import DiscoveryFretboard from "./DiscoveryFretboard";
import { I18nProvider } from "../i18n/I18nProvider";
import { I18nContext } from "../i18n/I18nContext";
import { translate } from "../i18n/translations";
import { lookupChord } from "../lib/chordData";
import {
  buildDiscoveryScaleMembership,
  rankDiscoveryScaleSuggestions,
  type DiscoveryProgressionChord,
} from "../lib/discovery/scaleOverlay";

function progression(...names: string[]): DiscoveryProgressionChord[] {
  return names.map((input) => {
    const chord = lookupChord(input);
    if (!chord) throw new Error(`Missing test chord ${input}`);
    return { input, chord };
  });
}

describe("Discovery workspace", () => {
  it("provides accessible note inputs and disables unavailable accompaniment", () => {
    const html = renderToStaticMarkup(<I18nProvider><Discovery /></I18nProvider>);
    expect(html).toContain('aria-label="Discovery piano"');
    expect(html).toContain('aria-label="C4"');
    expect(html).toContain('aria-label="Eb4 / D#4"');
    expect(html).toContain("Play a chord");
    expect(html).toContain("Connect MIDI");
    expect(html).toMatch(/disabled="" aria-label="Play Discovery loop"/);
    expect(html).not.toContain("Record");
  });

  it("renders independent read-only progression labels and tempo", () => {
    const html = renderToStaticMarkup(<I18nProvider><Discovery playbackRequest={{ timbre: "piano", voicings: [[60, 64, 67]], bpm: 110 }} progressionLabels={["C"]} /></I18nProvider>);
    expect(html).toContain('aria-label="HASHER progression"');
    expect(html).toContain('aria-label="Discovery loop tempo"');
    expect(html).toContain("110 BPM");
    expect(html).not.toMatch(/disabled="" aria-label="Play Discovery loop"/);
  });

  it("offers the canonical top six scales with Highlight off and stable tour targets", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <Discovery progressionChords={progression("Cmaj7", "Am7", "Dm7", "G7")} />
      </I18nProvider>,
    );

    expect(html).toContain('data-tour="discovery-input"');
    expect(html).toContain('data-tour="discovery-results"');
    expect(html).toContain('data-tour="discovery-improv"');
    expect(html).toContain('data-tour="discovery-loop"');
    expect(html).toContain('data-scale-selected="C Major" data-highlight="false"');
    expect(html).toContain('aria-pressed="false"');
    expect((html.match(/<option/g) ?? [])).toHaveLength(6);
    expect(html).not.toContain('data-scale-tone="true"');
  });

  it("renders an honest disabled recommendation state without a progression", () => {
    const html = renderToStaticMarkup(<I18nProvider><Discovery /></I18nProvider>);
    expect(html).toContain("Build a progression in HASHER to see scale recommendations.");
    expect(html).toMatch(/id="discovery-recommended-scale"[^>]*disabled=""/);
    expect(html).toMatch(/discovery-improv__toggle[^>]*aria-pressed="false"[^>]*disabled=""/);
  });

  it("shows keyboard and MIDI held pitches and keeps fretboard entry independently accessible", () => {
    const piano = renderToStaticMarkup(<I18nProvider><DiscoveryPiano selectedNotes={new Set([60])} heldNotes={new Set([63])} octave={3} keyboardEnabled onToggle={() => undefined} /></I18nProvider>);
    expect(piano).toContain('aria-label="Eb4 / D#4" aria-pressed="true" data-midi="63" data-held="true"');
    const guitar = renderToStaticMarkup(<I18nProvider><DiscoveryFretboard frets={{ 5: 3 }} heldNotes={new Set()} onToggle={() => undefined} /></I18nProvider>);
    expect(guitar).toContain('aria-label="String 5, Fret 3, C3" aria-pressed="true"');
    expect((guitar.match(/aria-pressed="true"/g) ?? [])).toHaveLength(1);
  });

  it("keeps white-key octave labels together and separates shortcut rows", () => {
    const piano = renderToStaticMarkup(<I18nProvider><DiscoveryPiano selectedNotes={new Set()} heldNotes={new Set()} octave={2} keyboardEnabled onToggle={() => undefined} /></I18nProvider>);
    expect(piano).toContain('<span class="discovery-key__note">C2</span>');
    expect(piano).toContain('<span class="discovery-key__note">D2</span>');
    expect(piano).toContain('<kbd class="discovery-key__shortcut">W</kbd>');
    expect(piano).not.toContain('class="discovery-key__octave"');
  });

  it("marks every repeated piano scale pitch while retaining selected and held semantics", () => {
    const selectedScale = rankDiscoveryScaleSuggestions(progression("Cmaj7", "Am7", "Dm7", "G7"))[0];
    const membership = buildDiscoveryScaleMembership(selectedScale);
    const piano = renderToStaticMarkup(
      <I18nProvider>
        <DiscoveryPiano
          selectedNotes={new Set([60])}
          heldNotes={new Set([62])}
          octave={3}
          keyboardEnabled
          scaleMembership={membership}
          onToggle={() => undefined}
        />
      </I18nProvider>,
    );

    expect(piano).toContain('data-scale-overlay="C Major"');
    expect((piano.match(/data-scale-root="true"/g) ?? [])).toHaveLength(4);
    expect(piano).toMatch(/aria-label="C4, Scale root: C Major" aria-pressed="true"[^>]*data-scale-tone="true" data-scale-root="true"/);
    expect(piano).toMatch(/aria-label="D4, Scale tone: C Major" aria-pressed="true"[^>]*data-held="true"[^>]*data-scale-tone="true"/);
    expect(piano).not.toMatch(/aria-label="Eb4 \/ D#4"[^>]*data-scale-tone/);
  });

  it("uses the same scale membership and root semantics across the guitar", () => {
    const selectedScale = rankDiscoveryScaleSuggestions(progression("Bbmaj7", "Ebmaj7", "F7"))[0];
    const membership = buildDiscoveryScaleMembership(selectedScale);
    const guitar = renderToStaticMarkup(
      <I18nProvider>
        <DiscoveryFretboard
          frets={{ 5: 1 }}
          heldNotes={new Set()}
          scaleMembership={membership}
          onToggle={() => undefined}
        />
      </I18nProvider>,
    );

    expect(guitar).toContain('aria-label="Discovery guitar fretboard scroller"');
    expect(guitar).toContain('data-scale-overlay="Bb Major"');
    expect(guitar).toMatch(/aria-label="String 5, Fret 1, Bb2 \/ A#2, Scale root: Bb Major" aria-pressed="true"[^>]*data-note="Bb" data-scale-tone="true" data-scale-root="true"/);
    expect(guitar).toContain('data-string="6"');
    expect(guitar).toContain('data-string="1"');
  });

  it("localizes the workspace and chord qualities without changing chord notation", () => {
    const html = renderToStaticMarkup(<I18nContext.Provider value={{ locale: "ja", setLocale: () => undefined, t: (key) => translate("ja", key) }}><Discovery /></I18nContext.Provider>);
    expect(html).toContain("ディスカバリー");
    expect(html).toContain("MIDIを接続");
    expect(html).toContain("コードを弾いてみよう");
    expect(translate("ja", "Minor seventh")).toBe("短7度");
    expect(translate("ja", "discovery.quality.Minor seventh")).toBe("マイナー7th");
    expect(translate("ja", "Cmin7/Bb")).toBe("Cmin7/Bb");
  });
});

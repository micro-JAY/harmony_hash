import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Discovery from "./Discovery";
import DiscoveryPiano from "./DiscoveryPiano";
import DiscoveryFretboard from "./DiscoveryFretboard";
import { I18nProvider } from "../i18n/I18nProvider";
import { I18nContext } from "../i18n/I18nContext";
import { translate } from "../i18n/translations";

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

  it("shows keyboard and MIDI held pitches and keeps fretboard entry independently accessible", () => {
    const piano = renderToStaticMarkup(<I18nProvider><DiscoveryPiano selectedNotes={new Set([60])} heldNotes={new Set([63])} octave={3} keyboardEnabled onToggle={() => undefined} /></I18nProvider>);
    expect(piano).toContain('aria-label="Eb4 / D#4" aria-pressed="true" data-midi="63" data-held="true"');
    const guitar = renderToStaticMarkup(<I18nProvider><DiscoveryFretboard frets={{ 5: 3 }} heldNotes={new Set()} onToggle={() => undefined} /></I18nProvider>);
    expect(guitar).toContain('aria-label="String 5, Fret 3, C3" aria-pressed="true"');
    expect((guitar.match(/aria-pressed="true"/g) ?? [])).toHaveLength(1);
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

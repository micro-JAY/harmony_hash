import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import type { VoicedNote } from "../lib/types";
import PianoKeyboard from "./PianoKeyboard";

const NOTES: VoicedNote[] = [
  { name: "C", pitchClass: 0, octave: 4, midi: 60, hand: "right" },
  { name: "E", pitchClass: 4, octave: 4, midi: 64, hand: "right" },
  { name: "G", pitchClass: 7, octave: 4, midi: 67, hand: "right" },
];

describe("PianoKeyboard note education", () => {
  it("makes only active keys focusable with note, degree, and role labels", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <PianoKeyboard
          voicedNotes={NOTES}
          displayMode="notes"
          preferFlats={false}
          rootNote="C"
          colorMode="interval"
        />
      </I18nProvider>,
    );

    expect(markup.match(/data-note-tooltip="true"/g)).toHaveLength(3);
    expect(markup.match(/tabindex="0"/g)).toHaveLength(3);
    expect(markup).toContain('aria-label="C4 · 1 · Root"');
    expect(markup).toContain('aria-label="E4 · 3 · Major third"');
    expect(markup).toContain('aria-label="G4 · 5 · Perfect fifth"');
  });
});

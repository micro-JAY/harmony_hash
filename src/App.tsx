import { useState, useCallback } from "react";
import type { Instrument, IndexedChord, ParseError } from "./lib/types";
import Header from "./components/Header";
import ProgressionInput from "./components/ProgressionInput";
import ChordCard from "./components/ChordCard";

interface DisplayChord {
  input: string;
  chord: IndexedChord;
}

function App() {
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [chords, setChords] = useState<DisplayChord[]>([]);
  const [randomVariants, setRandomVariants] = useState<Record<number, number>>({});

  const handleResult = useCallback(
    (resolved: DisplayChord[], _errors: ParseError[]) => {
      setChords(resolved);
      setRandomVariants({});
    },
    []
  );

  function randomizeAll() {
    const variants: Record<number, number> = {};
    chords.forEach((c, i) => {
      const max = c.chord.variationCount;
      if (max > 1) {
        variants[i] = Math.floor(Math.random() * max) + 1;
      }
    });
    setRandomVariants(variants);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header instrument={instrument} onInstrumentChange={setInstrument} />

      <main className="flex-1 flex flex-col gap-8 py-8">
        {/* Input Section */}
        <ProgressionInput onResult={handleResult} />

        {/* Action Bar */}
        {chords.length > 0 && instrument === "guitar" && (
          <div className="flex justify-center">
            <button
              onClick={randomizeAll}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "var(--interactive-warm-bg)",
                color: "var(--interactive-warm-text)",
                border: "1px solid var(--interactive-warm-border)",
                fontWeight: "var(--weight-medium)",
                transitionDuration: "var(--duration-normal)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-warm-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-warm-bg)";
              }}
            >
              Randomize All Variants
            </button>
          </div>
        )}

        {/* Chord Cards */}
        {chords.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-4">
              {chords.map((c, i) => (
                <ChordCard
                  key={`${c.input}-${i}`}
                  chord={c.chord}
                  instrument={instrument}
                  displayName={c.input}
                  variantOverride={randomVariants[i]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {chords.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p
              className="text-center max-w-md"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}
            >
              Type a chord progression above or pick a preset to get started.
              <br />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                Try: Cmaj7 Am9 Dm7 G7
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

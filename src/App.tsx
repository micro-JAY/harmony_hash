import { useCallback, useState } from "react";
import type { Instrument, IndexedChord, ParseError } from "./lib/types";
import Header from "./components/Header";
import ProgressionInput from "./components/ProgressionInput";
import ChordCard from "./components/ChordCard";

interface DisplayChord {
  input: string;
  chord: IndexedChord;
}

function clampVariant(variant: number, maxVariants: number): number {
  if (!Number.isFinite(variant)) return 1;
  if (maxVariants <= 1) return 1;
  if (variant < 1) return 1;
  if (variant > maxVariants) return maxVariants;
  return Math.floor(variant);
}

function App() {
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [chords, setChords] = useState<DisplayChord[]>([]);
  const [cardVariants, setCardVariants] = useState<Record<number, number>>({});
  const [lockedCards, setLockedCards] = useState<Set<number>>(new Set());

  const handleResult = useCallback((resolved: DisplayChord[], _errors: ParseError[]) => {
    setChords(resolved);
    setCardVariants({});
    setLockedCards(new Set());
  }, []);

  function getVariantForCard(index: number, maxVariants: number): number {
    return clampVariant(cardVariants[index] ?? 1, maxVariants);
  }

  function handleCardVariantChange(index: number, nextVariant: number, maxVariants: number) {
    setCardVariants((prev) => ({
      ...prev,
      [index]: clampVariant(nextVariant, maxVariants),
    }));
  }

  function handleToggleLock(index: number) {
    setLockedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function randomizeAll() {
    setCardVariants((prev) => {
      const next = { ...prev };
      chords.forEach((chordResult, index) => {
        const maxVariants = chordResult.chord.variationCount;
        if (lockedCards.has(index)) {
          next[index] = clampVariant(prev[index] ?? 1, maxVariants);
          return;
        }
        next[index] = maxVariants > 1 ? Math.floor(Math.random() * maxVariants) + 1 : 1;
      });
      return next;
    });
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
              {chords.map((chordResult, index) => {
                const maxVariants = chordResult.chord.variationCount;
                return (
                  <ChordCard
                    key={`${chordResult.input}-${index}`}
                    chord={chordResult.chord}
                    instrument={instrument}
                    displayName={chordResult.input}
                    variant={getVariantForCard(index, maxVariants)}
                    onVariantChange={(nextVariant) =>
                      handleCardVariantChange(index, nextVariant, maxVariants)
                    }
                    isLocked={lockedCards.has(index)}
                    onToggleLock={() => handleToggleLock(index)}
                  />
                );
              })}
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

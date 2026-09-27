import { useEffect, useMemo, useState } from "react";
import { Guitar, Keyboard, Minus, Play, Plus, Square, Usb, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useT } from "../i18n/I18nContext";
import { discoveryKeyLabel, discoveryNoteName, identifyChords, normalizeDiscoveryNotes } from "../lib/discovery/chordIdentification";
import { createDiscoveryLoop, scheduleDiscoveryLoop } from "../lib/discovery/discoveryAudio";
import type { DiscoveryLoopState, DiscoveryPlaybackRequest } from "../lib/discovery/discoveryAudio";
import { WorkspaceHeader, WorkspaceSegmentedControl } from "./WorkspaceChrome";
import DiscoveryPiano from "./DiscoveryPiano";
import DiscoveryFretboard, { DISCOVERY_GUITAR_STRINGS } from "./DiscoveryFretboard";
import { useDiscoveryInput } from "./useDiscoveryInput";
import "./Discovery.css";

export interface DiscoveryProps {
  readonly active?: boolean;
  readonly playbackRequest?: DiscoveryPlaybackRequest | null;
  readonly progressionLabels?: readonly string[];
  readonly onBeforeLoopStart?: () => void;
}

const EMPTY_LABELS: readonly string[] = [];
const INSTRUMENTS = [
  { value: "piano", label: "Piano", icon: <Keyboard size={15} /> },
  { value: "guitar", label: "Fretboard", icon: <Guitar size={15} /> },
] as const;

export default function Discovery({ active = true, playbackRequest = null, progressionLabels = EMPTY_LABELS, onBeforeLoopStart }: DiscoveryProps) {
  const t = useT();
  const reducedMotion = Boolean(useReducedMotion());
  const [instrument, setInstrument] = useState<"piano" | "guitar">("piano");
  const [pianoNotes, setPianoNotes] = useState<readonly number[]>([]);
  const [frets, setFrets] = useState<Readonly<Record<number, number>>>({});
  const [bpm, setBpm] = useState(playbackRequest?.bpm ?? 110);
  const [loopState, setLoopState] = useState<DiscoveryLoopState>({ phase: "idle", chordIndex: null });
  const [loopError, setLoopError] = useState(false);
  const live = useDiscoveryInput(active);
  const [loop] = useState(() => createDiscoveryLoop({
    createContext: () => typeof AudioContext === "undefined" ? null : new AudioContext(),
    schedule: scheduleDiscoveryLoop,
    onState: setLoopState,
    onError: (error) => {
      console.error("Discovery accompaniment failed", error);
      setLoopError(true);
    },
  }));

  const playbackKey = JSON.stringify(playbackRequest);
  useEffect(() => {
    loop.stop();
    return () => loop.stop();
  }, [active, playbackKey, loop]);
  useEffect(() => () => loop.dispose(), [loop]);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) loop.stop(); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, [loop]);

  const latchedNotes = useMemo(() => instrument === "piano" ? pianoNotes
    : DISCOVERY_GUITAR_STRINGS.flatMap((string) => frets[string.number] === undefined
      ? [] : [string.absoluteOpenPitch + frets[string.number]]), [instrument, pianoNotes, frets]);
  const notes = useMemo(() => normalizeDiscoveryNotes([...latchedNotes, ...live.heldNotes]), [latchedNotes, live.heldNotes]);
  const matches = useMemo(() => identifyChords(notes), [notes]);
  const primary = matches[0];
  const selected = new Set(latchedNotes);
  const held = new Set(live.heldNotes);
  const hasProgression = Boolean(playbackRequest?.voicings.some((voicing) => voicing.length > 0));
  const looping = loopState.phase !== "idle";
  const midiConnected = live.midiState.status === "connected" || live.midiState.status === "empty";
  const pitchCount = new Set(notes.map((midi) => midi % 12)).size;

  function startLoop(nextBpm: number) {
    if (!active || !hasProgression || !playbackRequest) return;
    setLoopError(false);
    onBeforeLoopStart?.();
    void loop.start({ ...playbackRequest, bpm: nextBpm });
  }

  function togglePiano(midi: number) {
    if (!selected.has(midi)) live.preview(midi);
    setPianoNotes((current) => current.includes(midi) ? current.filter((note) => note !== midi) : [...current, midi]);
  }

  function toggleFret(stringNumber: number, fret: number) {
    const string = DISCOVERY_GUITAR_STRINGS.find((candidate) => candidate.number === stringNumber);
    if (frets[stringNumber] !== fret && string) live.preview(string.absoluteOpenPitch + fret);
    setFrets((current) => {
      const next = { ...current };
      if (next[stringNumber] === fret) delete next[stringNumber];
      else next[stringNumber] = fret;
      return next;
    });
  }

  const midiMessage = live.midiState.status === "unsupported" ? "MIDI is not supported in this browser. Try Chrome or Edge."
    : live.midiState.status === "denied" ? "MIDI permission was denied. Allow MIDI access in your browser and try again."
      : live.midiState.status === "error" ? "MIDI could not connect. Check your device and try again."
        : live.midiState.status === "empty" ? "MIDI is ready. Connect a keyboard to begin."
          : live.midiState.status === "connected" ? "MIDI connected" : "";

  return (
    <section className="discovery-workspace mx-auto w-full max-w-6xl px-4" aria-labelledby="discovery-title" data-testid="discovery" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <WorkspaceHeader titleId="discovery-title" title="Discovery" description="Find the name inside the notes. Choose a few, or play them live." />

      <div className="discovery-controls">
        <WorkspaceSegmentedControl label="Discovery instrument" value={instrument} options={INSTRUMENTS} onChange={setInstrument} reducedMotion={reducedMotion} />
        <div className="discovery-input-actions">
          <button className="discovery-action" type="button" aria-pressed={live.keyboardEnabled} onClick={live.toggleKeyboard}>
            <Keyboard size={16} />{t("Computer keys")}
          </button>
          <button className="discovery-action" type="button" disabled={live.midiState.status === "connecting"} onClick={midiConnected ? live.disconnectMidi : live.connectMidi}>
            <Usb size={16} />{t(live.midiState.status === "connecting" ? "Connecting MIDI…" : midiConnected ? "Disconnect MIDI" : "Connect MIDI")}
          </button>
          <button className="discovery-action" type="button" disabled={notes.length === 0} onClick={() => { setPianoNotes([]); setFrets({}); live.silence(); }}>
            <X size={16} />{t("Clear notes")}
          </button>
        </div>
      </div>

      {live.keyboardEnabled ? (
        <div className="discovery-keyboard-help">
          <p>{t("White keys: A S D F G H J K L · Black keys: W E T Y U O")}</p>
          <div className="discovery-octave">
            <button className="discovery-icon-action" type="button" aria-label={t("Lower keyboard octave")} disabled={live.octave <= 1} onClick={() => live.shiftOctave(-1)}><Minus size={15} /></button>
            <span>{t("Octave")} {live.octave} <small>· Z / X</small></span>
            <button className="discovery-icon-action" type="button" aria-label={t("Raise keyboard octave")} disabled={live.octave >= 6} onClick={() => live.shiftOctave(1)}><Plus size={15} /></button>
          </div>
        </div>
      ) : null}
      {midiMessage ? <p className="discovery-status" role="status">{t(midiMessage)}{live.midiState.deviceNames.length > 0 ? ` · ${live.midiState.deviceNames.join(", ")}` : ""}</p> : null}
      {live.audioError || loopError ? <p className="discovery-error" role="alert">{t("Audio could not start. Check your browser audio permissions and try again.")}</p> : null}

      <div className="discovery-hud" aria-live="polite" aria-atomic="true" data-testid="discovery-hud">
        <div className="discovery-hud__main">
          <span className="hh-control-label">{t(primary ? "Chord discovered" : "Your notes")}</span>
          <h2 data-testid="discovery-chord-name">{primary?.symbol ?? (pitchCount === 1 ? discoveryNoteName(notes[0]) : notes.length > 0 ? t("Keep exploring") : t("Play a chord"))}</h2>
          <p>{primary ? t(`discovery.quality.${primary.quality}`) : t(notes.length === 0 ? "Click notes to hold them. Click again to release." : pitchCount === 1 ? "Add another note to start finding harmony." : "No common exact match. Try adding or removing a note.")}</p>
        </div>
        <div className="discovery-hud__detail">
          {notes.length > 0 ? <p className="discovery-bass"><span>{t("Lowest note")}</span><strong>{discoveryNoteName(notes[0], true)}</strong>{primary ? <span>{t(primary.kind === "slash" ? "Separate bass" : primary.inversion === 0 ? "Root position" : "Inversion")}</span> : null}</p> : null}
          {matches.length > 1 ? <div className="discovery-alternatives"><span className="hh-control-label">{t("Also heard as")}</span><div>{matches.slice(1).map((match) => <span className="discovery-alternative" key={match.symbol}>{match.symbol}</span>)}</div></div> : null}
        </div>
      </div>

      <div className="discovery-note-strip" aria-label={t("Selected notes")}>
        {notes.length > 0 ? notes.map((midi) => <span className="discovery-note-chip" data-held={held.has(midi) ? "true" : "false"} key={midi}>{discoveryKeyLabel(midi)}</span>) : <span className="discovery-note-hint">{t("Your selected notes appear here.")}</span>}
      </div>

      {instrument === "piano"
        ? <DiscoveryPiano selectedNotes={selected} heldNotes={held} octave={live.octave} keyboardEnabled={live.keyboardEnabled} onToggle={togglePiano} />
        : <DiscoveryFretboard frets={frets} heldNotes={held} onToggle={toggleFret} />}
      <p className="discovery-caption">{t(instrument === "piano" ? "Three octaves · Scroll sideways to explore the full keyboard." : "Standard guitar tuning · One selected fret per string · Click a selected fret to mute it.")}</p>

      <section className="discovery-accompaniment" aria-labelledby="discovery-loop-title">
        <div className="discovery-loop-heading"><div><h2 id="discovery-loop-title">{t("Play over your progression")}</h2><p>{t(hasProgression ? "Your Hasher chords, on repeat. Play along and explore." : "Build a progression in HASHER to enable your practice loop.")}</p></div>
          <button type="button" className="discovery-action" disabled={!hasProgression} onClick={() => looping ? loop.stop() : startLoop(bpm)} aria-label={t(looping ? "Stop Discovery loop" : "Play Discovery loop")}>
            {looping ? <Square size={16} /> : <Play size={16} />}{t(loopState.phase === "starting" ? "Starting…" : looping ? "Stop loop" : "Loop progression")}
          </button>
        </div>
        {hasProgression ? <>
          <div className="discovery-loop-timeline" aria-label={t("Hasher progression")}>
            {progressionLabels.map((label, index) => <span key={`${index}-${label}`} aria-current={loopState.chordIndex === index ? "step" : undefined}>{label}</span>)}
          </div>
          <label className="discovery-tempo"><span>{t("Tempo")}</span><input type="range" min={40} max={200} step={1} value={bpm} aria-label={t("Discovery loop tempo")} onChange={(event) => {
            const next = Number(event.currentTarget.value);
            setBpm(next);
            if (looping) startLoop(next);
          }} /><output>{bpm} BPM</output></label>
        </> : null}
      </section>
    </section>
  );
}

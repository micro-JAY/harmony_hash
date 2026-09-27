import { useEffect, useState } from "react";
import { createDiscoverySynth } from "../lib/discovery/discoveryAudio";
import {
  computerKeyMidi, createDiscoveryMidiConnection, createHeldNoteInput, isEditableNoteTarget,
} from "../lib/discovery/noteInput";
import type { MidiConnectionState } from "../lib/discovery/noteInput";

export function useDiscoveryInput(active: boolean) {
  const [heldNotes, setHeldNotes] = useState<readonly number[]>([]);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [octave, setOctave] = useState(3);
  const [audioError, setAudioError] = useState(false);
  const [midiState, setMidiState] = useState<MidiConnectionState>({ status: "idle", deviceNames: [] });
  const [synth] = useState(() => createDiscoverySynth((error) => {
    console.error("Discovery note audio failed", error);
    setAudioError(true);
  }));
  const [input] = useState(() => createHeldNoteInput({
    onChange: setHeldNotes,
    onNoteOn: (midi, velocity) => synth.press(`live:${midi}`, midi, velocity),
    onNoteOff: (midi) => synth.release(`live:${midi}`),
  }));
  const [midi] = useState(() => createDiscoveryMidiConnection({
    requestAccess: () => typeof navigator.requestMIDIAccess === "function"
      ? navigator.requestMIDIAccess({ sysex: false }) : null,
    canReceive: () => !document.hidden && document.hasFocus(),
    input,
    onState: setMidiState,
    onError: (error) => console.warn("Discovery MIDI connection failed", error),
  }));

  useEffect(() => {
    if (!active) return;
    const silence = () => {
      input.clear();
      midi.silence();
      synth.silence();
    };
    const onVisibility = () => { if (document.hidden) silence(); };
    window.addEventListener("blur", silence);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", silence);
      document.removeEventListener("visibilitychange", onVisibility);
      input.clear();
      midi.disconnect();
      synth.dispose();
    };
  }, [active, input, midi, synth]);

  useEffect(() => {
    if (!active || !keyboardEnabled) return;
    const down = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey
        || isEditableNoteTarget(event.target) || document.hidden) return;
      if (event.code === "KeyZ" || event.code === "KeyX") {
        event.preventDefault();
        input.releasePrefix("keyboard:");
        setOctave((current) => Math.min(6, Math.max(1, current + (event.code === "KeyZ" ? -1 : 1))));
        return;
      }
      const note = computerKeyMidi(event.code, octave);
      if (note === null) return;
      event.preventDefault();
      input.press(`keyboard:${event.code}`, note);
    };
    const up = (event: KeyboardEvent) => input.release(`keyboard:${event.code}`);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      input.releasePrefix("keyboard:");
    };
  }, [active, keyboardEnabled, octave, input]);

  return {
    heldNotes, keyboardEnabled, octave, audioError, midiState,
    preview(midiNote: number) { setAudioError(false); synth.preview(midiNote); },
    toggleKeyboard() {
      setAudioError(false);
      if (!keyboardEnabled) void synth.prepare();
      setKeyboardEnabled((enabled) => !enabled);
    },
    shiftOctave(direction: -1 | 1) {
      input.releasePrefix("keyboard:");
      setOctave((current) => Math.min(6, Math.max(1, current + direction)));
    },
    connectMidi() {
      setAudioError(false);
      void synth.prepare();
      void midi.connect();
    },
    disconnectMidi: midi.disconnect,
    silence() { input.clear(); midi.silence(); synth.silence(); },
  };
}

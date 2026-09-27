export const COMPUTER_NOTE_KEYS: Readonly<Record<string, number>> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6,
  KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14,
};

export function computerKeyMidi(code: string, octave: number): number | null {
  const offset = COMPUTER_NOTE_KEYS[code];
  return offset === undefined ? null : (octave + 1) * 12 + offset;
}

export function isEditableNoteTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]') !== null;
}

export interface HeldNoteInput {
  press(source: string, midi: number, velocity?: number, rearticulate?: boolean): void;
  release(source: string): void;
  releasePrefix(prefix: string): void;
  clear(): void;
  notes(): readonly number[];
}

export function createHeldNoteInput(callbacks: {
  onChange(notes: readonly number[]): void;
  onNoteOn(midi: number, velocity: number): void;
  onNoteOff(midi: number): void;
}): HeldNoteInput {
  const sources = new Map<string, number>();
  const notes = () => [...new Set(sources.values())].sort((a, b) => a - b);
  const release = (source: string) => {
    const midi = sources.get(source);
    if (midi === undefined) return;
    sources.delete(source);
    if (![...sources.values()].includes(midi)) callbacks.onNoteOff(midi);
    callbacks.onChange(notes());
  };
  return {
    notes,
    press(source, midi, velocity = 0.7, rearticulate = false) {
      if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
        throw new RangeError("Live input must contain valid MIDI notes");
      }
      if (sources.get(source) === midi) {
        if (rearticulate) {
          callbacks.onNoteOff(midi);
          callbacks.onNoteOn(midi, velocity);
        }
        return;
      }
      if (sources.has(source)) release(source);
      const alreadyHeld = [...sources.values()].includes(midi);
      sources.set(source, midi);
      if (alreadyHeld && rearticulate) callbacks.onNoteOff(midi);
      if (!alreadyHeld || rearticulate) callbacks.onNoteOn(midi, velocity);
      callbacks.onChange(notes());
    },
    release,
    releasePrefix(prefix) {
      for (const source of sources.keys()) if (source.startsWith(prefix)) release(source);
    },
    clear() {
      const previous = notes();
      sources.clear();
      previous.forEach(callbacks.onNoteOff);
      if (previous.length > 0) callbacks.onChange([]);
    },
  };
}

export interface MidiNoteSession {
  receive(data: ArrayLike<number>): void;
  clear(): void;
}

export function createMidiNoteSession(deviceId: string, input: HeldNoteInput): MidiNoteSession {
  const prefix = `midi:${deviceId}:`;
  const pressed = new Set<string>();
  const sustained = new Map<string, number>();
  const pedal = new Set<number>();
  const clear = () => {
    pressed.clear();
    sustained.clear();
    pedal.clear();
    input.releasePrefix(prefix);
  };
  return {
    clear,
    receive(data) {
      if (data.length < 3) return; // Ignore real-time clock and short system messages.
      const command = data[0] & 0xf0;
      const channel = data[0] & 0x0f;
      const note = data[1];
      const value = data[2];
      if (note > 127 || value > 127 || note < 0 || value < 0) return;
      const source = `${prefix}${channel}:${note}`;
      if (command === 0x90 && value > 0) {
        pressed.add(source);
        sustained.delete(source);
        input.press(source, note, value / 127, true);
      } else if (command === 0x80 || (command === 0x90 && value === 0)) {
        pressed.delete(source);
        if (pedal.has(channel)) sustained.set(source, channel);
        else input.release(source);
      } else if (command === 0xb0 && note === 64) {
        if (value >= 64) pedal.add(channel);
        else {
          pedal.delete(channel);
          for (const [key, noteChannel] of sustained) {
            if (noteChannel === channel) {
              sustained.delete(key);
              if (!pressed.has(key)) input.release(key);
            }
          }
        }
      } else if (command === 0xb0 && (note === 120 || note === 123)) {
        const channelPrefix = `${prefix}${channel}:`;
        for (const key of pressed) if (key.startsWith(channelPrefix)) pressed.delete(key);
        for (const key of sustained.keys()) if (key.startsWith(channelPrefix)) sustained.delete(key);
        pedal.delete(channel);
        input.releasePrefix(channelPrefix);
      } else if (command === 0xb0 && note === 121) {
        pedal.delete(channel);
        for (const [key, noteChannel] of sustained) {
          if (noteChannel === channel) {
            sustained.delete(key);
            if (!pressed.has(key)) input.release(key);
          }
        }
      }
    },
  };
}

export type MidiConnectionStatus = "idle" | "connecting" | "connected" | "empty" | "unsupported" | "denied" | "error";

export interface MidiConnectionState {
  readonly status: MidiConnectionStatus;
  readonly deviceNames: readonly string[];
}

export function createDiscoveryMidiConnection(deps: {
  requestAccess(): Promise<MIDIAccess> | null;
  canReceive?(): boolean;
  input: HeldNoteInput;
  onState(state: MidiConnectionState): void;
  onError(error: unknown): void;
}) {
  let access: MIDIAccess | null = null;
  let generation = 0;
  let connecting = false;
  let closing: Promise<void> = Promise.resolve();
  const devices = new Map<string, { port: MIDIInput; session: MidiNoteSession; listener: (event: MIDIMessageEvent) => void }>();
  const setState = (status: MidiConnectionStatus, deviceNames: readonly string[] = []) => deps.onState({ status, deviceNames });
  const closePort = (port: MIDIInput) => {
    const closed = port.close().then(() => undefined, (error: unknown) => {
      // An unplugged port is already unavailable. Surface other close failures.
      if (port.state !== "disconnected") deps.onError(error);
    });
    closing = Promise.all([closing, closed]).then(() => undefined);
  };
  const sync = () => {
    if (!access) return;
    const connected = [...access.inputs.values()].filter((port) => port.state === "connected");
    for (const [id, device] of devices) {
      if (!connected.some((port) => port.id === id)) {
        device.port.removeEventListener("midimessage", device.listener);
        device.session.clear();
        closePort(device.port);
        devices.delete(id);
      }
    }
    for (const port of connected) {
      if (devices.has(port.id)) continue;
      const session = createMidiNoteSession(port.id, deps.input);
      const listener = (event: MIDIMessageEvent) => {
        if (event.data && (deps.canReceive?.() ?? true)) session.receive(event.data);
      };
      devices.set(port.id, { port, session, listener });
      port.addEventListener("midimessage", listener);
    }
    setState(connected.length > 0 ? "connected" : "empty", connected.map((port) => port.name ?? "MIDI keyboard"));
  };
  const disconnect = () => {
    generation++;
    connecting = false;
    access?.removeEventListener("statechange", sync);
    access = null;
    for (const device of devices.values()) {
      device.port.removeEventListener("midimessage", device.listener);
      device.session.clear();
      closePort(device.port);
    }
    devices.clear();
    setState("idle");
  };
  return {
    disconnect,
    silence() {
      for (const device of devices.values()) device.session.clear();
    },
    async connect() {
      if (access || connecting) return;
      const attempt = ++generation;
      connecting = true;
      setState("connecting");
      try {
        await closing;
        if (attempt !== generation) return;
        const pending = deps.requestAccess();
        if (!pending) {
          connecting = false;
          setState("unsupported");
          return;
        }
        const result = await pending;
        if (attempt !== generation) return;
        connecting = false;
        access = result;
        access.addEventListener("statechange", sync);
        sync();
      } catch (error) {
        if (attempt !== generation) return;
        connecting = false;
        deps.onError(error);
        setState(error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError") ? "denied" : "error");
      }
    },
  };
}

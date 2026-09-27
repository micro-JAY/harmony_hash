import { describe, expect, it, vi } from "vitest";
import { createDiscoveryMidiConnection, createHeldNoteInput } from "./noteInput";

function fixture() {
  class TestPort extends EventTarget {
    id = "keys";
    name = "Test keys";
    manufacturer = "Test";
    version = "1";
    type = "input" as const;
    state: MIDIPortDeviceState = "connected";
    connection: MIDIPortConnectionState = "open";
    onmidimessage = null;
    onstatechange = null;
    async open() { this.connection = "open"; return this; }
    close = vi.fn(async () => { this.connection = "closed"; return this; });
  }
  const port = new TestPort();
  const ports = new Map([[port.id, port]]);
  const access = Object.assign(new EventTarget(), { inputs: ports, outputs: new Map<string, MIDIOutput>(), sysexEnabled: false, onstatechange: null });
  const input = createHeldNoteInput({ onChange: vi.fn(), onNoteOn: vi.fn(), onNoteOff: vi.fn() });
  const onState = vi.fn();
  const onError = vi.fn();
  // Only the Web MIDI event/read surface used by the connection is needed.
  const requestAccess = vi.fn(async () => access as MIDIAccess);
  let visible = true;
  const connection = createDiscoveryMidiConnection({ requestAccess, input, onState, onError, canReceive: () => visible });
  const send = (bytes: number[]) => port.dispatchEvent(Object.assign(new Event("midimessage"), { data: new Uint8Array(bytes) }));
  return { port, ports, access, input, onState, onError, requestAccess, connection, send, hide: () => { visible = false; connection.silence(); } };
}

describe("Discovery MIDI connection", () => {
  it("requests access only on connect, detects devices and cleans up on disconnect", async () => {
    const { connection, input, onState, requestAccess, port, send } = fixture();
    expect(requestAccess).not.toHaveBeenCalled();
    await connection.connect();
    expect(onState).toHaveBeenLastCalledWith({ status: "connected", deviceNames: ["Test keys"] });
    send([0x90, 60, 90]);
    expect(input.notes()).toEqual([60]);
    connection.disconnect();
    expect(port.close).toHaveBeenCalledTimes(1);
    expect(input.notes()).toEqual([]);
    send([0x90, 64, 90]);
    expect(input.notes()).toEqual([]);
  });

  it("releases unplugged device notes, reconnects on hotplug, and ignores background input", async () => {
    const { connection, input, onState, port, access, send, hide } = fixture();
    await connection.connect();
    send([0x90, 60, 90]);
    port.state = "disconnected";
    access.dispatchEvent(new Event("statechange"));
    expect(port.close).toHaveBeenCalledTimes(1);
    expect(input.notes()).toEqual([]);
    expect(onState).toHaveBeenLastCalledWith({ status: "empty", deviceNames: [] });
    port.state = "connected";
    access.dispatchEvent(new Event("statechange"));
    send([0x90, 64, 90]);
    expect(input.notes()).toEqual([64]);
    hide();
    send([0x90, 67, 90]);
    expect(input.notes()).toEqual([]);
    connection.disconnect();
  });

  it("does not attach late permission results after leaving the workspace", async () => {
    const { connection, input, requestAccess, access, send } = fixture();
    let finish: ((access: MIDIAccess) => void) | undefined;
    requestAccess.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const pending = connection.connect();
    await Promise.resolve();
    connection.disconnect();
    finish?.(access as MIDIAccess);
    await pending;
    send([0x90, 60, 100]);
    expect(input.notes()).toEqual([]);
  });

  it("reports unsupported and denied MIDI without affecting other input", async () => {
    const { input, onState, onError } = fixture();
    const unsupported = createDiscoveryMidiConnection({ requestAccess: () => null, input, onState, onError });
    await unsupported.connect();
    expect(onState).toHaveBeenLastCalledWith({ status: "unsupported", deviceNames: [] });
    const denied = createDiscoveryMidiConnection({ requestAccess: async () => { throw new DOMException("Denied", "NotAllowedError"); }, input, onState, onError });
    await denied.connect();
    expect(onState).toHaveBeenLastCalledWith({ status: "denied", deviceNames: [] });
    expect(onError).toHaveBeenCalledTimes(1);
    input.press("keyboard:KeyA", 60);
    expect(input.notes()).toEqual([60]);
  });
});

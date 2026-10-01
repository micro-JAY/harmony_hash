import { describe, expect, it, vi } from "vitest";
import { createDiscoveryMidiConnection, createHeldNoteInput } from "./noteInput";

class TestPort extends EventTarget {
  readonly id: string;
  readonly name: string;
  manufacturer = "Test";
  version = "1";
  type = "input" as const;
  state: MIDIPortDeviceState = "connected";
  connection: MIDIPortConnectionState = "closed";
  onmidimessage = null;
  onstatechange = null;
  open = vi.fn(async () => { this.connection = "open" as const; return this; });
  close = vi.fn(async () => { this.connection = "closed" as const; return this; });

  constructor(id = "keys", name = "Test keys") {
    super();
    this.id = id;
    this.name = name;
  }
}

function fixture() {
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
    expect(port.open).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith({
      status: "connected",
      deviceNames: ["Test keys"],
      devices: [{ id: "keys", name: "Test keys" }],
      selectedDeviceId: "keys",
    });
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
    await vi.waitFor(() => expect(port.close).toHaveBeenCalledTimes(1));
    expect(input.notes()).toEqual([]);
    expect(onState).toHaveBeenLastCalledWith({ status: "empty", deviceNames: [], devices: [], selectedDeviceId: null });
    port.state = "connected";
    access.dispatchEvent(new Event("statechange"));
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(2));
    send([0x90, 64, 90]);
    expect(input.notes()).toEqual([64]);
    hide();
    send([0x90, 67, 90]);
    expect(input.notes()).toEqual([]);
    connection.disconnect();
  });

  it("listens only to the selected device and falls back when it disconnects", async () => {
    const { connection, input, onState, port, ports, access, send } = fixture();
    const second = new TestPort("pad", "Studio pad");
    ports.set(second.id, second);
    const sendSecond = (bytes: number[]) => second.dispatchEvent(Object.assign(new Event("midimessage"), { data: new Uint8Array(bytes) }));

    await connection.connect();
    send([0x90, 60, 90]);
    sendSecond([0x90, 64, 90]);
    expect(input.notes()).toEqual([60]);

    await connection.selectDevice("pad");
    expect(port.close).toHaveBeenCalledTimes(1);
    expect(second.open).toHaveBeenCalledTimes(1);
    expect(input.notes()).toEqual([]);
    send([0x90, 67, 90]);
    sendSecond([0x90, 64, 90]);
    expect(input.notes()).toEqual([64]);
    expect(onState).toHaveBeenLastCalledWith({
      status: "connected",
      deviceNames: ["Test keys", "Studio pad"],
      devices: [{ id: "keys", name: "Test keys" }, { id: "pad", name: "Studio pad" }],
      selectedDeviceId: "pad",
    });

    second.state = "disconnected";
    access.dispatchEvent(new Event("statechange"));
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledTimes(2));
    expect(input.notes()).toEqual([]);
    send([0x90, 67, 90]);
    expect(input.notes()).toEqual([67]);
    expect(onState).toHaveBeenLastCalledWith({
      status: "connected",
      deviceNames: ["Test keys"],
      devices: [{ id: "keys", name: "Test keys" }],
      selectedDeviceId: "keys",
    });
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
    expect(onState).toHaveBeenLastCalledWith({ status: "unsupported", deviceNames: [], devices: [], selectedDeviceId: null });
    const denied = createDiscoveryMidiConnection({ requestAccess: async () => { throw new DOMException("Denied", "NotAllowedError"); }, input, onState, onError });
    await denied.connect();
    expect(onState).toHaveBeenLastCalledWith({ status: "denied", deviceNames: [], devices: [], selectedDeviceId: null });
    expect(onError).toHaveBeenCalledTimes(1);
    input.press("keyboard:KeyA", 60);
    expect(input.notes()).toEqual([60]);
  });
});

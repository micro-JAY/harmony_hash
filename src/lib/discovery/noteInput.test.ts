import { describe, expect, it, vi } from "vitest";
import { computerKeyMidi, createHeldNoteInput, createMidiNoteSession } from "./noteInput";

function fixture() {
  const onNoteOn = vi.fn();
  const onNoteOff = vi.fn();
  const onChange = vi.fn();
  const input = createHeldNoteInput({ onNoteOn, onNoteOff, onChange });
  return { input, onNoteOn, onNoteOff, onChange };
}

describe("Discovery note input", () => {
  it("uses Ableton white/black key positions and octave shifts", () => {
    expect(["KeyA", "KeyS", "KeyD", "KeyF"].map((code) => computerKeyMidi(code, 3))).toEqual([48, 50, 52, 53]);
    expect(["KeyW", "KeyE", "KeyT", "KeyY", "KeyU"].map((code) => computerKeyMidi(code, 3))).toEqual([49, 51, 54, 56, 58]);
    expect(computerKeyMidi("KeyQ", 3)).toBeNull();
    expect(computerKeyMidi("KeyA", 4)).toBe(60);
  });

  it("keeps a pitch sounding until every source releases it", () => {
    const { input, onNoteOn, onNoteOff } = fixture();
    input.press("keyboard:KeyA", 60);
    input.press("keyboard:KeyA", 60);
    input.press("midi:device:0:60", 60);
    expect(onNoteOn).toHaveBeenCalledTimes(1);
    input.release("keyboard:KeyA");
    expect(onNoteOff).not.toHaveBeenCalled();
    expect(input.notes()).toEqual([60]);
    input.releasePrefix("midi:device:");
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(input.notes()).toEqual([]);
  });

  it("releases zero-velocity note-on and distinguishes channels and devices", () => {
    const { input } = fixture();
    const one = createMidiNoteSession("one", input);
    const two = createMidiNoteSession("two", input);
    one.receive([0x90, 60, 100]);
    two.receive([0x91, 60, 100]);
    one.receive([0x90, 60, 0]);
    expect(input.notes()).toEqual([60]);
    two.receive([0x81, 60, 0]);
    expect(input.notes()).toEqual([]);
  });

  it("holds sustained notes, does not cut a re-pressed note, and scopes pedal by channel", () => {
    const { input } = fixture();
    const midi = createMidiNoteSession("keys", input);
    midi.receive([0xb0, 64, 127]);
    midi.receive([0x90, 60, 100]);
    midi.receive([0x80, 60, 0]);
    midi.receive([0x91, 67, 100]);
    midi.receive([0x81, 67, 0]);
    expect(input.notes()).toEqual([60]);
    midi.receive([0x90, 60, 100]);
    midi.receive([0xb0, 64, 0]);
    expect(input.notes()).toEqual([60]);
    midi.receive([0x80, 60, 0]);
    expect(input.notes()).toEqual([]);
  });

  it("re-articulates a new MIDI strike while the same pitch is sustained", () => {
    const { input, onNoteOn, onNoteOff } = fixture();
    const midi = createMidiNoteSession("keys", input);
    midi.receive([0xb0, 64, 127]);
    midi.receive([0x90, 60, 32]);
    midi.receive([0x80, 60, 0]);
    midi.receive([0x90, 60, 127]);
    expect(onNoteOn).toHaveBeenCalledTimes(2);
    expect(onNoteOn).toHaveBeenLastCalledWith(60, 1);
    expect(onNoteOff).toHaveBeenCalledTimes(1);
    expect(input.notes()).toEqual([60]);
    midi.receive([0xb0, 64, 0]);
    expect(input.notes()).toEqual([60]);
    midi.receive([0x80, 60, 0]);
    expect(input.notes()).toEqual([]);
  });

  it("clears device notes and pedal on disconnect without releasing another source", () => {
    const { input } = fixture();
    const midi = createMidiNoteSession("keys", input);
    input.press("keyboard:KeyS", 62);
    midi.receive([0xb0, 64, 127]);
    midi.receive([0x90, 60, 100]);
    midi.receive([0x80, 60, 0]);
    midi.clear();
    expect(input.notes()).toEqual([62]);
    midi.receive([0x90, 64, 100]);
    midi.receive([0x80, 64, 0]);
    expect(input.notes()).toEqual([62]);
    input.clear();
    expect(input.notes()).toEqual([]);
  });

  it("honors MIDI panic and reset controllers without mixing channels", () => {
    const { input } = fixture();
    const midi = createMidiNoteSession("keys", input);
    midi.receive([0x90, 60, 100]);
    midi.receive([0x91, 64, 100]);
    midi.receive([0xb0, 123, 0]);
    expect(input.notes()).toEqual([64]);
    midi.receive([0xb1, 64, 127]);
    midi.receive([0x81, 64, 0]);
    midi.receive([0xb1, 121, 0]);
    expect(input.notes()).toEqual([]);
    midi.receive([0xf8]);
    midi.receive([0x90, 200, 127]);
    expect(input.notes()).toEqual([]);
  });
});

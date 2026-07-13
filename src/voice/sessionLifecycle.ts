import type { ProgressionBridge } from "./types";

type FocusBridge = Pick<ProgressionBridge, "highlightChord">;

export async function clearVoiceFocus(bridge: FocusBridge): Promise<void> {
  await bridge.highlightChord(null);
}

export async function endVoiceSession(
  endSession: () => void | Promise<void>,
  bridge: FocusBridge,
): Promise<void> {
  try {
    await endSession();
  } finally {
    await clearVoiceFocus(bridge);
  }
}

import { describe, expect, it } from "vitest";
import {
  APPEARANCE_PALETTE,
  APPEARANCE_PREFERENCE_KEY,
  applyAppearance,
  readAppearancePreference,
  restoreAppearance,
  writeAppearancePreference,
} from "./appearance";

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = hex
      .replace("#", "")
      .match(/.{2}/g)
      ?.map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) => (
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      ));
    if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };

  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe("appearance preference", () => {
  it("defaults to dark when no preference exists", () => {
    expect(readAppearancePreference({ getLocalStorage: () => null })).toBe("dark");
  });

  it.each(["dark", "light"] as const)("restores the valid %s value", (appearance) => {
    expect(readAppearancePreference({
      getLocalStorage: () => ({
        getItem: (key) => key === APPEARANCE_PREFERENCE_KEY ? appearance : null,
        setItem: () => undefined,
      }),
    })).toBe(appearance);
  });

  it("rejects invalid stored values", () => {
    expect(readAppearancePreference({
      getLocalStorage: () => ({
        getItem: () => "system",
        setItem: () => undefined,
      }),
    })).toBe("dark");
  });

  it("contains thrown storage reads and writes", () => {
    const getLocalStorage = () => {
      throw new Error("storage blocked");
    };

    expect(readAppearancePreference({ getLocalStorage })).toBe("dark");
    expect(writeAppearancePreference("light", { getLocalStorage })).toBe(false);
  });

  it("persists an explicit choice under the versioned key", () => {
    const writes: Array<readonly [string, string]> = [];

    expect(writeAppearancePreference("light", {
      getLocalStorage: () => ({
        getItem: () => null,
        setItem: (key, value) => writes.push([key, value]),
      }),
    })).toBe(true);
    expect(writes).toEqual([[APPEARANCE_PREFERENCE_KEY, "light"]]);
  });

  it("applies root color scheme and browser theme color during restoration", () => {
    const root = { dataset: {} as DOMStringMap, style: { colorScheme: "" } };
    const meta = { content: "#09090b", setAttribute: (_name: string, value: string) => { meta.content = value; } };
    const targetDocument = {
      documentElement: root,
      querySelector: () => meta,
    } as unknown as Document;

    const appearance = restoreAppearance({
      targetDocument,
      getLocalStorage: () => ({
        getItem: () => "light",
        setItem: () => undefined,
      }),
    });

    expect(appearance).toBe("light");
    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
    expect(meta.content).toBe("#F0EDE8");

    applyAppearance("dark", targetDocument);
    expect(meta.content).toBe("#09090b");
  });

  it("keeps the approved light text, muted, and accent colors readable", () => {
    const { base, raised, ink, muted, accent } = APPEARANCE_PALETTE.light;

    expect(contrastRatio(ink, base)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(muted, base)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, base)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ink, raised)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(muted, raised)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, raised)).toBeGreaterThanOrEqual(4.5);
  });
});

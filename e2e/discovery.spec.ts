import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function openDiscovery(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
  await expect(page.getByTestId("discovery")).toBeVisible();
}

async function sendMidi(page: Page, data: number[]) {
  await page.evaluate((bytes) => window.dispatchEvent(new CustomEvent("discovery-test-midi", { detail: bytes })), data);
}

async function mockMidi(page: Page) {
  await page.addInitScript(() => {
    const port = Object.assign(new EventTarget(), { id: "test-keyboard", name: "Test keyboard", state: "connected", close: async () => undefined });
    const access = Object.assign(new EventTarget(), { inputs: new Map([[port.id, port]]), outputs: new Map(), sysexEnabled: false });
    Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: async () => {
      document.documentElement.dataset.midiRequested = "true";
      return access;
    } });
    window.addEventListener("discovery-test-midi", (event) => {
      if (event instanceof CustomEvent) port.dispatchEvent(Object.assign(new Event("midimessage"), { data: new Uint8Array(event.detail) }));
    });
    window.addEventListener("discovery-test-unplug", () => {
      port.state = "disconnected";
      access.dispatchEvent(new Event("statechange"));
    });
  });
}

test.describe("DISCOVERY", () => {
  test("identifies the user's note, seventh and inversion examples", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDiscovery(page);
    const piano = page.getByRole("group", { name: "Discovery piano" });
    for (const name of ["C4", "Eb4 / D#4", "G4"]) await piano.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin");
    await piano.getByRole("button", { name: "Bb4 / A#4", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin7");
    await expect(page.getByTestId("discovery-hud")).toContainText("Eb/C");
    await piano.getByRole("button", { name: "Bb4 / A#4", exact: true }).click();
    await piano.getByRole("button", { name: "Bb3 / A#3", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Eb6/Bb");
    await expect(page.getByTestId("discovery-hud")).toContainText("Cmin/Bb");
    await expect(page.getByTestId("discovery-hud")).toContainText("Cmin7/Bb");
    expect(errors).toEqual([]);
  });

  test("uses one fret per guitar string and preserves each instrument's choices", async ({ page }) => {
    await openDiscovery(page);
    await page.getByRole("group", { name: "Discovery piano" }).getByRole("button", { name: "C4", exact: true }).click();
    await page.getByRole("group", { name: "Discovery instrument" }).getByRole("button", { name: "Fretboard", exact: true }).click();
    const board = page.getByRole("group", { name: "Discovery guitar fretboard" });
    for (const [string, fret] of [[5, 3], [4, 2], [3, 0]]) await board.locator(`[data-string="${string}"][data-fret="${fret}"]`).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C");
    await board.locator('[data-string="4"][data-fret="3"]').click();
    await expect(board.locator('[data-string="4"][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Csus4");
    await page.getByRole("group", { name: "Discovery instrument" }).getByRole("button", { name: "Piano", exact: true }).click();
    await expect(page.getByRole("button", { name: "C4", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("plays Ableton-style keyboard notes only when enabled and cleans up on blur and tab exit", async ({ page }) => {
    await openDiscovery(page);
    await page.keyboard.press("a");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Computer keys", exact: true }).click();
    for (const key of ["a", "e", "g"]) await page.keyboard.down(key);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(3);
    for (const key of ["a", "e", "g"]) await page.keyboard.up(key);
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.keyboard.down("a");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.keyboard.up("a");
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await page.keyboard.down("a");
    await page.keyboard.up("a");
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
  });

  test("does not intercept typing, modified shortcuts or hidden-document notes", async ({ page }) => {
    await openDiscovery(page);
    await page.getByRole("button", { name: "Computer keys", exact: true }).click();
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "discovery-test-editable";
      document.body.append(input);
      input.focus();
    });
    await page.keyboard.type("asdf");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.locator("#discovery-test-editable").evaluate((input) => input.remove());
    await page.keyboard.press("Control+a");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.keyboard.down("a");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await page.keyboard.up("a");
    await page.keyboard.press("s");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
  });

  test("connects MIDI on request, handles sustain and releases unplugged devices", async ({ page }) => {
    await mockMidi(page);
    await openDiscovery(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-midi-requested", "true");
    await page.getByRole("button", { name: "Connect MIDI", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "MIDI connected" })).toContainText("Test keyboard");
    for (const midi of [60, 63, 67]) await sendMidi(page, [0x90, midi, 100]);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin");
    await sendMidi(page, [0xb0, 64, 127]);
    await sendMidi(page, [0x90, 63, 0]);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin");
    await sendMidi(page, [0xb0, 64, 0]);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C5");
    await page.evaluate(() => window.dispatchEvent(new Event("discovery-test-unplug")));
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "MIDI is ready" })).toBeVisible();
  });

  test("reports unavailable MIDI while pointer input remains usable", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: undefined }));
    await openDiscovery(page);
    await page.getByRole("button", { name: "Connect MIDI", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "MIDI is not supported" })).toBeVisible();
    await page.getByRole("button", { name: "C4", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C");
  });

  test("loops the Hasher progression with tempo controls and leaves Hasher untouched", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "F", "G"]);
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play Discovery loop", exact: true })).toBeEnabled();
    const tempo = page.getByRole("slider", { name: "Discovery loop tempo" });
    await tempo.focus();
    await tempo.press("End");
    await expect(tempo).toHaveValue("200");
    await page.getByRole("button", { name: "Play Discovery loop", exact: true }).click();
    await expect(page.getByRole("button", { name: "Stop Discovery loop", exact: true })).toBeVisible();
    await expect(page.locator('.discovery-loop-timeline [aria-current="step"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Computer keys", exact: true }).click();
    await page.keyboard.down("a");
    await expect(page.locator('.discovery-key[data-held="true"]')).toHaveCount(1);
    await page.keyboard.up("a");
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play Discovery loop", exact: true })).toBeVisible();
    await expect(page.locator(".discovery-loop-timeline span")).toHaveText(["C", "F", "G"]);
  });

  test("contains its instruments within a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDiscovery(page);
    await page.getByRole("button", { name: "C4", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("group", { name: "Discovery instrument" }).getByRole("button", { name: "Fretboard", exact: true }).click();
    await page.locator('[data-string="5"][data-fret="3"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

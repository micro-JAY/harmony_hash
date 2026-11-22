import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function openDiscovery(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
  await expect(page.getByTestId("discovery")).toBeVisible();
}

async function sendMidi(page: Page, data: number[], deviceId = "test-keyboard") {
  await page.evaluate(({ bytes, id }) => window.dispatchEvent(new CustomEvent("discovery-test-midi", {
    detail: { bytes, deviceId: id },
  })), { bytes: data, id: deviceId });
}

async function mockMidi(page: Page, multiple = false) {
  await page.addInitScript((includeSecondDevice) => {
    const createPort = (id: string, name: string) => Object.assign(new EventTarget(), {
      id,
      name,
      state: "connected",
      connection: "closed",
      async open() { this.connection = "open"; return this; },
      async close() { this.connection = "closed"; return this; },
    });
    const port = createPort("test-keyboard", "Test keyboard");
    const secondPort = createPort("studio-pad", "Studio pad");
    const ports = includeSecondDevice ? [port, secondPort] : [port];
    const access = Object.assign(new EventTarget(), { inputs: new Map(ports.map((input) => [input.id, input])), outputs: new Map(), sysexEnabled: false });
    Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: async () => {
      document.documentElement.dataset.midiRequested = "true";
      return access;
    } });
    window.addEventListener("discovery-test-midi", (event) => {
      if (!(event instanceof CustomEvent)) return;
      const target = access.inputs.get(event.detail.deviceId);
      target?.dispatchEvent(Object.assign(new Event("midimessage"), { data: new Uint8Array(event.detail.bytes) }));
    });
    window.addEventListener("discovery-test-unplug", () => {
      port.state = "disconnected";
      access.dispatchEvent(new Event("statechange"));
    });
  }, multiple);
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
    await expect(page.getByTestId("discovery-chord-name")).toHaveAttribute("data-chord-family", "minor");
    await expect(page.getByTestId("discovery-hud").locator(".discovery-interval")).toHaveText([
      "1Root", "b3Minor third", "5Perfect fifth",
    ]);
    await piano.getByRole("button", { name: "Bb4 / A#4", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin7");
    await expect(page.getByTestId("discovery-hud")).toContainText("Eb/C");
    await expect(page.getByTestId("discovery")).toHaveScreenshot("discovery-minor-seventh.png");
    await piano.getByRole("button", { name: "Bb4 / A#4", exact: true }).click();
    await piano.getByRole("button", { name: "Bb3 / A#3", exact: true }).click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Eb6/Bb");
    await expect(page.getByTestId("discovery-hud")).toContainText("Cmin/Bb");
    await expect(page.getByTestId("discovery-hud")).toContainText("Cmin7/Bb");
    expect(errors).toEqual([]);
  });

  test("keeps long discoveries and piano key legends compact and collision-free", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDiscovery(page);
    const piano = page.getByRole("group", { name: "Discovery piano" });
    for (const name of ["C4", "Eb4 / D#4", "F4"]) {
      await piano.getByRole("button", { name, exact: true }).click();
    }
    const title = page.getByTestId("discovery-chord-name");
    await expect(title).toHaveText("Cmin(add11)(no5)");
    expect(await title.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("nowrap");
    expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

    await page.getByRole("button", { name: "Computer keys", exact: true }).click();
    await expect(page.getByLabel("Octave 3, Z / X")).toBeVisible();
    await expect(piano.getByRole("button", { name: "C2", exact: true }).locator(".discovery-key__note"))
      .toHaveText("C2");
    const labelGeometry = await piano.locator(".discovery-key").evaluateAll((keys) => keys.map((key) => {
      const keyBounds = key.getBoundingClientRect();
      const note = key.querySelector<HTMLElement>(".discovery-key__note");
      const shortcut = key.querySelector<HTMLElement>(".discovery-key__shortcut");
      const shortcutBounds = shortcut?.getBoundingClientRect();
      return {
        noteWrap: note ? getComputedStyle(note).whiteSpace : null,
        noteCenterDelta: note
          ? Math.abs(note.getBoundingClientRect().x + note.getBoundingClientRect().width / 2
            - (keyBounds.x + keyBounds.width / 2))
          : Number.POSITIVE_INFINITY,
        shortcutInside: !shortcutBounds
          || (shortcutBounds.top >= keyBounds.top - 1 && shortcutBounds.bottom <= keyBounds.bottom + 1),
      };
    }));
    expect(labelGeometry.every((label) => label.noteWrap === "nowrap")).toBe(true);
    expect(labelGeometry.every((label) => label.noteCenterDelta <= 1)).toBe(true);
    expect(labelGeometry.every((label) => label.shortcutInside)).toBe(true);
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

  test("selects and preserves a recommended scale without mutating Hasher or direct note states", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();

    const guide = page.locator('[data-tour="discovery-improv"]');
    const selector = page.getByRole("combobox", { name: "Recommended scale" });
    const highlight = page.getByRole("button", { name: "Highlight", exact: true });
    await expect(selector.locator("option")).toHaveCount(6);
    await expect(selector.locator("option").first()).toContainText("C Major · 100%");
    await expect(guide).toHaveAttribute("data-highlight", "false");
    await expect(highlight).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator('.discovery-key[data-scale-tone="true"]')).toHaveCount(0);

    const alternateValue = await selector.locator("option").nth(1).getAttribute("value");
    if (!alternateValue) throw new Error("Expected a second Discovery scale recommendation");
    await selector.selectOption(alternateValue);
    const selectedLabel = await selector.locator("option:checked").textContent();
    await highlight.click();
    await expect(guide).toHaveAttribute("data-highlight", "true");
    await expect(highlight).toHaveAttribute("aria-pressed", "true");

    const scaleKeys = page.locator('.discovery-key[data-scale-tone="true"]');
    await expect(scaleKeys).not.toHaveCount(0);
    expect(await page.locator('.discovery-key[data-scale-root="true"]').count()).toBeGreaterThan(1);
    const selectedScaleKey = scaleKeys.filter({ hasNot: page.locator('[data-held="true"]') }).first();
    await selectedScaleKey.click();
    await expect(selectedScaleKey).toHaveAttribute("aria-pressed", "true");
    expect(await selectedScaleKey.evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--palette-gold)";
      document.body.append(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(element).backgroundColor === expected;
    })).toBe(true);
    await expect(selectedScaleKey).toHaveAttribute("data-scale-tone", "true");

    await page.getByRole("group", { name: "Discovery instrument" })
      .getByRole("button", { name: "Fretboard", exact: true }).click();
    await expect(selector).toHaveValue(alternateValue);
    await expect(highlight).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Discovery guitar fretboard" }))
      .toHaveAttribute("data-scale-overlay", selectedLabel?.replace(/ · \d+%$/, "") ?? "");
    await expect(page.locator('.discovery-fret[data-scale-tone="true"]')).not.toHaveCount(0);
    await expect(page.locator('.discovery-fret[data-scale-root="true"]')).not.toHaveCount(0);

    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Cmaj7", "Am7", "Dm7", "G7"]);
  });

  test("pins a discovered chord for later inspection without editing Hasher", async ({ page }) => {
    await page.addInitScript(() => {
      const testWindow = window as Window & { __audioContextConstructions?: number };
      testWindow.__audioContextConstructions = 0;
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(contextOptions?: AudioContextOptions) {
          super(contextOptions);
          testWindow.__audioContextConstructions = (testWindow.__audioContextConstructions ?? 0) + 1;
        }
      };
    });
    await openDiscovery(page);
    const piano = page.getByRole("group", { name: "Discovery piano" });
    for (const name of ["C4", "Eb4 / D#4", "G4"]) {
      await piano.getByRole("button", { name, exact: true }).click();
    }
    const pinButton = page.getByRole("button", { name: "Pin chord card: Cmin" });
    await expect(page.locator(".discovery-hud__detail").getByRole("button", { name: "Pin chord card: Cmin" })).toBeVisible();
    const audioBeforePin = await page.evaluate(() =>
      (window as Window & { __audioContextConstructions?: number }).__audioContextConstructions ?? 0);
    await pinButton.click();

    const pin = page.getByTestId("pinned-chord-card");
    await expect(pin.getByRole("heading", { name: "Cmin" })).toBeVisible();
    expect(await page.evaluate(() =>
      (window as Window & { __audioContextConstructions?: number }).__audioContextConstructions ?? 0))
      .toBe(audioBeforePin);
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-composer").locator("[data-composer-chip-index]")).toHaveCount(0);
    await expect(pin).toBeVisible();
  });

  test("localizes the Discovery controls and chord quality in Japanese", async ({ page }) => {
    await openDiscovery(page);
    await page.getByRole("button", { name: "Switch language to Japanese" }).click();
    await expect(page.getByRole("heading", { name: "ディスカバリー", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "MIDIを接続", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "PCキーボード", exact: true })).toBeVisible();
    for (const name of ["C4", "Eb4 / D#4", "G4"]) await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("discovery-hud")).toContainText("マイナー・トライアド");
    await expect(page.getByRole("button", { name: "音をクリア", exact: true })).toBeEnabled();
  });

  test("loops mixed ukulele shapes without dropping unsupported chord slots", async ({ page }) => {
    await page.goto("/");
    await composeProgression(page, ["C", "F#maj9", "G7"]);
    await page.getByRole("button", { name: "Ukulele", exact: true }).click();
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await page.getByRole("slider", { name: "Discovery loop tempo" }).press("End");
    await page.getByRole("button", { name: "Play Discovery loop", exact: true }).click();
    const timeline = page.getByLabel("Hasher progression");
    await expect(timeline.locator('[aria-current="step"]')).toHaveText("F#maj9");
    await expect(timeline.locator('[aria-current="step"]')).toHaveText("G7");
    await expect(timeline.locator('[aria-current="step"]')).toHaveText("C");
    await page.getByRole("button", { name: "Stop Discovery loop", exact: true }).click();
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["C", "F#maj9", "G7"]);
    await expect(page.getByTestId("ukulele-unavailable")).toHaveCount(1);
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

  test("selects one MIDI input when several devices are connected", async ({ page }) => {
    await mockMidi(page, true);
    await openDiscovery(page);
    await page.getByRole("button", { name: "Connect MIDI", exact: true }).click();
    const selector = page.getByRole("combobox", { name: "MIDI input" });
    await expect(selector).toHaveValue("test-keyboard");
    await expect(selector.locator("option")).toHaveText(["Test keyboard", "Studio pad"]);

    await sendMidi(page, [0x90, 60, 100], "studio-pad");
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Play a chord");
    await selector.selectOption("studio-pad");
    for (const midi of [60, 63, 67]) await sendMidi(page, [0x90, midi, 100], "studio-pad");
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Cmin");
    await expect(page.getByRole("status").filter({ hasText: "MIDI connected" })).toContainText("Studio pad");

    await selector.selectOption("test-keyboard");
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Play a chord");
    await sendMidi(page, [0x90, 64, 100], "studio-pad");
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("Play a chord");
    await sendMidi(page, [0x90, 60, 100]);
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C");
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

  test("carries per-chord and whole-progression piano octaves into the Discovery loop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "F", "G"]);
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    const cards = page.getByTestId("chord-card");
    const initialFirst = (await cards.nth(0).getByTestId("piano-keyboard").getAttribute("data-active-midis"))
      ?.split(",").map(Number) ?? [];

    await cards.nth(0).getByRole("button", { name: "Lower chord octave: C" }).click();
    await expect(cards.nth(0).getByTestId("piano-keyboard")).toHaveAttribute("data-octave-offset", "-1");
    expect((await cards.nth(0).getByTestId("piano-keyboard").getAttribute("data-active-midis"))
      ?.split(",").map(Number)).toEqual(initialFirst.map((midi) => midi - 12));

    const composer = page.getByTestId("chord-composer");
    await composer.getByRole("button", { name: "C, position 1 of 3" }).press("Alt+ArrowRight");
    await expect(cards.locator("h3")).toHaveText(["F", "C", "G"]);
    expect(await cards.getByTestId("piano-keyboard").evaluateAll((keyboards) => keyboards.map((keyboard) =>
      keyboard.getAttribute("data-octave-offset")))).toEqual(["0", "-1", "0"]);

    const beforeRaise = await cards.getByTestId("piano-keyboard").evaluateAll((keyboards) => keyboards.map((keyboard) =>
      (keyboard.getAttribute("data-active-midis") ?? "").split(",").map(Number)));
    await page.getByRole("button", { name: "Raise whole progression one octave" }).click();
    const afterRaise = await cards.getByTestId("piano-keyboard").evaluateAll((keyboards) => keyboards.map((keyboard) =>
      (keyboard.getAttribute("data-active-midis") ?? "").split(",").map(Number)));
    expect(afterRaise).toEqual(beforeRaise.map((voicing) => voicing.map((midi) => midi + 12)));
    expect(await cards.getByTestId("piano-keyboard").evaluateAll((keyboards) => keyboards.map((keyboard) =>
      keyboard.getAttribute("data-octave-offset")))).toEqual(["1", "0", "1"]);

    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    const timeline = page.getByLabel("Hasher progression").locator("span");
    await expect(timeline).toHaveText(["F", "C", "G"]);
    expect(await timeline.evaluateAll((items) => items.map((item) =>
      (item.getAttribute("data-voicing-midis") ?? "").split(",").map(Number))))
      .toEqual(afterRaise);
  });

  test("contains its instruments within a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "F", "G"]);
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await page.getByRole("button", { name: "Highlight", exact: true }).click();
    await page.locator('.discovery-key[data-midi="60"]').click();
    await expect(page.getByTestId("discovery-chord-name")).toHaveText("C");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("group", { name: "Discovery instrument" }).getByRole("button", { name: "Fretboard", exact: true }).click();
    const scroller = page.getByTestId("discovery-guitar-scroller");
    await expect(scroller).toBeVisible();
    await expect(page.locator('.discovery-fret[data-scale-tone="true"]')).not.toHaveCount(0);
    await expect(page.locator('.discovery-fret[data-scale-root="true"]')).not.toHaveCount(0);
    await expect(page.locator(".discovery-fretboard__string-row")).toHaveCount(6);
    expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await page.locator('[data-string="5"][data-fret="3"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const appearance of ["dark", "light"]) {
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, appearance);
      await expect(scroller).toHaveCSS("background-color", /rgb/);
      await expect(page.locator('.discovery-fret[data-scale-root="true"]').first()).toBeVisible();
    }
  });
});

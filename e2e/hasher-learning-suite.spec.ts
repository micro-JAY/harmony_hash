import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

async function dispatchNativeDrag(
  page: Page,
  source: Locator,
  target: Locator,
  targetPosition: { clientX: number; clientY: number },
): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer, ...targetPosition });
  await target.dispatchEvent("drop", { dataTransfer, ...targetPosition });
  await source.dispatchEvent("dragend", { dataTransfer });
  await dataTransfer.dispose();
}

async function firstRowCardCount(page: Page): Promise<number> {
  const boxes = await page.getByTestId("chord-card").evaluateAll((cards) => cards.map((card) => {
    const box = card.getBoundingClientRect();
    return { x: box.x, y: box.y };
  }));
  const firstY = boxes[0]?.y;
  if (firstY === undefined) return 0;
  return boxes.filter((box) => Math.abs(box.y - firstY) <= 2).length;
}

test.describe("HASHER learning suite", () => {
  test.describe.configure({ timeout: 120_000 });

  test("uses the three alliterative destinations and the rebuilt HASHER hierarchy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", { name: "Workspace" });
    await expect(nav.getByRole("button")).toHaveCount(3);
    await expect(nav.getByRole("button", { name: "HASHER", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(nav.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "FRET FINDER", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Circle", exact: true })).toHaveCount(0);

    const context = page.getByRole("group", { name: "HASHER harmony context" });
    const presets = page.getByRole("heading", { name: "Choose from a preset" });
    const describe = page.getByRole("heading", { name: "Describe a progression or mood" });
    const buildOwn = page.getByRole("heading", { name: "Build your own" });
    const browse = page.getByRole("button", { name: "Browse chords ↓" });
    const [contextBox, presetsBox, describeBox, buildBox, browseBox] = await Promise.all([
      context.boundingBox(),
      presets.boundingBox(),
      describe.boundingBox(),
      buildOwn.boundingBox(),
      browse.boundingBox(),
    ]);
    expect(contextBox).not.toBeNull();
    expect(presetsBox).not.toBeNull();
    expect(describeBox).not.toBeNull();
    expect(buildBox).not.toBeNull();
    expect(browseBox).not.toBeNull();
    expect(contextBox!.y).toBeLessThan(presetsBox!.y);
    expect(presetsBox!.y).toBeLessThan(describeBox!.y);
    expect(describeBox!.y).toBeLessThan(buildBox!.y);
    expect(buildBox!.y).toBeLessThan(browseBox!.y);
    await expect(page.getByTestId("mood-filter")).toHaveCount(0);
    await expect(page.getByLabel("Mood lens")).toHaveCount(0);

    await composeProgression(page, "C Dm G7 C");
    const actions = page.getByRole("region", { name: "Progression actions" });
    const randomize = actions.getByRole("button", {
      name: "RANDOMIZE (UNLOCKED VOICES)",
      exact: true,
    });
    const play = actions.getByRole("button", { name: "Play progression" });
    const share = actions.getByRole("button", { name: "SHARE", exact: true });
    await expect(randomize).toHaveText("RANDOMIZE (UNLOCKED VOICES)");
    await expect(play).toHaveText("PLAY");
    await expect(play.locator("svg.lucide-play")).toBeVisible();
    await expect(share).toHaveText("SHARE");
    await expect(share.locator("svg.lucide-link-2")).toBeVisible();
    const insight = actions.getByRole("button", { name: "IMPROV INSIGHT", exact: true });
    await expect(insight).toHaveText("IMPROV INSIGHT");
    await expect(actions.getByRole("button", { name: /Hanz/ })).toHaveCount(0);
    await expect(play).toBeEnabled();
    await play.click();
    const stop = actions.getByRole("button", { name: "Stop playback" });
    await expect(stop).toHaveText("STOP");
    await expect(stop.locator("svg.lucide-square")).toBeVisible();
    await stop.click();
    await expect(play).toHaveText("PLAY");

    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await expect(randomize).toHaveText("RANDOMIZE (UNLOCKED VOICES)");
    await expect(play).toHaveText("PLAY");
    await expect(play.locator("svg.lucide-play")).toBeVisible();
    await expect(share).toHaveText("SHARE");
    await expect(share.locator("svg.lucide-link-2")).toBeVisible();
    await expect(insight).toHaveText("IMPROV INSIGHT");
    await expect(actions.getByRole("button", { name: /Hanz/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Guitar", exact: true }).click();

    const composerItems = page.getByTestId("chord-composer").locator("[data-composer-chip-index]");
    const dm = composerItems.nth(1);
    await dm.focus();
    await dm.press("Alt+ArrowRight");
    await expect(composerItems.nth(0)).toContainText("C");
    await expect(composerItems.nth(1)).toContainText("G7");
    await expect(composerItems.nth(2)).toContainText("Dm");
    await expect(page.locator('.sr-only[role="status"]')).toContainText("Dm moved to position 3 of 4");
    await expect(composerItems.nth(2)).toBeFocused();

    const cards = page.getByTestId("chord-card");
    await expect(cards.nth(0).getByRole("heading", { name: "C" })).toBeVisible();
    await expect(cards.nth(1).getByRole("heading", { name: "G7" })).toBeVisible();
    await expect(cards.nth(2).getByRole("heading", { name: "Dm" })).toBeVisible();
  });

  test("preserves the unified context, composer, prompt, and actions across both instruments", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const directInput = page.getByRole("textbox", { name: "Chord progression input" });
    await page.getByRole("combobox", { name: "HASHER key" }).selectOption("D");
    await page.getByRole("combobox", { name: "HASHER mode" }).selectOption("dorian");
    for (const chord of ["Cmaj7", "Am7", "Dm7", "G7"]) {
      await directInput.fill(chord);
      await directInput.press("Enter");
    }
    await page.getByRole("button", { name: "Run chord composer" }).click();
    const prompt = page.getByRole("textbox", { name: "Describe the progression you want" });
    await prompt.fill("smoky turnaround");
    await expect(page.getByRole("button", { name: "Browse chords ↓" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SHARE", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "IMPROV INSIGHT" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose from a preset" })).toBeVisible();

    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play progression" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "HASHER key" })).toHaveValue("D");
    await expect(page.getByRole("combobox", { name: "HASHER mode" })).toHaveValue("dorian");
    await expect(prompt).toHaveValue("smoky turnaround");
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
  });

  test("supports pointer insertion and reordering at exact timeline boundaries", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "C G7 Am");
    const composer = page.getByTestId("chord-composer");
    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    const chips = composer.locator("[data-composer-chip-index]");
    const secondChip = await chips.nth(1).boundingBox();
    expect(secondChip).not.toBeNull();
    await dispatchNativeDrag(page, page.locator('[data-chord-name="F"]'), composer, {
      clientX: secondChip!.x + 1,
      clientY: secondChip!.y + secondChip!.height / 2,
    });
    await expect(chips).toHaveText(["C", "F", "G7", "Am"]);
    const firstChip = await chips.first().boundingBox();
    expect(firstChip).not.toBeNull();
    await dispatchNativeDrag(page, chips.nth(3), composer, {
      clientX: firstChip!.x,
      clientY: firstChip!.y + firstChip!.height / 2,
    });
    await expect(chips).toHaveText(["Am", "C", "F", "G7"]);
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Am", "C", "F", "G7"]);
  });

  test("turns Cmaj into a chip and drops B7 before it", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: "Chord progression input" });
    await input.fill("Cmaj");
    await input.press("Enter");

    const composer = page.getByTestId("chord-composer");
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(chips).toHaveText(["Cmaj"]);
    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    const firstChip = await chips.first().boundingBox();
    expect(firstChip).not.toBeNull();
    await dispatchNativeDrag(page, page.locator('[data-chord-name="B7"]'), composer, {
      clientX: firstChip!.x,
      clientY: firstChip!.y + firstChip!.height / 2,
    });
    await expect(chips).toHaveText(["B7", "Cmaj"]);
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["B7", "Cmaj"]);
  });

  test("commits clean composer removals immediately, including the last chord", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: "Chord progression input" });
    const run = page.getByRole("button", { name: "Run chord composer" });
    const cards = page.getByTestId("chord-card");

    await expect(run).toBeDisabled();

    await input.fill("C");
    await input.press("Enter");
    await run.click();
    await expect(cards).toHaveCount(1);
    await page.getByRole("button", { name: "C, position 1 of 1" }).focus();
    await page.getByRole("button", { name: "C, position 1 of 1" }).press("Delete");
    await expect(cards).toHaveCount(0);
    await expect(run).toBeDisabled();

    await input.fill("C");
    await input.press("Enter");
    await input.fill("G7");
    await input.press("Enter");
    await run.click();
    await expect(cards).toHaveCount(2);
    await page.getByRole("button", { name: "G7, position 2 of 2" }).focus();
    await page.getByRole("button", { name: "G7, position 2 of 2" }).press("Delete");
    await expect(cards.locator("h3")).toHaveText(["C"]);
    await page.getByRole("button", { name: "C, position 1 of 1" }).focus();
    await page.getByRole("button", { name: "C, position 1 of 1" }).press("Delete");
    await expect(cards).toHaveCount(0);
    await expect(run).toBeDisabled();

    await input.fill("Am");
    await input.press("Enter");
    await run.click();
    await expect(cards).toHaveCount(1);
    await page.getByRole("button", { name: "Am, position 1 of 1" }).focus();
    await page.getByRole("button", { name: "Am, position 1 of 1" }).press("Delete");
    await expect(cards).toHaveCount(0);
    await expect(run).toBeDisabled();
  });

  test("restores a cached guitar diagram after another variant fails", async ({ page }) => {
    await page.route("**/music_src/chords/c/major/var_2.svg", (route) => route.abort("failed"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: "Chord progression input" });
    await input.fill("C");
    await input.press("Enter");
    await page.getByRole("button", { name: "Run chord composer" }).click();

    const card = page.getByTestId("chord-card");
    const diagram = card.getByTestId("guitar-chord-diagram");
    await expect(diagram.locator("svg")).toHaveCount(1);

    await card.getByRole("button", { name: "Next guitar variant" }).click();
    await expect(diagram).toHaveText("No diagram");

    await card.getByRole("button", { name: "Previous guitar variant" }).click();
    await expect(diagram.locator("svg")).toHaveCount(1);
    await expect(diagram).not.toHaveText("No diagram");
  });

  test("ranks quick modifiers from the active key and mode", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "Dm7 G7 Cmaj7");
    const cards = page.getByTestId("chord-card");

    await cards.nth(0).getByRole("button", { name: "Modify Dm7" }).click();
    let modifier = page.getByRole("dialog", { name: "Modify Dm7 chord" });
    const dMinorQuick = modifier.getByLabel("Quick chord changes");
    await expect(dMinorQuick.getByRole("button").first()).toContainText(/\d+%/);
    await expect(dMinorQuick.getByRole("button").first()).toContainText("predominant function");
    await expect(dMinorQuick.getByRole("button").first()).toContainText(/chord tones in scale/);
    await page.keyboard.press("Escape");

    await cards.nth(1).getByRole("button", { name: "Modify G7" }).click();
    modifier = page.getByRole("dialog", { name: "Modify G7 chord" });
    const dominantQuick = modifier.getByLabel("Quick chord changes");
    await expect(dominantQuick).toContainText("dominant function");
    await expect(dominantQuick.getByRole("button", { name: /Change G7 to G(?:9|13|7b9|7#9)/ }).first()).toBeVisible();
  });

  test("plays the selected guitar shape with a plucked strum and retains piano parity", async ({ page }) => {
    await page.addInitScript(() => {
      interface AudioEvent {
        kind: "start" | "stop";
        midiFrequency: number;
        time: number;
        type: OscillatorType;
      }
      const log: AudioEvent[] = [];
      class MockParam {
        value = 0;
        setValueAtTime(value: number) { this.value = value; return this; }
        linearRampToValueAtTime(value: number) { this.value = value; return this; }
        exponentialRampToValueAtTime(value: number) { this.value = value; return this; }
      }
      class MockGain {
        gain = new MockParam();
        connect() { return this; }
        disconnect() { return undefined; }
      }
      class MockFilter {
        type: BiquadFilterType = "lowpass";
        frequency = new MockParam();
        Q = { value: 0 };
        connect() { return this; }
        disconnect() { return undefined; }
      }
      class MockOscillator {
        type: OscillatorType = "triangle";
        frequency = { value: 0 };
        connect() { return this; }
        disconnect() { return undefined; }
        start(time = 0) {
          log.push({ kind: "start", midiFrequency: this.frequency.value, time, type: this.type });
        }
        stop(time = 0) {
          log.push({ kind: "stop", midiFrequency: this.frequency.value, time, type: this.type });
        }
      }
      class MockAudioContext {
        state: AudioContextState = "running";
        currentTime = 0;
        destination = {};
        resume() { this.state = "running"; return Promise.resolve(); }
        createOscillator() { return new MockOscillator(); }
        createGain() { return new MockGain(); }
        createBiquadFilter() { return new MockFilter(); }
      }
      Object.defineProperty(window, "AudioContext", { configurable: true, value: MockAudioContext });
      Object.assign(window, { __hhAudioLog: log });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "C G7");
    const play = page.getByRole("button", { name: "Play progression" });
    await expect(play).toBeEnabled();
    await play.click();
    await expect(page.getByTestId("chord-card").first()).toHaveAttribute("data-playing", "true");
    const firstShape = await page.evaluate(() => (
      (window as Window & { __hhAudioLog: Array<{ kind: string; midiFrequency: number; time: number; type: string }> })
        .__hhAudioLog.filter((event) => event.kind === "start" && event.time < 1)
    ));
    expect(firstShape.length).toBeGreaterThan(2);
    expect(firstShape.every((event) => event.type === "sawtooth")).toBe(true);
    const guitarStartTimes = firstShape.map((event) => event.time);
    expect(new Set(guitarStartTimes).size).toBeGreaterThan(1);
    expect(Math.max(...guitarStartTimes) - Math.min(...guitarStartTimes)).toBeLessThanOrEqual(0.09);

    await page.getByRole("button", { name: "Stop playback" }).click();
    await page.getByTestId("chord-card").first().getByRole("button", { name: "Next guitar variant" }).click();
    await expect(play).toBeEnabled();
    await page.evaluate(() => {
      (window as Window & { __hhAudioLog: unknown[] }).__hhAudioLog.length = 0;
    });
    await play.click();
    const secondShape = await page.evaluate(() => (
      (window as Window & { __hhAudioLog: Array<{ kind: string; midiFrequency: number; time: number }> })
        .__hhAudioLog.filter((event) => event.kind === "start" && event.time < 1)
        .map((event) => event.midiFrequency)
    ));
    expect(secondShape).not.toEqual(firstShape.map((event) => event.midiFrequency));

    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await page.evaluate(() => {
      (window as Window & { __hhAudioLog: unknown[] }).__hhAudioLog.length = 0;
    });
    await page.getByRole("button", { name: "Play progression" }).click();
    const pianoStarts = await page.evaluate(() => (
      (window as Window & { __hhAudioLog: Array<{ kind: string; time: number; type: string }> })
        .__hhAudioLog.filter((event) => event.kind === "start" && event.time < 1)
    ));
    expect(pianoStarts.length).toBeGreaterThan(2);
    expect(pianoStarts.every((event) => event.type === "triangle" && event.time === 0)).toBe(true);
  });

  test("fits two, three, and four readable piano cards at the intended thresholds", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5 C6");
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await expect(page.getByTestId("piano-keyboard")).toHaveCount(8);
    expect(await firstRowCardCount(page)).toBe(2);

    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await firstRowCardCount(page)).toBe(3);
    await page.setViewportSize({ width: 1500, height: 900 });
    expect(await firstRowCardCount(page)).toBe(4);
    await expectNoDocumentOverflow(page);
  });

  test("shares one TUNE TOOLBOX context and hands supported and unsupported scales to HASHER", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(page.getByRole("heading", { name: "TUNE TOOLBOX" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Circle of Fifths/ }).first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first()).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first()).toHaveAttribute("aria-expanded", "false");

    const root = page.locator("#theory-root");
    const scale = page.locator("#theory-scale");
    const mood = page.locator("#theory-mood");
    await expect(root).toHaveValue("C");
    await expect(scale).toHaveValue("major");
    await expect(mood).toHaveValue("");
    await root.selectOption("D");
    await scale.selectOption("dorian");
    await page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first().click();
    const synth = page.getByTestId("scale-synthesia");
    await expect(synth).toBeVisible();
    await expect(synth).toContainText("D Dorian");

    await synth.getByRole("button", { name: "HASH it", exact: true }).click();
    await expect(page.getByRole("button", { name: "HASHER", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("combobox", { name: "HASHER key" })).toHaveValue("D");
    await expect(page.getByRole("combobox", { name: "HASHER mode" })).toHaveValue("dorian");

    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await root.selectOption("C");
    await page.waitForTimeout(100);
    expect(pageErrors).toEqual([]);
    await expect(scale).toBeVisible({ timeout: 3_000 });
    await scale.selectOption("whole_tone");
    await page.getByTestId("scale-synthesia")
      .getByRole("button", { name: "HASH it", exact: true })
      .click();
    await expect(page.getByRole("combobox", { name: "HASHER key" })).toHaveValue("C");
    await expect(page.getByRole("combobox", { name: "HASHER mode" })).toHaveValue("dorian");
    const unsupportedNotice = page.getByRole("status").filter({ hasText: "Whole Tone" });
    await expect(unsupportedNotice).toContainText("Whole Tone is not a HASHER preset mode");
    await expect(unsupportedNotice).toContainText("formula");
  });

  test("filters the shared scale selector by mood while retaining the current selection", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    const scale = page.locator("#theory-scale");
    const mood = page.locator("#theory-mood");

    await scale.selectOption("whole_tone");
    await mood.selectOption("bright");
    await expect(scale).toHaveValue("whole_tone");
    expect(await scale.locator("option").evaluateAll((options) => (
      options.map((option) => (option as HTMLOptionElement).value)
    ))).toEqual(["major", "lydian", "major_pentatonic", "major_blues", "whole_tone"]);

    await scale.selectOption("major");
    await expect(scale.locator('option[value="whole_tone"]')).toHaveCount(0);
    await mood.selectOption("");
    await expect(scale.locator("option")).toHaveCount(28);

    await page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first().click();
    const synth = page.getByTestId("scale-synthesia");
    await expect(synth).toHaveAttribute("aria-labelledby", "theory-tool-scales-heading");
    await expect(page.locator("#theory-tool-scales-heading")).toHaveText("SCALE SYNTHESIA");
  });

  test("opens Circle context in Improv without mutating an empty timeline and restores focus", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("chord-card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guitar", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await page.locator("#theory-root").selectOption("D");
    await page.locator("#theory-scale").selectOption("dorian");
    const trigger = page.locator("#circle-improv-trigger");
    await trigger.click();

    const insight = page.getByTestId("improv-insight");
    await expect(insight).toBeVisible();
    await expect(insight.getByTestId("improv-theory-context")).toContainText("Circle context: D Dorian");
    await expect(insight.getByRole("status")).toContainText("Add chords in HASHER");
    await expect(page.getByTestId("chord-card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toHaveAttribute("aria-pressed", "true");

    await insight.getByRole("button", { name: "Close IMPROV INSIGHT" }).click();
    await expect(page.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId("chord-card")).toHaveCount(0);
  });

  test("localizes the new destinations and Toolbox chrome in Japanese", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "JP", exact: true }).click();
    const nav = page.getByRole("navigation", { name: "ワークスペース" });
    await expect(nav.getByRole("button", { name: "ハッシャー", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "チューン・ツールボックス", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "フレット・ファインダー", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "チューン・ツールボックス", exact: true }).click();
    await expect(page.getByRole("heading", { name: "チューン・ツールボックス" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "五度圏" })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test("renders a bounded, semantic relationship network and cleaned-up FRET FINDER", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first().click();
    const network = page.getByTestId("note-neural-network");
    await expect(network).toBeVisible();
    await expect(network.getByRole("img", { name: "C relationship network" })).toBeVisible();
    await expect(network.getByRole("list", { name: "Network nodes" }).getByRole("listitem")).toHaveCount(18);
    await expect(network.getByLabel("Relationship strength legend")).toContainText("Strong relationship");
    const graph = network.getByTestId("mode-network-graph-scroller");
    await expect(graph).toHaveAttribute("data-graph-projection", "mobile-static");
    await expect(graph.locator("[data-network-node]")).toHaveCount(11);
    await expect(network.getByRole("group", { name: "Network viewport controls" })).toHaveCount(0);
    await expectNoDocumentOverflow(page);

    await page.getByRole("button", { name: "FRET FINDER", exact: true }).click();
    await expect(page.getByRole("heading", { name: "FRET FINDER" })).toBeVisible();
    await expect(page.getByTestId("fretboard-tuning-readout")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Fretboard tuning" })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
});

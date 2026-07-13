import { test, expect } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

/**
 * Decode the active piano keys' MIDI positions from the rendered DOM.
 * The piano keyboard places white keys at left = i * 30 and black keys at
 * fractional offsets within an octave (see src/components/PianoKeyboard.tsx).
 * Returns one entry per visible chord card, in document order.
 */
function decodePianoMidis(): Array<{ name: string; midis: number[] | null }> {
  const WHITE_MIDI: number[] = [];
  for (let oct = 3; oct <= 5; oct++) {
    for (const pc of [0, 2, 4, 5, 7, 9, 11]) {
      WHITE_MIDI.push(pc + (oct + 1) * 12);
    }
  }

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[class*="rounded-xl"]'))
    .filter((c) => c.querySelector("h3"));

  return cards.map((card) => {
    const name = card.querySelector("h3")?.textContent ?? "";
    const kbd = card.querySelector<HTMLElement>("div.relative.mx-auto");
    if (!kbd) return { name, midis: null };

    const active = Array.from(kbd.querySelectorAll<HTMLElement>("div")).filter((d) =>
      (d.className || "").includes("piano-key-active"),
    );

    const positions = active
      .map((d) => {
        const style = d.getAttribute("style") || "";
        const leftMatch = style.match(/left:\s*(\d+(?:\.\d+)?)px/);
        const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?)px/);
        const isBlack = !!widthMatch && parseFloat(widthMatch[1]) < 25;
        return {
          left: leftMatch ? parseFloat(leftMatch[1]) : NaN,
          isBlack,
        };
      })
      .sort((a, b) => a.left - b.left);

    const midis = positions
      .map((p) => {
        if (!p.isBlack) {
          const whiteIdx = Math.round(p.left / 30);
          return WHITE_MIDI[whiteIdx];
        }
        const total = p.left / 30;
        const octIdx = Math.floor(total / 7);
        const fracInOctave = total - octIdx * 7;
        let pc: number | null = null;
        if (Math.abs(fracInOctave - 0.65) < 0.2) pc = 1;
        else if (Math.abs(fracInOctave - 1.75) < 0.2) pc = 3;
        else if (Math.abs(fracInOctave - 3.6) < 0.2) pc = 6;
        else if (Math.abs(fracInOctave - 4.7) < 0.2) pc = 8;
        else if (Math.abs(fracInOctave - 5.8) < 0.2) pc = 10;
        return pc != null ? pc + (3 + octIdx + 1) * 12 : NaN;
      })
      .filter((m) => Number.isFinite(m))
      .sort((a, b) => a - b);

    return { name, midis };
  });
}

test.describe("Piano voice leading — visual + DOM regression", () => {
  test("ii-V-I in C major renders the v2 voice-led MIDI set (auto style)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/HARMONY HASH/);

    // Compose the canonical voice-leading test case from the v2 PR.
    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);

    // Switch to the piano view so the keyboards render.
    await page.getByRole("button", { name: "Piano" }).click();

    // Wait for all three cards' keyboards to mount before reading the DOM.
    await expect(page.locator("h3", { hasText: "Dm7" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "G7" })).toBeVisible();
    await expect(page.locator("h3", { hasText: "Cmaj7" })).toBeVisible();

    // Default style is "Auto" for every card — voice-leading still produces
    // the v2 voice-led MIDI set.
    const cards = await page.evaluate(decodePianoMidis);
    expect(cards).toEqual([
      { name: "Dm7", midis: [50, 53, 57, 60] },
      { name: "G7", midis: [50, 53, 55, 59] },
      { name: "Cmaj7", midis: [52, 55, 59, 60] },
    ]);

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });

  test("piano style selector applies Spread to every card and the keyboard widens", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
    await page.getByRole("button", { name: "Piano" }).click();

    await expect(page.locator("h3", { hasText: "Dm7" })).toBeVisible();

    // Click "Spread" on every card. Voice-led spread chain through ii-V-I:
    //   Dm7   → [D3, F4, A4, C5]     = [50, 65, 69, 72]
    //   G7    → [G3, B4, D5, F5]     = [55, 71, 74, 77]
    //   Cmaj7 → [C4, E5, G5, B5]     = [60, 76, 79, 83]   (engine bumps to oct 4
    //                                                       to stay close to G7's upper register)
    const spreadButtons = page.getByRole("button", { name: "Spread" });
    const count = await spreadButtons.count();
    for (let i = 0; i < count; i++) {
      await spreadButtons.nth(i).click();
    }

    await expect(page.locator("text=Spread").nth(count)).toBeVisible();

    const cards = await page.evaluate(decodePianoMidis);
    expect(cards).toEqual([
      { name: "Dm7", midis: [50, 65, 69, 72] },
      { name: "G7", midis: [55, 71, 74, 77] },
      { name: "Cmaj7", midis: [60, 76, 79, 83] },
    ]);
  });

  test("Play progression highlights the active chord card during playback", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
    await page.getByRole("button", { name: "Piano" }).click();
    await expect(page.locator("h3", { hasText: "Dm7" })).toBeVisible();

    // Before clicking Play, no card should carry the playing marker.
    expect(await page.locator('[data-playing="true"]').count()).toBe(0);
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(0);

    const play = page.getByRole("button", { name: "Play progression" });
    await expect(play).toBeVisible();
    await play.click();

    // The audio context's user-gesture lock may swallow the first
    // schedule; the visual marker is the real contract: at least one
    // chord card must be flagged playing within a beat.
    await expect(page.locator('[data-playing="true"]').first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(0);

    // Stop control becomes available while playing.
    await expect(page.getByRole("button", { name: "Stop playback" })).toBeVisible();
  });

  test("piano style selector applies Shell to a chord and re-voices the keyboard", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
    await page.getByRole("button", { name: "Piano" }).click();

    await expect(page.locator("h3", { hasText: "Dm7" })).toBeVisible();

    // Each piano card has a style toggle: Auto / Drop 2 / Drop 3 / Rootless / Shell.
    // Click "Shell" on every card and assert the resulting voicings match the
    // shell-only voice-led chain unit-tested in src/lib/harmonyBrain.test.ts:
    //   Dm7   → [F3, C4]   = [53, 60]
    //   G7    → [F3, B3]   = [53, 59]
    //   Cmaj7 → [E3, B3]   = [52, 59]
    const shellButtons = page.getByRole("button", { name: "Shell" });
    const count = await shellButtons.count();
    for (let i = 0; i < count; i++) {
      await shellButtons.nth(i).click();
    }

    // Wait for the "Shell" voicingType label to appear on each card as a
    // proxy for the re-render landing.
    await expect(page.locator("text=Shell").nth(count)).toBeVisible();

    const cards = await page.evaluate(decodePianoMidis);
    expect(cards).toEqual([
      { name: "Dm7", midis: [53, 60] },
      { name: "G7", midis: [53, 59] },
      { name: "Cmaj7", midis: [52, 59] },
    ]);
  });

  test("opens Hanz only after prompt help and restores focus on Escape", async ({ page }) => {
    let signedUrlRequests = 0;
    await page.route("**/api/voice/signed-url", async (route) => {
      signedUrlRequests += 1;
      await route.abort();
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    expect(signedUrlRequests).toBe(0);

    const prompt = page.getByRole("textbox", { name: "Describe the progression you want" });
    await prompt.fill("help me finish this progression");
    const help = page.getByRole("button", {
      name: /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/,
    });
    await help.focus();
    await help.press("Enter");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hanz, Help!" })).toBeVisible();
    expect(signedUrlRequests).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(signedUrlRequests).toBe(0);
  });
});

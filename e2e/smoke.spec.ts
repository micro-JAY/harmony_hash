import { test, expect } from "@playwright/test";

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
    await page.goto("/");
    await expect(page).toHaveTitle(/HARMONY HASH/);

    // Type the canonical voice-leading test case from the v2 PR.
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Dm7 G7 Cmaj7");
    await input.press("Enter");

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

    // Visual regression snapshot. Baseline lives in the spec's sibling
    // __screenshots__/ directory and is committed alongside the spec.
    await expect(page).toHaveScreenshot("voice-leading-piano-iiVI-c.png", {
      fullPage: true,
    });
  });

  test("piano style selector applies Shell to a chord and re-voices the keyboard", async ({ page }) => {
    await page.goto("/");

    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Dm7 G7 Cmaj7");
    await input.press("Enter");
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
});

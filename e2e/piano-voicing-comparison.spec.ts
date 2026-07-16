import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";
import { contrastRatio } from "./helpers/contrast";

async function openPianoComparison(page: Page, progression: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, progression);
  await page.getByRole("button", { name: "Piano" }).click();

  const card = page.getByTestId("chord-card").first();
  const displayName = await card.getByRole("heading").textContent();
  if (!displayName) throw new Error("Piano card must expose its chord name");
  const trigger = card.getByRole("button", { name: /Compare voicings/ });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `Compare ${displayName} piano voicings` });
  await expect(dialog).toBeVisible();
  return { card, dialog, trigger };
}

test.describe("piano voicing comparison", () => {
  test("compares every Cmaj7 shape and adopts one without changing the timeline", async ({
    page,
  }) => {
    const { card, dialog, trigger } = await openPianoComparison(page, "Cmaj7 G7");

    const options = dialog.getByTestId("voicing-comparison-option");
    await expect(options).toHaveCount(6);
    expect(await options.evaluateAll((items) => items.map((item) => item.getAttribute("data-style")))).toEqual([
      "drop2",
      "drop3",
      "rootless",
      "shell",
      "spread",
      "two-hand",
    ]);
    await expect(dialog.locator('[data-size="compact"][data-color-mode="interval"]')).toHaveCount(6);
    await expect(dialog.getByText("G3 · C4 · E4 · B4", { exact: true })).toBeVisible();

    const drop2 = dialog.locator('[data-style="drop2"]');
    const activeColors = await drop2.locator(".piano-key-active, .piano-key-active-lh").evaluateAll(
      (keys) => keys.map((key) => getComputedStyle(key).backgroundColor),
    );
    expect(new Set(activeColors).size).toBeGreaterThanOrEqual(4);

    const rootlessOption = dialog.getByRole("button", { name: "Use Rootless voicing for Cmaj7" });
    const describedBy = await rootlessOption.getAttribute("aria-describedby");
    if (!describedBy) throw new Error("Rootless option must describe its visible notes");
    await expect(dialog.locator(`[id="${describedBy}"]`)).toHaveText("E3 · G3 · B3");
    await rootlessOption.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(card.getByRole("button", { name: "Rootless", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      card.locator('[data-testid="piano-keyboard"][data-size="standard"]'),
    ).toHaveAttribute("data-active-midis", "52,55,59");
    await card.getByRole("button", { name: "Lock chord card" }).click();

    await expect(page.getByTestId("chord-card")).toHaveCount(2);
    await expect(card.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expect(page.getByTestId("chord-card").nth(1).getByRole("heading", { name: "G7" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Unlock chord card" })).toBeVisible();
  });

  test("limits a triad to its two applicable shapes", async ({ page }) => {
    const { dialog } = await openPianoComparison(page, "C");
    const options = dialog.getByTestId("voicing-comparison-option");

    await expect(options).toHaveCount(2);
    expect(await options.evaluateAll((items) => items.map((item) => item.getAttribute("data-style")))).toEqual([
      "spread",
      "two-hand",
    ]);
    await expect(dialog.getByText("2 shapes", { exact: true })).toBeVisible();
  });

  test("previews the exact voice-led shape adopted by a later chord", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "Cmaj7 G7");
    await page.getByRole("button", { name: "Piano" }).click();

    const cards = page.getByTestId("chord-card");
    await expect(cards).toHaveCount(2);
    const secondCard = cards.nth(1);
    await secondCard.getByRole("button", { name: "Compare voicings for G7" }).click();
    const dialog = page.getByRole("dialog", { name: "Compare G7 piano voicings" });
    const drop2Option = dialog.locator('[data-style="drop2"]');
    const previewMidis = await drop2Option
      .locator('[data-testid="piano-keyboard"]')
      .getAttribute("data-active-midis");
    if (!previewMidis) throw new Error("Drop 2 preview must expose its MIDI notes");

    await drop2Option.click();
    await expect(dialog).toBeHidden();
    await expect(secondCard.getByRole("button", { name: "Compare voicings for G7" })).toBeFocused();
    await expect(
      secondCard.locator('[data-testid="piano-keyboard"][data-size="standard"]'),
    ).toHaveAttribute("data-active-midis", previewMidis);
  });

  test("uses the contrast-safe dominant treatment in the dialog heading", async ({ page }) => {
    const { dialog } = await openPianoComparison(page, "G7");
    const familyTitle = dialog.locator('[data-chord-family="dominant"]');
    const colors = await familyTitle.evaluate((element) => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });

    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  test("omits styles that cannot fit a high extended chord", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "Cmaj7 B");
    const guitarCards = page.getByTestId("chord-card");
    await expect(guitarCards).toHaveCount(2);
    const secondGuitarCard = guitarCards.nth(1);
    await secondGuitarCard.getByRole("button", { name: "Modify B" }).click();
    await page
      .getByRole("button", { name: "Change B to Bmaj13", exact: true })
      .click();
    await expect(secondGuitarCard.getByRole("heading", { name: "Bmaj13" })).toBeVisible();
    await page.getByRole("button", { name: "Piano" }).click();

    const cards = page.getByTestId("chord-card");
    await expect(cards).toHaveCount(2);
    const secondCard = cards.nth(1);
    await expect(secondCard.getByRole("button", { name: "Spread", exact: true })).toHaveCount(0);
    await expect(secondCard.getByRole("button", { name: "Two-Hand", exact: true })).toHaveCount(0);
    await secondCard.getByRole("button", { name: "Compare voicings for Bmaj13" }).click();
    const dialog = page.getByRole("dialog", { name: "Compare Bmaj13 piano voicings" });
    await expect(dialog.locator('[data-style="spread"]')).toHaveCount(0);
    await expect(dialog.locator('[data-style="two-hand"]')).toHaveCount(0);
  });

  test("supports keyboard opening, option focus, and Escape focus restoration", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, "Cmaj7");
    await page.getByRole("button", { name: "Piano" }).click();

    const card = page.getByTestId("chord-card");
    const trigger = card.getByRole("button", { name: /Compare voicings/ });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Compare Cmaj7 piano voicings" });
    await expect(dialog.getByTestId("voicing-comparison-option").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("contains the dialog grid on desktop, tablet, and mobile with reduced motion", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 820, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      const { dialog } = await openPianoComparison(page, "Cmaj7");
      const grid = dialog.getByTestId("voicing-comparison-grid");
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width + 1);

      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);

      const gridWidths = await grid.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(gridWidths.scroll).toBeLessThanOrEqual(gridWidths.client);
      await expect(dialog).toHaveAttribute("data-reduced-motion", "true");
    }

    expect(consoleErrors).toEqual([]);
  });
});

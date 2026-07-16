import { expect, test } from "@playwright/test";
import { contrastRatio } from "./helpers/contrast";
import { composeProgression } from "./helpers/progression";

test.describe("responsive piano chord cards", () => {
  test("shows the complete three-octave keyboard inside equal cards", async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "Am(add9)", "F", "G"]);
    await page.getByRole("button", { name: "Piano", exact: true }).click();

    const cards = page.getByTestId("chord-card");
    const keyboards = cards.locator('[data-testid="piano-keyboard"][data-size="standard"]');
    await expect(cards).toHaveCount(4);
    await expect(keyboards).toHaveCount(4);

    for (const viewport of [
      { width: 1500, height: 900 },
      { width: 820, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);

      const geometry = await keyboards.evaluateAll((elements) => elements.map((element) => {
        const keyboard = element.getBoundingClientRect();
        const card = element.closest('[data-testid="chord-card"]')?.getBoundingClientRect();
        const keys = Array.from(element.querySelectorAll<HTMLElement>('[data-midi]'));
        const activeKeys = keys.filter((key) => key.className.includes("piano-key-active"));

        return {
          keyboardWidth: keyboard.width,
          whiteKeys: keys.filter((key) => key.dataset.keyKind === "white").length,
          blackKeys: keys.filter((key) => key.dataset.keyKind === "black").length,
          activeKeys: activeKeys.length,
          keyboardInsideCard: card
            ? keyboard.left >= card.left - 1 && keyboard.right <= card.right + 1
            : false,
          everyActiveKeyInsideKeyboard: activeKeys.every((key) => {
            const bounds = key.getBoundingClientRect();
            return bounds.left >= keyboard.left - 1 && bounds.right <= keyboard.right + 1;
          }),
        };
      }));

      for (const keyboard of geometry) {
        expect(keyboard.keyboardWidth).toBeGreaterThan(0);
        expect(keyboard.whiteKeys).toBe(21);
        expect(keyboard.blackKeys).toBe(15);
        expect(keyboard.activeKeys).toBeGreaterThan(0);
        expect(keyboard.keyboardInsideCard).toBe(true);
        expect(keyboard.everyActiveKeyInsideKeyboard).toBe(true);
      }

      const documentWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(documentWidths.scroll).toBeLessThanOrEqual(documentWidths.client);

      const cardHeights = await cards.evaluateAll((elements) => (
        elements.map((element) => element.getBoundingClientRect().height)
      ));
      expect(Math.max(...cardHeights) - Math.min(...cardHeights)).toBeLessThanOrEqual(1);

      const selectorLayout = await cards.getByTestId("piano-style-selector").evaluateAll(
        (selectors) => selectors.map((selector) => {
          const buttons = Array.from(selector.querySelectorAll<HTMLButtonElement>("button"));
          const rowTops = new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)));
          return {
            rows: rowTops.size,
            everyLabelVisible: buttons.every((button) => (
              button.scrollWidth <= button.clientWidth + 1
              && button.scrollHeight <= button.clientHeight + 1
            )),
          };
        }),
      );
      for (const selector of selectorLayout) {
        expect(selector.rows).toBeLessThanOrEqual(2);
        expect(selector.everyLabelVisible).toBe(true);
      }

      const inactiveStyle = cards.first().getByTestId("piano-style-selector")
        .locator('button[aria-pressed="false"]')
        .first();
      const inactiveColors = await inactiveStyle.evaluate((element) => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: getComputedStyle(element.parentElement!).backgroundColor };
      });
      expect(contrastRatio(inactiveColors.foreground, inactiveColors.background))
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

const HELP_LABEL = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

async function setHanzFocus(page: Page, index: number | null): Promise<void> {
  await page.evaluate((nextIndex) => {
    const testWindow = window as Window & {
      __hhSetHanzFocus?: (value: number | null) => void;
    };
    if (!testWindow.__hhSetHanzFocus) {
      throw new Error("Hanz focus test hook is unavailable");
    }
    testWindow.__hhSetHanzFocus(nextIndex);
  }, index);
}

test.describe("Chord card focus states", () => {
  test("keeps Hanz focus visible and contained from desktop through mobile", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7"]);
    await setHanzFocus(page, 1);

    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 768, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      const card = page.locator('[data-agent-highlighted="true"]');
      await expect(card).toBeVisible();
      await expect(page.getByRole("status", { name: "Hanz is focusing on Am7" })).toBeVisible();

      const bounds = await card.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
    }
  });

  test("keeps playback gold without introducing an agent state", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
    await page.getByRole("button", { name: "Piano" }).click();
    await page.getByRole("button", { name: "Play progression" }).click();

    const card = page.locator('[data-playing="true"]');
    await expect(card).toBeVisible();
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(0);
    await expect(page.getByText("Hanz focus", { exact: true })).toHaveCount(0);
    await expect(card).toHaveCSS("border-color", "rgba(212, 168, 67, 0.5)");
  });

  test("shows both cues when Hanz focus overlaps playback", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
    await page.getByRole("button", { name: "Piano" }).click();
    await page.getByRole("button", { name: "Play progression" }).click();
    const playingCard = page.locator('[data-playing="true"]');
    await expect(playingCard).toBeVisible();
    const playingIndex = await page.locator('[data-testid="chord-card"]').evaluateAll((cards) =>
      cards.findIndex((card) => card.getAttribute("data-playing") === "true"),
    );
    expect(playingIndex).toBeGreaterThanOrEqual(0);
    await setHanzFocus(page, playingIndex);

    const card = page.locator('[data-playing="true"][data-agent-highlighted="true"]');
    await expect(card).toBeVisible();
    await expect(page.getByText("Hanz focus", { exact: true })).toBeVisible();
    await expect(card).toHaveCSS("border-color", "rgba(212, 168, 67, 0.5)");

    const style = await card.getAttribute("style");
    expect(style).toContain("var(--glow-accent)");
    expect(style).toContain("inset 3px 0 0 var(--status-academy-text)");
  });

  test("clears Hanz focus when the popup closes or the user leaves the Hasher", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7"]);
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("help me understand the first chord");
    await page.getByRole("button", { name: HELP_LABEL }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();

    await setHanzFocus(page, 0);
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(0);

    await setHanzFocus(page, 1);
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Fret Finder", exact: true }).click();
    await page.getByRole("button", { name: "Hasher", exact: true }).click();
    await expect(page.locator('[data-agent-highlighted="true"]')).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

test.describe("composer and committed timeline continuity", () => {
  test("rebases a dirty draft when a card modifier changes the committed timeline", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "G7"]);

    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    const fCell = page.locator('[data-chord-name="F"]');
    await fCell.focus();
    await fCell.press("Enter");
    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(chips).toHaveText(["C", "G7", "F"]);

    const secondCard = page.getByTestId("chord-card").nth(1);
    await secondCard.getByRole("button", { name: "Modify G7" }).focus();
    await secondCard.getByRole("button", { name: "Modify G7" }).press("Enter");
    const altered = page
      .getByRole("dialog", { name: "Modify G7 chord" })
      .getByRole("button", { name: "Change G7 to G7#9" });
    await altered.focus();
    await altered.press("Enter");

    const notice = page.getByRole("status").filter({
      hasText: "Composer synced to the latest timeline; your uncommitted grid changes were replaced.",
    });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute("aria-live", "polite");
    await expect(chips).toHaveText(["C", "G7#9"]);

    await page.getByRole("button", { name: "Am", exact: true }).click();
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText([
      "C",
      "G7#9",
      "Am",
    ]);
  });

  test("extends a preset from its committed chords instead of replacing it", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Jazz & R&B Fundamentals" }).click();
    await page.getByRole("button", { name: "The 2-5-1 (The King): ii – V – I" }).click();

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    await expect(composer.locator("[data-composer-chip-index]")).toHaveText(["Dm", "G", "C"]);

    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    await page.getByRole("button", { name: "Am", exact: true }).click();
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText([
      "Dm",
      "G",
      "C",
      "Am",
    ]);
  });

  test("restores committed chords after leaving and returning to the HASHER", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);

    await page.getByRole("button", { name: "FRET FINDER" }).click();
    await page.getByRole("button", { name: "HASHER" }).click();

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    await expect(composer.locator("[data-composer-chip-index]")).toHaveText([
      "Cmaj7",
      "Am7",
      "Dm7",
      "G7",
    ]);
    const dm = composer.getByRole("button", { name: "Dm7, position 3 of 4" });
    await dm.focus();
    await dm.press("Delete");
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText([
      "Cmaj7",
      "Am7",
      "G7",
    ]);
  });
});

test.describe("375px composer continuity", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("keeps rebase feedback inside the mobile viewport", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "G7"]);
    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    await page.locator('[data-chord-name="F"]').click();

    const secondCard = page.getByTestId("chord-card").nth(1);
    await secondCard.getByRole("button", { name: "Modify G7" }).click();
    await page
      .getByRole("dialog", { name: "Modify G7 chord" })
      .getByRole("button", { name: "Change G7 to G7#9" })
      .click();

    const notice = page.getByText(
      "Composer synced to the latest timeline; your uncommitted grid changes were replaced.",
      { exact: true },
    );
    await expect(notice).toBeVisible();
    const noticeBox = await notice.boundingBox();
    expect(noticeBox).not.toBeNull();
    expect(noticeBox!.x).toBeGreaterThanOrEqual(0);
    expect(noticeBox!.x + noticeBox!.width).toBeLessThanOrEqual(375);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

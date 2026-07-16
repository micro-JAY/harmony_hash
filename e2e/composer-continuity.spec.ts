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
    await page.getByRole("group", { name: "Preset collection" })
      .getByRole("button", { name: "Major", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The 2-5-1 (The King): ii – V – I" })
      .click();

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

  test("reveals one selected X and removes through pointer or keyboard input", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Dm7", "G7"]);

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(composer.getByRole("button", { name: /Remove / })).toHaveCount(0);
    await expect(composer.locator(".hh-timeline-chip__handle")).toHaveCount(0);

    const dm = composer.getByRole("button", { name: "Dm7, position 2 of 3" });
    await dm.click();
    const removeDm = composer.getByRole("button", { name: "Remove Dm7 at position 2" });
    await expect(removeDm).toBeVisible();
    await removeDm.click();
    await expect(chips).toHaveText(["Cmaj7", "G7"]);
    await expect(page.getByRole("status").filter({
      hasText: "Dm7 removed from the progression.",
    })).toBeVisible();

    const g = composer.getByRole("button", { name: "G7, position 2 of 2" });
    await g.focus();
    await g.press("Delete");
    await expect(chips).toHaveText(["Cmaj7"]);

    const input = page.getByRole("textbox", { name: "Chord progression input" });
    await input.focus();
    await input.press("Backspace");
    await expect(chips).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test("removes a dragged chord only through the temporary outside target", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "F", "G"]);

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(chips).toHaveCount(3);

    const firstTransfer = await page.evaluateHandle(() => new DataTransfer());
    await chips.nth(0).dispatchEvent("dragstart", { dataTransfer: firstTransfer });
    const removeTarget = page.getByTestId("composer-remove-target");
    await expect(removeTarget).toBeVisible();
    await removeTarget.dispatchEvent("dragover", { dataTransfer: firstTransfer });
    await expect(removeTarget).toHaveAttribute("data-drop-active", "true");
    await removeTarget.dispatchEvent("drop", { dataTransfer: firstTransfer });
    await expect(chips).toHaveText(["F", "G"]);
    await expect(removeTarget).toHaveCount(0);

    const cancelledTransfer = await page.evaluateHandle(() => new DataTransfer());
    await chips.nth(0).dispatchEvent("dragstart", { dataTransfer: cancelledTransfer });
    await expect(removeTarget).toBeVisible();
    await chips.nth(0).dispatchEvent("dragend", { dataTransfer: cancelledTransfer });
    await expect(removeTarget).toHaveCount(0);
    await expect(chips).toHaveText(["F", "G"]);
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

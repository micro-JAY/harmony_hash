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
    const cards = page.getByTestId("chord-card");
    await cards.nth(2).getByRole("button", { name: "Lock chord card" }).click();

    const dm = composer.getByRole("button", { name: "Dm7, position 2 of 3" });
    await dm.click();
    const removeDm = composer.getByRole("button", { name: "Remove Dm7 at position 2" });
    await expect(removeDm).toBeVisible();
    await removeDm.click();
    await expect(chips).toHaveText(["Cmaj7", "G7"]);
    await expect(cards.locator("h3")).toHaveText(["Cmaj7", "G7"]);
    await expect(cards.nth(1).getByRole("button", { name: "Unlock chord card" })).toBeVisible();
    await expect(page.getByRole("status").filter({
      hasText: "Dm7 removed from the progression.",
    })).toBeVisible();

    const g = composer.getByRole("button", { name: "G7, position 2 of 2" });
    await g.focus();
    await g.press("Delete");
    await expect(chips).toHaveText(["Cmaj7"]);
    await expect(cards.locator("h3")).toHaveText(["Cmaj7"]);

    const input = page.getByRole("textbox", { name: "Chord progression input" });
    await input.focus();
    await input.press("Backspace");
    await expect(chips).toHaveCount(0);
    await expect(page.getByTestId("chord-card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Run chord composer" })).toBeDisabled();
    await expect(input).toBeFocused();
  });

  test("clears stale preset selection after a committed or mixed composer edit", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const presetTrigger = page.getByRole("group", { name: "Preset collection" })
      .getByRole("button", { name: "Major", exact: true });
    await presetTrigger.click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The 2-5-1 (The King): ii – V – I" })
      .click();
    await expect(presetTrigger).toHaveAttribute("aria-pressed", "true");

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    await composer.getByRole("button", { name: "Dm, position 1 of 3" }).press("Delete");
    await expect(presetTrigger).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["G", "C"]);

    await page.getByRole("combobox", { name: "HASHER key" }).selectOption("D");
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["G", "C"]);

    await presetTrigger.click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The 2-5-1 (The King): ii – V – I" })
      .click();
    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    await page.getByRole("button", { name: "Em", exact: true }).click();
    await expect(presetTrigger).toHaveAttribute("aria-pressed", "false");
    await composer.getByRole("button", { name: "A, position 2 of 4" }).press("Delete");

    // A draft that mixes committed IDs with a new chord stays staged as one
    // coherent transaction until Run; it must not partially update the cards.
    await expect(composer.locator("[data-composer-chip-index]")).toHaveText(["Em", "D", "Em"]);
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Em", "A", "D"]);
    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Em", "D", "Em"]);
  });

  test("consumes Alt arrow shortcuts at timeline boundaries without mutating", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "G7"]);
    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const chips = composer.locator("[data-composer-chip-index]");

    const leftWasCancelled = await chips.first().evaluate((element) => !element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ));
    expect(leftWasCancelled).toBe(true);
    await expect(chips).toHaveText(["C", "G7"]);

    const rightWasCancelled = await chips.last().evaluate((element) => !element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ));
    expect(rightWasCancelled).toBe(true);
    await expect(chips).toHaveText(["C", "G7"]);
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["C", "G7"]);
  });

  test("tracks and shows every drag insertion boundary including the trailing edge", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "G7"]);
    await page.getByRole("button", { name: "Browse chords ↓" }).click();

    const composer = page.getByTestId("chord-composer");
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(chips.first()).toHaveAttribute("data-insertion-active", "false");
    await expect(page.getByTestId("composer-trailing-boundary"))
      .toHaveAttribute("data-insertion-active", "false");
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    const source = page.locator('[data-chord-name="F"]');
    await source.dispatchEvent("dragstart", { dataTransfer: transfer });

    const first = await chips.first().boundingBox();
    expect(first).not.toBeNull();
    await composer.dispatchEvent("dragover", {
      dataTransfer: transfer,
      clientX: first!.x + 1,
      clientY: first!.y + first!.height / 2,
    });
    await expect(composer).toHaveAttribute("data-insertion-boundary", "0");
    await expect(chips.first()).toHaveAttribute("data-insertion-active", "true");

    const trailing = page.getByTestId("composer-trailing-boundary");
    const trailingBox = await trailing.boundingBox();
    expect(trailingBox).not.toBeNull();
    await composer.dispatchEvent("dragover", {
      dataTransfer: transfer,
      clientX: trailingBox!.x + trailingBox!.width - 1,
      clientY: trailingBox!.y + trailingBox!.height / 2,
    });
    await expect(composer).toHaveAttribute("data-insertion-boundary", "2");
    await expect(trailing).toHaveAttribute("data-insertion-active", "true");
    await composer.dispatchEvent("drop", {
      dataTransfer: transfer,
      clientX: trailingBox!.x + trailingBox!.width - 1,
      clientY: trailingBox!.y + trailingBox!.height / 2,
    });
    await source.dispatchEvent("dragend", { dataTransfer: transfer });
    await expect(chips).toHaveText(["C", "G7", "F"]);
  });

  test("removes only an existing chip on an actual native drop outside the composer", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "F", "G"]);

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const chips = composer.locator("[data-composer-chip-index]");
    await expect(chips).toHaveCount(3);

    const outsideTarget = page.getByRole("heading", { name: "Build your own" });
    await chips.nth(0).dragTo(outsideTarget);
    await expect(chips).toHaveText(["F", "G"]);
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["F", "G"]);
    await expect(chips.nth(0)).toBeFocused();
    await expect(page.locator('.sr-only[role="status"]')).toContainText(
      "C removed from the progression",
    );

    const noDropTransfer = await page.evaluateHandle(() => new DataTransfer());
    await chips.nth(0).dispatchEvent("dragstart", { dataTransfer: noDropTransfer });
    await chips.nth(0).dispatchEvent("dragend", { dataTransfer: noDropTransfer });
    await expect(chips).toHaveText(["F", "G"]);

    const detachedTransfer = await page.evaluateHandle(() => new DataTransfer());
    await chips.nth(0).dispatchEvent("dragstart", { dataTransfer: detachedTransfer });
    await composer.getByRole("button", { name: "Remove F at position 1" }).click();
    await expect(chips).toHaveText(["G"]);
    await page.evaluate(() => {
      const target = document.querySelector<HTMLElement>("#hasher-compose-title");
      if (!target) throw new Error("Build your own heading is unavailable");
      target.addEventListener("drop", () => {
        (window as Window & { __hhDetachedDropReachedTarget?: boolean })
          .__hhDetachedDropReachedTarget = true;
      }, { once: true });
    });
    const detachedBounds = await outsideTarget.boundingBox();
    expect(detachedBounds).not.toBeNull();
    await outsideTarget.dispatchEvent("dragover", {
      dataTransfer: detachedTransfer,
      clientX: detachedBounds!.x + 4,
      clientY: detachedBounds!.y + 4,
    });
    await outsideTarget.dispatchEvent("drop", {
      dataTransfer: detachedTransfer,
      clientX: detachedBounds!.x + 4,
      clientY: detachedBounds!.y + 4,
    });
    expect(await page.evaluate(() => (
      window as Window & { __hhDetachedDropReachedTarget?: boolean }
    ).__hhDetachedDropReachedTarget)).toBe(true);
    await expect(chips).toHaveText(["G"]);

    const cancelledTransfer = await page.evaluateHandle(() => new DataTransfer());
    await chips.nth(0).dispatchEvent("dragstart", { dataTransfer: cancelledTransfer });
    await page.keyboard.press("Escape");
    await chips.nth(0).dispatchEvent("dragend", { dataTransfer: cancelledTransfer });
    await expect(chips).toHaveText(["G"]);

    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    const externalTransfer = await page.evaluateHandle(() => new DataTransfer());
    const externalChord = page.locator('[data-chord-name="Am"]');
    const outsideBounds = await outsideTarget.boundingBox();
    expect(outsideBounds).not.toBeNull();
    await externalChord.dispatchEvent("dragstart", { dataTransfer: externalTransfer });
    await outsideTarget.dispatchEvent("dragover", {
      dataTransfer: externalTransfer,
      clientX: outsideBounds!.x + 4,
      clientY: outsideBounds!.y + 4,
    });
    await outsideTarget.dispatchEvent("drop", {
      dataTransfer: externalTransfer,
      clientX: outsideBounds!.x + 4,
      clientY: outsideBounds!.y + 4,
    });
    await externalChord.dispatchEvent("dragend", { dataTransfer: externalTransfer });
    await expect(chips).toHaveText(["G"]);
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

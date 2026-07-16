import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "./helpers/contrast";
import { composeProgression } from "./helpers/progression";

async function enterProgression(page: Page, progression: string): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, progression);
  await expect(page.getByTestId("chord-card")).toHaveCount(progression.split(" ").length);
}

test.describe("quick chord modifiers", () => {
  // The first preview navigation can be cold on the external macOS volume;
  // keep the global suite strict while giving this focused group startup room.
  test.describe.configure({ timeout: 60_000 });

  test("changes one guitar chord while preserving lock and clamping its variant", async ({
    page,
  }) => {
    await enterProgression(page, "C G7 Am F");
    const cards = page.getByTestId("chord-card");
    const firstCard = cards.nth(0);

    await firstCard.getByRole("button", { name: "Lock chord card" }).click();
    await firstCard.getByRole("button", { name: "Intervals" }).click();
    await expect(firstCard.getByRole("button", { name: "Intervals" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (let click = 0; click < 4; click += 1) {
      await firstCard.getByRole("button", { name: "Next guitar variant" }).click();
    }
    await expect(firstCard.getByText("5 / 5", { exact: true })).toBeVisible();

    const trigger = firstCard.getByRole("button", { name: "Modify C" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.click();
    let dialog = page.getByRole("dialog", { name: "Modify C chord" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Change C to Cadd9" }).click();
    await expect(firstCard.getByRole("heading", { name: "Cadd9" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Unlock chord card" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Intervals" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await firstCard.getByRole("button", { name: "Modify Cadd9" }).click();
    dialog = page.getByRole("dialog", { name: "Modify Cadd9 chord" });
    await dialog
      .getByRole("button", { name: "Change Cadd9 to Cmaj13", exact: true })
      .click();
    await expect(firstCard.getByRole("heading", { name: "Cmaj13" })).toBeVisible();
    await expect(firstCard.getByText("1 / 3", { exact: true })).toBeVisible();

    await expect(cards.nth(1).getByRole("heading", { name: "G7" })).toBeVisible();
    await expect(cards.nth(2).getByRole("heading", { name: "Am" })).toBeVisible();
    await expect(cards.nth(3).getByRole("heading", { name: "F" })).toBeVisible();
  });

  test("supports keyboard search, Escape focus restoration, and dominant alterations", async ({
    page,
  }) => {
    await enterProgression(page, "G7");
    const card = page.getByTestId("chord-card");
    const trigger = card.getByRole("button", { name: "Modify G7" });

    await trigger.focus();
    await trigger.press("Enter");
    let dialog = page.getByRole("dialog", { name: "Modify G7 chord" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Modify G7 chord" })
        .locator('[data-chord-family="dominant"]'),
    ).toHaveAttribute("style", /--music-chord-dominant/);
    const topPicks = dialog.getByRole("region", { name: "Top picks" });
    await expect(topPicks).toBeVisible();
    const firstPick = topPicks.getByRole("button").first();
    await expect(firstPick).toContainText(/\d+%/);
    await expect(firstPick.locator("strong").last()).toHaveAttribute(
      "style",
      /--music-match-/,
    );
    const reasonColors = await firstPick.locator("span[id*='-fit-']").evaluate((element) => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: getComputedStyle(element.parentElement!).backgroundColor };
    });
    expect(contrastRatio(reasonColors.foreground, reasonColors.background)).toBeGreaterThanOrEqual(4.5);
    const search = dialog.getByRole("searchbox", { name: "Search G chord alternatives" });
    await expect(search).toBeFocused();
    await search.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(card.getByRole("heading", { name: "G7" })).toBeVisible();

    await trigger.press("Enter");
    dialog = page.getByRole("dialog", { name: "Modify G7 chord" });
    await search.fill("#9");
    const altered = dialog
      .getByLabel("All chord alternatives")
      .getByRole("button", { name: "Change G7 to G7#9" });
    await expect(altered).toBeVisible();
    await altered.focus();
    await altered.press("Enter");
    await expect(card.getByRole("heading", { name: "G7#9" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Modify G7#9", exact: true })).toBeFocused();
  });

  test("resets an incompatible piano style and keeps the replacement across instruments", async ({
    page,
  }) => {
    await enterProgression(page, "Cmaj7 G7");
    await page.getByRole("button", { name: "Piano" }).click();
    const firstCard = page.getByTestId("chord-card").nth(0);

    await firstCard.getByRole("button", { name: "Shell" }).click();
    await expect(firstCard.getByRole("button", { name: "Shell" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(firstCard.getByRole("button", { name: "Fingering" })).toHaveCount(0);

    await firstCard.getByRole("button", { name: "Modify Cmaj7" }).click();
    await page.getByRole("dialog", { name: "Modify Cmaj7 chord" })
      .getByRole("button", { name: "Change Cmaj7 to C6", exact: true })
      .click();
    await expect(firstCard.getByRole("heading", { name: "C6" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(firstCard.getByText("C – E – G – A", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Guitar" }).click();
    await expect(firstCard.getByRole("heading", { name: "C6" })).toBeVisible();
  });

  test("contains the open modifier at a 375px mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await enterProgression(page, "C G7");
    const firstCard = page.getByTestId("chord-card").nth(0);
    await firstCard.getByRole("button", { name: "Modify C" }).click();

    const dialog = page.getByRole("dialog", { name: "Modify C chord" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/hh-panel/);
    await expect(
      dialog.getByRole("button", { name: "Change C to Cmaj7", exact: true }),
    ).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

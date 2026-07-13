import { expect, test, type Page } from "@playwright/test";
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

    await firstCard.getByRole("button", { name: "Modify C" }).click();
    await firstCard.getByRole("button", { name: "Change C to Cadd9" }).click();
    await expect(firstCard.getByRole("heading", { name: "Cadd9" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Unlock chord card" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Intervals" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await firstCard.getByRole("button", { name: "Modify Cadd9" }).click();
    await firstCard
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
    const search = card.getByRole("searchbox", { name: "Search G chord alternatives" });
    await expect(search).toBeFocused();
    await search.press("Escape");
    await expect(card.getByRole("region", { name: "Modify G7 chord" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(card.getByRole("heading", { name: "G7" })).toBeVisible();

    await trigger.press("Enter");
    await search.fill("#9");
    const altered = card
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
    await firstCard.getByRole("button", { name: "Fingering" }).click();
    await expect(firstCard.getByRole("button", { name: "Shell" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await firstCard.getByRole("button", { name: "Modify Cmaj7" }).click();
    await firstCard
      .getByRole("button", { name: "Change Cmaj7 to C6", exact: true })
      .click();
    await expect(firstCard.getByRole("heading", { name: "C6" })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(firstCard.getByRole("button", { name: "Fingering" })).toHaveAttribute(
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

    await expect(firstCard.getByRole("region", { name: "Modify C chord" })).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: "Change C to Cmaj7", exact: true }),
    ).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

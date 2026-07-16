import { expect, test } from "@playwright/test";

test.describe("progression preset library", () => {
  test("drops a named major preset into the timeline in the selected key", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const keySelector = page.getByRole("combobox", { name: "HASHER key" });
    await keySelector.selectOption("D");
    await page.getByRole("group", { name: "Preset collection" })
      .getByRole("button", { name: "Major", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The Plagal Loop: I – IV – I – V" })
      .click();

    const cards = page.getByTestId("chord-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.locator("h3")).toHaveText(["D", "G", "D", "A"]);
  });

  test("renders the named ii-V-I reference on guitar and piano", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("group", { name: "Preset collection" })
      .getByRole("button", { name: "Major", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The 2-5-1 (The King): ii – V – I" })
      .click();

    const cards = page.getByTestId("chord-card");
    await expect(cards.locator("h3")).toHaveText(["Dm", "G", "C"]);
    await expect(cards.getByTestId("guitar-chord-diagram")).toHaveCount(3);
    await expect(cards.getByTestId("guitar-chord-diagram").locator("svg")).toHaveCount(3);
    await page.getByRole("button", { name: "Piano" }).click();
    await expect(cards).toHaveCount(3);
    await expect(cards.getByTestId("piano-keyboard")).toHaveCount(3);
    await expect(cards.getByTestId("piano-keyboard").first().locator(".piano-key-active")).not.toHaveCount(0);
  });
});

import { expect, test, type Locator, type Page } from "@playwright/test";

async function verticalCenter(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected visible layout target");
  return box.y + box.height / 2;
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test("puts Describe and Build before browser-scoped context and presets", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const describe = page.getByRole("heading", { name: "Describe a progression or mood" });
  const build = page.getByRole("heading", { name: "Build your own" });
  const browse = page.getByRole("button", { name: "Browse chords ↓", exact: true });
  const presets = page.getByRole("heading", { name: "Choose from a preset" });
  expect(await verticalCenter(describe)).toBeLessThan(await verticalCenter(build));
  expect(await verticalCenter(build)).toBeLessThan(await verticalCenter(browse));
  expect(await verticalCenter(browse)).toBeLessThan(await verticalCenter(presets));

  const contextRail = page.getByTestId("hasher-browser-context-rail");
  await expect(contextRail.getByLabel("Hasher key")).toBeVisible();
  await expect(contextRail.getByLabel("Hasher mode")).toBeVisible();
  await expect(contextRail.getByRole("group", { name: "Instrument" })).toBeVisible();

  const major = page.getByRole("button", { name: "Major", exact: true });
  await major.click();
  await page.getByRole("dialog", { name: "Major presets" })
    .locator(".hh-preset-dialog__option")
    .first()
    .click();
  await expect(major).toHaveAttribute("aria-pressed", "true");

  await browse.click();
  await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
  await expect(page.getByTestId("hasher-preset-section")).toHaveCount(0);
  await expect(page.getByTestId("hasher-preset-separator")).toHaveCount(0);
  await page.getByRole("button", { name: "Hide grid ↑", exact: true }).click();
  await expect(page.getByTestId("hasher-preset-section")).toBeVisible();
  await expect(major).toHaveAttribute("aria-pressed", "true");
});

test.describe("375px compact browser context", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("keeps Key, Mode, and instrument aligned without overflow in English and Japanese", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const rail = page.getByTestId("hasher-browser-context-rail");
    const bounds = await rail.evaluate((element) => {
      const railBox = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll("select, button")).map((control) => {
        const box = control.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, railBottom: railBox.bottom };
      });
    });
    for (const bound of bounds) {
      expect(bound.left).toBeGreaterThanOrEqual(0);
      expect(bound.right).toBeLessThanOrEqual(375);
      expect(bound.bottom).toBeLessThanOrEqual(bound.railBottom + 1);
    }
    await expectNoDocumentOverflow(page);

    await page.getByRole("button", { name: "Switch language to Japanese" }).click();
    await expect(page.getByRole("heading", { name: "コード進行や雰囲気を説明する" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "自分で組み立てる" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "プリセットから選ぶ" })).toBeVisible();
    await page.getByRole("button", { name: "コードを探す ↓", exact: true }).click();
    await expect(page.getByRole("heading", { name: "プリセットから選ぶ" })).toHaveCount(0);
    await expectNoDocumentOverflow(page);
  });
});

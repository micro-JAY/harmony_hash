import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("first visit explains the three spaces, persists explicit dismissal, and reopens from Help", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Find your harmony faster" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Hasher" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Tune Toolbox" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Fret Finder" })).toBeVisible();
  await expect(dialog).toContainText("guitar and piano");
  await expect(dialog).toContainText("Play");
  await expect(dialog).toContainText("send a scale back");

  await dialog.getByRole("button", { name: "Start hashing" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem("hh:onboarding:v1:dismissed")
  ))).toBe("true");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(dialog).toBeHidden();
  const help = page.getByRole("button", { name: "Help / About" });
  await help.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
});

test("blocked storage remains usable and dismissal lasts for the page session", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function blockedOnboardingRead(key: string) {
      if (key.startsWith("hh:onboarding:")) throw new Error("onboarding storage blocked");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function blockedOnboardingWrite(key: string, value: string) {
      if (key.startsWith("hh:onboarding:")) throw new Error("onboarding storage blocked");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Find your harmony faster" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Start hashing" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Help / About" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Harmony Hash introduction" }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("onboarding is contained in a short mobile viewport and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 430 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "Find your harmony faster" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-reduced-motion", "true");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(430);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 375);
});

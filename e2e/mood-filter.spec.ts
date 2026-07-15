import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

function collectPageIssues(page: Page): string[] {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") issues.push(message.text());
  });
  page.on("pageerror", (error) => issues.push(error.message));
  return issues;
}

async function openToolbox(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
}

test.describe("Theory mood lens separation", () => {
  test("removes every HASHER mood path while preserving chord suggestions", async ({ page }) => {
    const issues = collectPageIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mood-filter")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /Mood/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Browse chords ↓" }).click();
    await page.getByRole("button", { name: "Key chord suggestions" }).click();
    await expect(page.locator('[data-chord-name="C"]')).toHaveAttribute("data-fit-score", "100");

    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(page.getByTestId("mood-filter")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /Mood/ })).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test("keeps Theory mood shared and does not mutate the HASHER timeline", async ({ page }) => {
    const issues = collectPageIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cm7", "Fm7"]);
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    const mood = page.locator("#theory-mood");
    await expect(mood).toHaveValue("");
    await mood.selectOption("dark");
    await expect(page.getByRole("status").filter({ hasText: "Dark" }).first()).toBeVisible();

    const scaleDisclosure = page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first();
    await scaleDisclosure.click();
    await expect(page.getByRole("status").filter({ hasText: "Dark lens" })).toContainText("5 matching scales");
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Cm7", "Fm7"]);
    await expect(page.getByTestId("mood-filter")).toHaveCount(0);
    await page.getByRole("button", { name: "IMPROV INSIGHT" }).click();
    await expect(page.getByTestId("improv-insight")).toHaveAttribute("data-mood-id", "none");
    await expect(page.getByTestId("improv-mood-summary")).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test.describe("375px mobile and reduced motion", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("keeps the required Theory mood control contained and keyboard reachable", async ({ page }) => {
      const issues = collectPageIssues(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openToolbox(page);
      const mood = page.locator("#theory-mood");
      await mood.focus();
      await expect(mood).toBeFocused();
      await mood.selectOption("film_noir");
      await expect(mood).toHaveValue("film_noir");
      await expect(page.getByTestId("theory-workspace")).toBeVisible();

      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      expect(issues).toEqual([]);
    });
  });
});

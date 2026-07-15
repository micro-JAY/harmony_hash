import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

interface BrowserIssue {
  type: "console" | "pageerror";
  text: string;
}

function collectBrowserIssues(page: Page): BrowserIssue[] {
  const issues: BrowserIssue[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      issues.push({ type: "console", text: message.text() });
    }
  });
  page.on("pageerror", (error) => issues.push({ type: "pageerror", text: error.message }));
  return issues;
}

async function openScales(
  page: Page,
  context: { root?: string; scale?: string } = {},
): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
  if (context.root) await page.locator("#theory-root").selectOption(context.root);
  if (context.scale) await page.locator("#theory-scale").selectOption(context.scale);
  const disclosure = page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first();
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click();
  await expect(page.getByTestId("scale-synthesia")).toBeVisible();
}

test.describe("SCALE SYNTHESIA in TUNE TOOLBOX", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders the complete F-sharp harmonic-minor learning map from shared context", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openScales(page, { root: "F#", scale: "harmonic_minor" });

    await expect(page.getByRole("region", { name: "F# Harmonic Minor piano practice map" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Scale notes" }).getByRole("listitem")).toHaveCount(8);
    await expect(page.getByRole("list", { name: "Whole and half step formula" }).getByRole("listitem"))
      .toHaveText(["W", "H", "W", "W", "H", "1½", "H"]);
    await expect(page.getByRole("list", { name: "Named scale degrees" })).toContainText("Raised seventh");
    await expect(page.getByText("Hava Nagila — traditional", { exact: true })).toBeVisible();
    await expect(page.getByTestId("scale-piano-keyboard")).toHaveAttribute(
      "aria-label",
      /F#, degree 1; G#, degree 2; A, degree 3; B, degree 4; C#, degree 5; D, degree 6; E#, degree 7/,
    );
    const degreeColors = await page.locator('[data-scale-degree]:not([data-scale-degree=""])')
      .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
    expect(new Set(degreeColors).size).toBeGreaterThanOrEqual(7);
    await expect(page.getByTestId("scale-synthesia")).toHaveScreenshot("scale-synthesia-desktop.png");
    expect(issues).toEqual([]);
  });

  test("keeps Mood explicit, defaults to Any, and preserves an out-of-lens selection", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openScales(page, { root: "F#", scale: "lydian" });
    const mood = page.locator("#theory-mood");
    await expect(mood).toHaveValue("");
    await expect(page.getByText("F# Lydian · Ascending", { exact: true })).toBeVisible();

    await mood.selectOption("dark");
    const status = page.getByRole("status").filter({ hasText: "Dark lens" });
    await expect(status).toContainText("showing 5 matching scales");
    await expect(status).toContainText("Current selection remains available for comparison.");
    await expect(page.locator("#theory-scale")).toHaveValue("lydian");
    await expect(page.getByText("F# Lydian · Ascending", { exact: true })).toBeVisible();

    await page.locator("#theory-scale").selectOption("phrygian");
    await expect(page.getByText("F# Phrygian · Ascending", { exact: true })).toBeVisible();
    await expect(status).not.toContainText("Current selection remains available for comparison.");
    expect(issues).toEqual([]);
  });

  test("supports guitar arpeggio playback and stops immediately when collapsed", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openScales(page, { root: "F#", scale: "harmonic_minor" });
    await page.getByRole("button", { name: "Guitar", exact: true }).click();
    const board = page.getByRole("region", { name: "Right-handed guitar fretboard in Standard tuning" });
    await expect(board).toBeVisible();
    await expect(board.getByRole("button", { name: /string 1.*E#.*interval 7/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Arpeggio", exact: true }).click();
    await page.getByRole("combobox", { name: "Arpeggio type" }).selectOption("seventh");
    await page.getByRole("button", { name: "Descending", exact: true }).click();
    await expect(page.getByRole("list", { name: "Playback sequence" }).getByRole("listitem"))
      .toHaveCount(5);

    await page.getByRole("button", { name: "Play scale" }).click();
    await expect(page.locator('[data-playing="true"]')).toHaveCount(1);
    await page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first().click();
    await expect(page.getByTestId("scale-synthesia")).toBeHidden();
    await expect(page.locator('[data-playing="true"]')).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test("preserves the HASHER timeline and Toolbox state across round trips", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await page.getByRole("button", { name: "Hanz", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();

    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await page.locator("#theory-root").selectOption("Eb");
    const disclosure = page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first();
    await disclosure.click();
    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();

    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(page.locator("#theory-root")).toHaveValue("Eb");
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("scale-synthesia")).toBeVisible();
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains the complete practice surface at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openScales(page, { root: "F#", scale: "harmonic_minor" });

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )).toBe(false);
      await expect(page.getByTestId("scale-synthesia")).toHaveAttribute(
        "data-reduced-motion",
        viewport.name === "mobile" ? "true" : "false",
      );
      await expect(page.getByRole("complementary", { name: "Practice summary" })).toBeVisible();
      if (viewport.name === "mobile") {
        expect(await page.getByTestId("scale-piano-scroller").evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        )).toBe(true);
        const runningAnimations = await page.getByTestId("scale-synthesia").evaluate(
          (element) => element.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
        );
        expect(runningAnimations).toBe(0);
      }
      expect(issues).toEqual([]);
    });
  }
});

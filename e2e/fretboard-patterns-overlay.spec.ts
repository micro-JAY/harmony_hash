import { openFretFinder } from "./helpers/toolbox";
import { expect, test, type Page } from "@playwright/test";

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

async function openFretboard(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openFretFinder(page);
  await expect(page.getByRole("heading", { name: "FRET FINDER" })).toBeVisible();
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test.describe("Fretboard learning patterns", () => {
  test.describe.configure({ timeout: 120_000 });

  test("filters to CAGED/3NPS, remembers choices, and recovers compatibility", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const learning = page.getByTestId("fretboard-learning-layer");
    await expect(learning.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.locator("#theory-root").selectOption("G");
    await learning.getByRole("button", { name: "CAGED", exact: true }).click();
    await learning.getByRole("combobox", { name: "Fretboard caged form" }).selectOption("e");
    const scroller = page.getByTestId("fretboard-scroller");
    await expect(scroller).toHaveAttribute("data-pattern", "caged");
    for (const [stringNumber, fret] of [[6, 3], [4, 5], [1, 3]]) {
      await expect(scroller.locator(`button[data-string="${stringNumber}"][data-fret="${fret}"]`)).toBeVisible();
    }

    await learning.getByRole("button", { name: "3NPS", exact: true }).click();
    await learning.getByRole("combobox", { name: "Fretboard 3nps position" }).selectOption("4");
    await expect(scroller.locator("button[data-pattern-tone='true']")).toHaveCount(18);
    await learning.getByRole("button", { name: "CAGED", exact: true }).click();
    await expect(learning.getByRole("combobox", { name: "Fretboard caged form" })).toHaveValue("e");
    await learning.getByRole("button", { name: "3NPS", exact: true }).click();
    await expect(learning.getByRole("combobox", { name: "Fretboard 3nps position" })).toHaveValue("4");

    await page.getByRole("combobox", { name: "Fretboard tuning" }).selectOption("guitar-dadgad");
    await expect(learning.getByRole("status")).toContainText("Patterns currently require Standard six-string guitar");
    await expect(scroller).toHaveAttribute("data-pattern", "all");
    await page.getByRole("combobox", { name: "Fretboard tuning" }).selectOption("guitar-standard");
    await expect(scroller).toHaveAttribute("data-pattern", "three-nps");
    await expect(learning.getByRole("combobox", { name: "Fretboard 3nps position" })).toHaveValue("4");

    const keysBefore = await scroller.locator("button[data-pattern-tone='true']").evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("data-string")}:${node.getAttribute("data-fret")}`).sort(),
    );
    await page.getByRole("button", { name: "Left-handed", exact: true }).click();
    const keysAfter = await scroller.locator("button[data-pattern-tone='true']").evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("data-string")}:${node.getAttribute("data-fret")}`).sort(),
    );
    expect(keysAfter).toEqual(keysBefore);
    expect(issues).toEqual([]);
  });

  test("renders only pattern tones without the retired chord-overlay surface", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const scroller = page.getByTestId("fretboard-scroller");
    await expect(page.getByRole("button", { name: "Choose a chord" })).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: "Search chord overlay" })).toHaveCount(0);
    await expect(page.getByText("Ring = chord tone", { exact: true })).toHaveCount(0);
    await expect(scroller).not.toHaveAttribute("data-overlay", /.*/);
    await expect(scroller.locator("button[data-chord-tone]")).toHaveCount(0);
    await expect(scroller.locator("button[data-scale-fit]")).toHaveCount(0);
    await expect(scroller.locator("button[data-pattern-tone='true']")).not.toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test("recovers roving focus when a pattern filters the focused position", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const scroller = page.getByTestId("fretboard-scroller");
    const removedByEForm = scroller.locator("button[data-string='1'][data-fret='0']");
    await removedByEForm.focus();
    await expect(removedByEForm).toBeFocused();
    await page.getByRole("button", { name: "CAGED", exact: true }).evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(scroller.locator("button:focus")).toHaveCount(1);
    await expect(scroller.locator("button[tabindex='0']")).toHaveCount(1);
    expect(issues).toEqual([]);
  });

  test("keeps learning controls independent from the builder-only companion", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    await page.getByRole("button", { name: "CAGED", exact: true }).click();

    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-pattern", "caged");
    await expect(page.getByRole("dialog", { name: "Harmony" })).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains pattern controls at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openFretboard(page);
      await page.getByRole("button", { name: "3NPS", exact: true }).click();
      await expectNoDocumentOverflow(page);
      await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-pattern", "three-nps");
      await expect(page.getByRole("button", { name: "Choose a chord" })).toHaveCount(0);
      if (viewport.name === "mobile") {
        const controls = page.getByTestId("fretboard-learning-layer");
        expect(await controls.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
      }
      expect(issues).toEqual([]);
    });
  }

  test("updates patterns inside the 500ms interaction budget", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const patternStartedAt = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "CAGED", exact: true }).click();
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-pattern", "caged");
    expect(await page.evaluate((start) => performance.now() - start, patternStartedAt)).toBeLessThan(500);
    expect(issues).toEqual([]);
  });
});

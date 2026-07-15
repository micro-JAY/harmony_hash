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
  await page.getByRole("button", { name: "FRET FINDER", exact: true }).click();
  await expect(page.getByRole("heading", { name: "FRET FINDER" })).toBeVisible();
}

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

async function chooseOverlayWithKeyboard(page: Page, label: string): Promise<void> {
  const trigger = page.getByRole("button", { name: /Choose a chord|Overlay:/ });
  await trigger.focus();
  await trigger.press("Enter");
  const search = page.getByRole("searchbox", { name: "Search chord overlay" });
  await expect(search).toBeFocused();
  await search.fill(label);
  await search.press("Tab");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const result = page.getByRole("button", { name: new RegExp(`^${escapedLabel} ${escapedLabel} \\(`) });
  await expect(result).toBeFocused();
  await result.press("Enter");
  await expect(page.getByRole("button", { name: `Overlay: ${label}` })).toBeFocused();
}

test.describe("Fretboard patterns and chord overlays", () => {
  test.describe.configure({ timeout: 120_000 });

  test("filters to CAGED/3NPS, remembers choices, and recovers compatibility", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const learning = page.getByTestId("fretboard-learning-layer");
    await expect(learning.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("combobox", { name: "Fretboard root" }).selectOption("G");
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

  test("selects G7#9 by keyboard and exposes in-scale and altered tones", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const scroller = page.getByTestId("fretboard-scroller");
    const baseMarkerKeys = await scroller.locator("button[data-string][data-fret]").evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("data-string")}:${node.getAttribute("data-fret")}`).sort(),
    );
    await chooseOverlayWithKeyboard(page, "G7#9");

    await expect(scroller).toHaveAttribute("data-overlay", "G7#9");
    const altered = scroller.locator("button[data-chord-tone='#9'][data-scale-fit='outside']").first();
    await expect(altered).toBeVisible();
    await expect(altered).toHaveText("A#");
    await expect(altered).toHaveAttribute("aria-label", /chord tone #9, outside C Major/);
    expect(await altered.evaluate((element) => getComputedStyle(element).borderStyle)).toBe("dashed");
    const inScale = scroller.locator("button[data-chord-tone='1'][data-scale-fit='in']").first();
    await expect(inScale).toBeVisible();
    expect(await inScale.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
    await expect(page.getByRole("complementary", { name: "Interval color legend" })).toContainText("Ring = chord tone");
    await expect(page.getByRole("complementary", { name: "Interval color legend" })).toContainText("Dashed = outside selected scale");

    await page.getByRole("button", { name: "Overlay: G7#9" }).click();
    const search = page.getByRole("searchbox", { name: "Search chord overlay" });
    await search.fill("not-a-real-chord");
    await search.press("Enter");
    await expect(page.getByRole("alert")).toContainText("not in the Harmony Hash dictionary");
    await expect(scroller).toHaveAttribute("data-overlay", "G7#9");
    await search.press("Escape");
    await expect(page.getByRole("button", { name: "Overlay: G7#9" })).toBeFocused();

    await page.getByRole("button", { name: "Clear G7#9 chord overlay" }).click();
    await expect(scroller).toHaveAttribute("data-overlay", "none");
    await expect(scroller.locator("button[data-chord-tone]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Choose a chord" })).toBeFocused();
    const restoredMarkerKeys = await scroller.locator("button[data-string][data-fret]").evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("data-string")}:${node.getAttribute("data-fret")}`).sort(),
    );
    expect(restoredMarkerKeys).toEqual(baseMarkerKeys);
    expect(issues).toEqual([]);
  });

  test("persists the overlay across every explorer axis and recovers filtered board focus", async ({ page }) => {
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

    await chooseOverlayWithKeyboard(page, "Cmaj7");
    await page.getByRole("combobox", { name: "Fretboard root" }).selectOption("Eb");
    await page.getByRole("combobox", { name: "Fretboard mode" }).selectOption("dorian");
    await page.getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByRole("button", { name: "Left-handed", exact: true }).click();
    await page.getByRole("combobox", { name: "Fretboard caged form" }).selectOption("a");
    await page.getByRole("combobox", { name: "Fretboard tuning" }).selectOption("guitar-dadgad");
    await page.getByRole("button", { name: "Bass", exact: true }).click();
    await expect(scroller).toHaveAttribute("data-overlay", "Cmaj7");
    await page.getByRole("button", { name: "Guitar", exact: true }).click();
    await page.getByRole("combobox", { name: "Fretboard tuning" }).selectOption("guitar-standard");
    await expect(page.getByRole("button", { name: "Overlay: Cmaj7" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Fretboard caged form" })).toHaveValue("a");
    expect(issues).toEqual([]);
  });

  test("keeps learning controls independent from the builder-only companion", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    await page.getByRole("button", { name: "CAGED", exact: true }).click();
    await chooseOverlayWithKeyboard(page, "Cmaj7");

    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-pattern", "caged");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-overlay", "Cmaj7");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains pattern and overlay controls at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openFretboard(page);
      await page.getByRole("button", { name: "3NPS", exact: true }).click();
      await page.getByRole("button", { name: "Choose a chord" }).click();
      await page.getByRole("searchbox", { name: "Search chord overlay" }).fill("Cmaj7");
      await expectNoDocumentOverflow(page);
      await expect(page.getByRole("list", { name: "Chord overlay results" })).toBeVisible();
      if (viewport.name === "mobile") {
        const controls = page.getByTestId("fretboard-learning-layer");
        expect(await controls.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
      }
      expect(issues).toEqual([]);
    });
  }

  test("updates pattern and overlay inside the 500ms interaction budget", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openFretboard(page);
    const patternStartedAt = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "CAGED", exact: true }).click();
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-pattern", "caged");
    expect(await page.evaluate((start) => performance.now() - start, patternStartedAt)).toBeLessThan(500);

    const overlayStartedAt = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "Choose a chord" }).click();
    const search = page.getByRole("searchbox", { name: "Search chord overlay" });
    await search.fill("Cmaj7");
    await search.press("Enter");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-overlay", "Cmaj7");
    expect(await page.evaluate((start) => performance.now() - start, overlayStartedAt)).toBeLessThan(500);
    expect(issues).toEqual([]);
  });
});

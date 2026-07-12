import { expect, test, type Page } from "@playwright/test";

function collectPageIssues(page: Page): string[] {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") issues.push(message.text());
  });
  page.on("pageerror", (error) => issues.push(error.message));
  return issues;
}

async function openFreeInputGrid(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Browse chords" }).click();
  await page.getByRole("button", { name: "Key chord suggestions" }).click();
}

test.describe("Mood and genre lens", () => {
  test("biases chord suggestions without changing the progression", async ({ page }) => {
    const issues = collectPageIssues(page);
    await openFreeInputGrid(page);
    const moodSelect = page.getByRole("combobox", { name: "Mood or genre lens" });
    await expect(moodSelect.locator("option")).toHaveCount(13);

    const cMajor = page.locator('[data-chord-name="C"]');
    await expect(cMajor).toHaveAttribute("data-fit-score", "100");
    const baselineScore = Number(await cMajor.getAttribute("data-fit-score"));

    await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('select[aria-label="Mood or genre lens"]');
      const scoredChord = document.querySelector<HTMLElement>('[data-chord-name="C"]');
      if (!select || !scoredChord) throw new Error("Mood performance targets are unavailable");
      select.addEventListener("change", () => {
        const started = performance.now();
        const observer = new MutationObserver(() => {
          observer.disconnect();
          requestAnimationFrame(() => {
            select.dataset.updateMs = String(performance.now() - started);
          });
        });
        observer.observe(scoredChord, { attributes: true, attributeFilter: ["data-fit-score"] });
      }, { once: true });
    });
    await moodSelect.selectOption("dark");
    await expect(page.getByTestId("mood-filter")).toHaveAttribute("data-mood-id", "dark");
    await expect(page.getByTestId("suggestion-summary")).toContainText("Dark lens");
    await expect(cMajor).toHaveAttribute("aria-label", /Dark scale fit/);
    await expect(moodSelect).toHaveAttribute("data-update-ms", /\d/);
    const updateDuration = Number(await moodSelect.getAttribute("data-update-ms"));
    expect(updateDuration).toBeLessThan(500);
    expect(Number(await cMajor.getAttribute("data-fit-score"))).toBeLessThan(baselineScore);

    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Cm7 Fm7");
    await input.press("Enter");
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Cm7", "Fm7"]);
    await moodSelect.selectOption("happy");
    await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["Cm7", "Fm7"]);
    expect(issues).toEqual([]);
  });

  test("filters Improv Insight to mood-preferred scale families", async ({ page }) => {
    const issues = collectPageIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("C7 F7 G7");
    await input.press("Enter");
    await page.getByRole("combobox", { name: "Mood or genre lens" }).selectOption("bluesy");
    await page.getByRole("button", { name: "Show compatible scales" }).click();

    await expect(page.getByTestId("improv-insight")).toHaveAttribute("data-mood-id", "bluesy");
    await expect(page.getByTestId("improv-mood-summary")).toContainText("Bluesy lens");
    const results = page.locator("[data-scale-result]");
    await expect(results).toHaveCount(6);
    const scaleTypes = await results.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-scale-type")),
    );
    expect(scaleTypes.every((scaleType) =>
      ["major_blues", "minor_blues", "mixolydian", "minor_pentatonic"].includes(scaleType ?? ""),
    )).toBe(true);
    expect(scaleTypes.some((scaleType) => scaleType === "major_blues" || scaleType === "minor_blues"))
      .toBe(true);

    await page.getByRole("combobox", { name: "Mood or genre lens" }).selectOption("");
    await expect(page.getByTestId("improv-insight")).toHaveAttribute("data-mood-id", "none");
    await expect(page.getByTestId("improv-mood-summary")).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test.describe("375px mobile and reduced motion", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("keeps the optional lens contained and keyboard reachable", async ({ page }) => {
      const issues = collectPageIssues(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openFreeInputGrid(page);
      const moodSelect = page.getByRole("combobox", { name: "Mood or genre lens" });
      await page.getByRole("button", { name: "Progressions" }).focus();
      await page.keyboard.press("Tab");
      await expect(moodSelect).toBeFocused();
      await moodSelect.selectOption("film_noir");
      await expect(page.getByTestId("mood-filter-description")).toBeVisible();
      await expect(page.getByTestId("chord-grid-panel")).toHaveAttribute("data-reduced-motion", "true");

      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      expect(issues).toEqual([]);
      await expect(page.getByTestId("mood-filter")).toHaveScreenshot(
        "mood-filter-mobile-film-noir.png",
      );
    });
  });
});

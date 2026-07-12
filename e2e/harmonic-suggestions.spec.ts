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
  page.on("pageerror", (error) => {
    issues.push({ type: "pageerror", text: error.message });
  });
  return issues;
}

async function openFreeInputGrid(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Browse chords/ }).click();
  await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
}

test.describe("Free Input harmonic suggestions", () => {
  // The first preview navigation can exceed one minute when Vite serves the
  // initial bundle cold from the external volume. Interaction latency remains
  // independently constrained to 500ms below.
  test.describe.configure({ timeout: 90_000 });

  test("scores every chord cell and keeps Free Input context independent", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          provider: "openai",
          bindings: { openaiApiKey: true },
        }),
      });
    });
    await openFreeInputGrid(page);

    const freeKey = page.getByRole("combobox", { name: "Free Input key" });
    const freeMode = page.getByRole("combobox", { name: "Free Input mode" });
    await expect(freeKey).toHaveValue("C");
    await expect(freeMode).toHaveValue("major");
    await expect(freeMode.locator("option")).toHaveCount(7);

    await page.getByRole("button", { name: "Key chord suggestions" }).click();
    await expect(page.getByTestId("suggestion-summary")).toHaveText("Key fit in C major");
    const scoredCells = page.locator('button[data-fit-score]');
    await expect(scoredCells).toHaveCount(84);
    const dMinorSeven = page.getByRole("button", { name: /Dm7, 100% fit, strong/ });
    await expect(dMinorSeven).toHaveAttribute(
      "data-fit-tier",
      "strong",
    );
    await expect(page.getByRole("button", { name: /C7, 75% fit, good/ })).toHaveAttribute(
      "data-fit-score",
      "75",
    );
    const fitColors = await Promise.all([
      dMinorSeven,
      page.getByRole("button", { name: /C7, 75% fit, good/ }),
      page.locator('button[data-chord-name="F#"]'),
    ].map((locator) => locator.getByText(/%$/).evaluate((element) => getComputedStyle(element).color)));
    expect(new Set(fitColors).size).toBe(3);
    await dMinorSeven.click();
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await expect(freeInput).toHaveValue("Dm7");
    await expect(freeInput).toBeFocused();
    await expect(page.getByTestId("chord-card")).toHaveCount(0);

    await freeKey.selectOption("D");
    await freeMode.selectOption("dorian");
    await expect(page.getByTestId("suggestion-summary")).toHaveText("Key fit in D Dorian");

    await page.getByRole("button", { name: "Progressions" }).click();
    await page.getByText("Or pick a preset", { exact: true }).click();
    const presetKey = page.getByRole("combobox", { name: "Progression key" });
    await presetKey.selectOption("E");

    await page.getByRole("button", { name: "Free Input" }).click();
    await expect(freeKey).toHaveValue("D");
    await expect(freeMode).toHaveValue("dorian");
    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(presetKey).toHaveValue("E");
    expect(browserIssues).toEqual([]);
  });

  test("uses the last valid chord, preserves explicit Run, and survives instrument changes", async ({
    page,
  }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFreeInputGrid(page);
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("G7 nope");

    await page.getByRole("button", { name: "Next chord suggestions" }).click();
    await expect(page.getByTestId("suggestion-summary")).toContainText(
      "Ranking what follows G7 in C major",
    );
    const cMajorSeven = page.getByRole("button", {
      name: /Cmaj7, 96% fit, strong.*dominant resolution/,
    });
    await expect(cMajorSeven).toHaveAttribute("data-fit-score", "96");

    const outsideChord = page.locator('button[data-chord-name="F#"]');
    expect(
      await outsideChord.evaluate((element) => Number(getComputedStyle(element).opacity)),
    ).toBe(1);
    await expect(outsideChord.getByText(/%$/)).toBeVisible();

    await cMajorSeven.focus();
    await cMajorSeven.press("Enter");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("G7 nope Cmaj7");
    await expect(page.getByTestId("chord-card")).toHaveCount(0);

    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(2);
    await expect(page.getByText(/nope.*Unrecognized chord/)).toBeVisible();
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    await expect(page.getByRole("button", { name: /Hide grid/ })).toBeVisible();

    await page.getByRole("button", { name: "Piano" }).click();
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    await expect(page.getByTestId("chord-card").first().getByText("Fingering")).toBeVisible();
    await page.getByRole("button", { name: "Guitar" }).click();
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    expect(browserIssues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains the scored grid at ${viewport.name} width`, async ({ page }) => {
      const browserIssues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openFreeInputGrid(page);
      await page.getByRole("button", { name: "Key chord suggestions" }).click();

      await expect(page.getByLabel("Fit score legend")).toBeVisible();
      await expect(page.getByRole("button", { name: /Cmaj7, 100% fit, strong/ })).toBeVisible();
      const documentOverflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(documentOverflows).toBe(false);

      if (viewport.name === "mobile") {
        await expect(page.getByTestId("chord-grid-panel")).toHaveAttribute(
          "data-reduced-motion",
          "true",
        );
        const runningAnimations = await page.getByTestId("chord-grid-panel").evaluate(
          (element) => element.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
        );
        expect(runningAnimations).toBe(0);
        const cellTransitionDuration = await page
          .locator('button[data-chord-name="Cmaj7"]')
          .evaluate((element) => getComputedStyle(element).transitionDuration);
        expect(cellTransitionDuration).toBe("0s");
        const gridScrolls = await page.getByTestId("chord-grid-scroll").evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        );
        expect(gridScrolls).toBe(true);
      }
      expect(browserIssues).toEqual([]);
    });
  }

  test("updates a representative Next score within 500ms", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFreeInputGrid(page);
    await page.getByRole("button", { name: "Next chord suggestions" }).click();
    const cMajorSeven = page.locator('button[data-chord-name="Cmaj7"]');
    await expect(cMajorSeven).toHaveAttribute("data-fit-score", "100");

    const startedAt = await page.evaluate(() => performance.now());
    await page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ }).fill("G7");
    await expect(cMajorSeven).toHaveAttribute("data-fit-score", "96");
    const elapsed = await page.evaluate((start) => performance.now() - start, startedAt);

    expect(elapsed).toBeLessThan(500);
    expect(browserIssues).toEqual([]);
  });

  test("supports logical Tab order through context, modes, filters, and cells", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const freeKey = page.getByRole("combobox", { name: "Free Input key" });
    const freeMode = page.getByRole("combobox", { name: "Free Input mode" });
    const browse = page.getByRole("button", { name: /Browse chords/ });

    await freeKey.focus();
    await expect(freeKey).toBeFocused();
    await expect
      .poll(async () =>
        freeKey.evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.outlineStyle}|${style.outlineWidth}|${style.outlineColor}`;
        }),
      )
      .toMatch(/^solid\|2px\|(?!rgba?\(0, 0, 0, 0\)|transparent).+$/);
    await page.keyboard.press("Tab");
    await expect(freeMode).toBeFocused();
    await expect
      .poll(async () =>
        freeMode.evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.outlineStyle}|${style.outlineWidth}|${style.outlineColor}`;
        }),
      )
      .toMatch(/^solid\|2px\|(?!rgba?\(0, 0, 0, 0\)|transparent).+$/);
    await page.keyboard.press("Tab");
    await expect(browse).toBeFocused();
    await browse.press("Enter");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Off chord suggestions" })).toBeFocused();
    await page.keyboard.press("Tab");
    const keyMode = page.getByRole("button", { name: "Key chord suggestions" });
    await expect(keyMode).toBeFocused();
    await keyMode.press("Enter");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Next chord suggestions" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Basic", exact: true })).toBeFocused();

    for (const filter of ["9ths+", "Sus", "Alt", "All"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: filter, exact: true })).toBeFocused();
    }
    await page.keyboard.press("Tab");
    const firstChord = page.locator('button[data-chord-name="C"]');
    await expect(firstChord).toBeFocused();
    await firstChord.press("Enter");
    await expect(page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ })).toBeFocused();
    await expect(page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ })).toHaveValue("C");
    expect(browserIssues).toEqual([]);
  });
});

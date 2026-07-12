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

async function openScales(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Scales", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scale Synthesia" })).toBeVisible();
}

test.describe("Scale Synthesia", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders the complete F-sharp harmonic-minor learning map", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openScales(page);

    await expect(page.getByRole("combobox", { name: "Family" }).locator("option")).toHaveCount(6);
    await expect(page.getByRole("combobox", { name: "Scale or mode" }).locator("option")).toHaveCount(7);
    await expect(page.getByRole("region", { name: "F# Harmonic Minor piano practice map" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Scale notes" }).getByRole("listitem")).toHaveCount(8);
    await expect(page.getByRole("list", { name: "Whole and half step formula" }).getByRole("listitem"))
      .toHaveText(["W", "H", "W", "W", "H", "1½", "H"]);
    await expect(page.getByRole("list", { name: "Named scale degrees" })).toContainText(
      "Raised seventh",
    );
    await expect(page.getByText("Hava Nagila — traditional", { exact: true })).toBeVisible();
    await expect(page.getByTestId("scale-piano-keyboard")).toHaveAttribute(
      "aria-label",
      /F#, degree 1; G#, degree 2; A, degree 3; B, degree 4; C#, degree 5; D, degree 6; E#, degree 7/,
    );
    const degreeColors = await page.locator('[data-scale-degree]:not([data-scale-degree=""])')
      .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
    expect(new Set(degreeColors).size).toBeGreaterThanOrEqual(7);
    await expect(page.getByTestId("scale-synthesia")).toHaveScreenshot(
      "scale-synthesia-desktop.png",
    );
    expect(issues).toEqual([]);
  });

  test("shares the mood vocabulary with the scale picker inside the latency budget", async ({
    page,
  }) => {
    const issues = collectBrowserIssues(page);
    await openScales(page);
    const family = page.getByRole("combobox", { name: "Family" });
    const scale = page.getByRole("combobox", { name: "Scale or mode" });
    const mood = page.getByRole("combobox", { name: "Mood lens" });

    await family.selectOption("major_modes");
    await scale.selectOption("lydian");
    await expect(page.getByText("F# Lydian · Ascending", { exact: true })).toBeVisible();

    await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>("#scale-mood");
      select?.addEventListener("change", () => {
        const startedAt = performance.now();
        requestAnimationFrame(() => {
          select.dataset.updateMs = String(performance.now() - startedAt);
        });
      }, { once: true });
    });
    await mood.selectOption("dark");
    await expect(page.getByRole("status")).toHaveText(
      "Dark lens · showing 5 matching scales from the shared mood vocabulary.",
    );
    await expect(scale.locator("option")).toHaveText(["Phrygian", "Natural Minor (Aeolian)"]);
    await expect(scale).toHaveValue("phrygian");
    await expect(mood).toHaveAttribute("data-update-ms", /\d/);
    const updateMs = Number(await mood.getAttribute("data-update-ms"));
    expect(updateMs).toBeLessThan(500);

    await mood.selectOption("");
    await expect(family.locator("option")).toHaveCount(6);
    expect(issues).toEqual([]);
  });

  test("uses the shared guitar map and supports descending arpeggio playback", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openScales(page);
    await page.getByRole("button", { name: "Guitar", exact: true }).click();
    const board = page.getByRole("region", { name: "Right-handed guitar fretboard in Standard tuning" });
    await expect(board).toBeVisible();
    await expect(board.getByRole("button", { name: /string 1.*E#.*interval 7/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Arpeggio", exact: true }).click();
    await expect(board.getByRole("button", { name: /G#.*interval 2/ })).toHaveCount(0);
    await page.getByRole("combobox", { name: "Arpeggio type" }).selectOption("seventh");
    await page.getByRole("button", { name: "Descending", exact: true }).click();
    await expect(page.getByRole("list", { name: "Playback sequence" }).getByRole("listitem"))
      .toHaveCount(5);
    expect(await page.getByRole("list", { name: "Playback sequence" }).getByRole("listitem")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label"))))
      .toEqual([
        "1: F#, degree 1", "2: E#, degree 7", "3: C#, degree 5",
        "4: A, degree 3", "5: F#, degree 1",
      ]);

    await page.getByRole("button", { name: "Play scale" }).click();
    await expect(page.locator('[data-playing="true"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Stop scale playback" })).toBeVisible();
    await page.getByRole("button", { name: "Stop scale playback" }).click();
    await expect(page.locator('[data-playing="true"]')).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  test("keeps the Builder timeline and companion mounted across practice", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Cmaj7 Am7 Dm7 G7");
    await input.press("Enter");
    await expect(page.getByTestId("chord-card")).toHaveCount(4);

    await page.getByRole("button", { name: "Scales", exact: true }).click();
    await page.getByRole("combobox", { name: "Root" }).selectOption("Eb");
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Circle of Fifths" })).toBeVisible();
    await page.getByRole("button", { name: "Builder", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Expand Harmony Companion" })).toBeVisible();
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
      await openScales(page);

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )).toBe(false);
      await expect(page.getByTestId("scale-synthesia")).toHaveAttribute(
        "data-reduced-motion",
        viewport.name === "mobile" ? "true" : "false",
      );
      await expect(page.getByRole("complementary", { name: "Practice summary" })).toBeVisible();
      if (viewport.name === "mobile") {
        const keyboardScrolls = await page.getByTestId("scale-piano-scroller").evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        );
        expect(keyboardScrolls).toBe(true);
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

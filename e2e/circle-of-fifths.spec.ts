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

async function openCircle(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Circle of Fifths" })).toBeVisible();
}

test.describe("Circle of Fifths", () => {
  test.describe.configure({ timeout: 90_000 });

  test("lazy-loads all keys and exposes the selected harmony", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openCircle(page);

    const circle = page.getByRole("listbox", {
      name: "Major keys and relative minor keys around the Circle of Fifths",
    });
    await expect(circle.getByRole("option")).toHaveCount(12);
    await expect(circle.getByRole("option", { name: /C major, relative A minor/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const details = page.getByRole("complementary", { name: "C Major (Ionian) details" });
    await expect(details).toContainText("A minor");
    await expect(
      details.getByRole("list", { name: "C Major (Ionian) Diatonic chords" })
        .getByRole("listitem")
        .locator(".readout"),
    ).toHaveText(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    await expect(page).toHaveScreenshot("circle-of-fifths-desktop.png");
    expect(issues).toEqual([]);
  });

  test("supports pointer and spatial keyboard selection", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openCircle(page);

    const circle = page.getByRole("listbox");
    const gMajor = circle.getByRole("option", { name: /G major, relative E minor/ });
    await gMajor.click();
    await expect(gMajor).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("complementary", { name: "G Major (Ionian) details" })).toContainText(
      "1 sharp",
    );

    await gMajor.focus();
    await gMajor.press("ArrowRight");
    const dMajor = circle.getByRole("option", { name: /D major, relative B minor/ });
    await expect(dMajor).toBeFocused();
    await expect(dMajor).toHaveAttribute("aria-selected", "true");
    await dMajor.press("Home");
    await expect(circle.getByRole("option", { name: /C major, relative A minor/ })).toBeFocused();
    await page.keyboard.press("End");
    await expect(circle.getByRole("option", { name: /F major, relative D minor/ })).toBeFocused();

    const dbMajor = circle.getByRole("option", { name: /Db major, relative Bb minor/ });
    await dbMajor.click();
    await expect(dbMajor).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#theory-root")).toHaveValue("C#");
    const cSharpDetails = page.getByRole("complementary", { name: "C# Major (Ionian) details" });
    await expect(cSharpDetails).toContainText("A# minor");
    await expect(cSharpDetails).toContainText("7 sharps");
    await expect(cSharpDetails).not.toContainText("5 flats");
    expect(issues).toEqual([]);
  });

  test("hands a dictionary-valid progression to the existing builder", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openCircle(page);

    const gMajor = page.getByRole("option", { name: /G major, relative E minor/ });
    await gMajor.focus();
    await gMajor.press("ArrowRight");
    await page.getByRole("button", { name: "Use D in HASHER" }).click();

    await expect(page.getByRole("button", { name: "HASHER" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("chord-card")).toHaveCount(3);
    for (const [index, chord] of ["D", "G", "A"].entries()) {
      await expect(page.getByTestId("chord-card").nth(index).getByRole("heading", {
        name: chord,
        exact: true,
      })).toBeVisible();
    }
    await expect(page.getByTestId("chord-card").getByTestId("guitar-chord-diagram")).toHaveCount(3);
    await page.getByRole("button", { name: "Piano" }).click();
    await expect(page.getByTestId("chord-card").getByTestId("piano-keyboard")).toHaveCount(3);
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`remains contained at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openCircle(page);

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )).toBe(false);
      const circle = page.getByRole("listbox");
      await expect(circle).toBeVisible();
      await expect(page.getByRole("complementary", { name: "C Major (Ionian) details" })).toBeVisible();

      if (viewport.name === "mobile") {
        await expect(circle).toHaveAttribute("data-reduced-motion", "true");
        const runningAnimations = await page.getByTestId("circle-of-fifths").evaluate(
          (element) => element.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
        );
        expect(runningAnimations).toBe(0);
        const headerTransition = await page.getByRole("navigation", { name: "Workspace" })
          .getByRole("button", { name: "TUNE TOOLBOX" })
          .evaluate((element) => getComputedStyle(element).transitionDuration);
        expect(headerTransition).toBe("0s");
      }
      expect(issues).toEqual([]);
    });
  }

  test("invalidates a delayed agent response when the circle replaces the timeline", async ({
    page,
  }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => { requestStarted = resolve; });
    await page.route("**/api/health", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, provider: "openai", bindings: { openaiApiKey: true } }),
    }));
    await page.route("**/api/progression", async (route) => {
      requestStarted();
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chords: ["Cmaj7", "D/F#", "E7#9", "Am7"],
          key: "C major",
          rationale: "This stale response must not replace the circle selection.",
        }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Describe the progression you want" }).fill(
      "delayed circle race",
    );
    await page.getByRole("button", { name: "Run progression agent" }).click();
    await started;

    await page.getByRole("button", { name: "TUNE TOOLBOX" }).click();
    await page.getByRole("button", { name: "Use C in HASHER" }).click();
    releaseResponse();
    await expect(page.getByTestId("chord-card")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "D/F#" })).toHaveCount(0);
    await expect(page.getByTestId("chord-card").nth(0).getByRole("heading", {
      name: "C",
      exact: true,
    })).toBeVisible();
  });

  test("renders modal notes, formulas, chord functions, and representative relationship kinds", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openCircle(page);
    await page.locator("#theory-root").selectOption("D");
    await page.locator("#theory-scale").selectOption("dorian");

    const details = page.getByRole("complementary", { name: "D Dorian details" });
    await expect(details).toContainText("D · E · F · G · A · B · C");
    await expect(details).toContainText("1 · 2 · b3 · 4 · 5 · 6 · b7");
    await expect(
      details.getByRole("list", { name: "D Dorian Diatonic chords" })
        .getByRole("listitem")
        .locator(".readout"),
    ).toHaveText(["Dm", "Em", "F", "G", "Am", "Bdim", "C"]);
    const relationships = page.getByTestId("circle-of-fifths")
      .getByRole("heading", { name: "Relationships" })
      .locator("..");
    await expect(relationships).toContainText("Diatonic function");
    await expect(relationships).toContainText("Distant relationship");
    await expect(relationships).toContainText("weak");

    const labelledBy = await page.getByTestId("circle-of-fifths").getAttribute("aria-labelledby");
    expect(labelledBy).toBe("theory-tool-circle-heading");
    await expect(page.locator(`#${labelledBy}`)).toHaveText("Circle of Fifths");
    expect(issues).toEqual([]);
  });
});

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
  const disclosure = page.locator('button[aria-controls="theory-tool-circle"]');
  await expect(disclosure).toBeVisible();
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click();
  await expect(page.getByTestId("circle-of-fifths")).toBeVisible();
}

test.describe("Circle of Fifths", () => {
  test.describe.configure({ timeout: 90_000 });

  test("lazy-loads all keys and exposes the selected harmony", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openCircle(page);

    await expect.poll(() => page.locator("[data-theory-tool]").evaluateAll((tools) => (
      tools.map((tool) => tool.getAttribute("data-theory-tool"))
    ))).toEqual(["scales", "circle", "network"]);
    await expect(page.locator('button[aria-controls="theory-tool-scales"]'))
      .toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('button[aria-controls="theory-tool-circle"]'))
      .toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('button[aria-controls="theory-tool-network"]'))
      .toHaveAttribute("aria-expanded", "false");

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
    await expect(page.getByTestId("circle-of-fifths")).toHaveScreenshot("circle-of-fifths-desktop.png");
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
    await expect(circle.getByTestId("circle-center-signature")).toHaveText("7 sharps");
    await expect(circle.getByTestId("circle-center-signature")).not.toHaveText("5 flats");
    await expect(circle.getByRole("option", { name: /F# \(Gb\) major, relative D# \(Eb\) minor/ }))
      .toBeVisible();
    expect(issues).toEqual([]);
  });

  test("offers actionable mode and modulation insights without decorative strength marks", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openCircle(page);

    const circleTool = page.getByTestId("circle-of-fifths");
    await expect(circleTool.locator(".circle-modulation-arc")).toHaveCount(0);
    await expect(circleTool.locator("[stroke-dasharray]")).toHaveCount(0);

    const modeInsights = circleTool.getByTestId("circle-mode-insights");
    const keyChangeInsights = circleTool.getByTestId("circle-key-change-insights");
    await expect(modeInsights.locator('[data-circle-insight="mode"]')).toHaveCount(3);
    await expect(keyChangeInsights.locator('[data-circle-insight="key-change"]')).toHaveCount(3);
    await expect(modeInsights).toContainText("C Dorian");
    await expect(modeInsights).toContainText("Cm7 → F7");
    await expect(modeInsights).toContainText("Cmaj7 → D/C");
    await expect(modeInsights).toContainText("C → Bb → F → C");
    await expect(keyChangeInsights).toContainText("C → G → Cm → Ab");
    await expect(keyChangeInsights).toContainText("C → F → A7 → D");
    await expect(keyChangeInsights).toContainText("Cmaj7 → Emaj7");

    const [panelBox, graphBox, detailsBox, insightsBox, modesBox, changesBox] = await Promise.all([
      circleTool.locator(".hh-panel").first().boundingBox(),
      circleTool.getByRole("listbox").boundingBox(),
      circleTool.getByRole("complementary", { name: "C Major (Ionian) details" }).boundingBox(),
      circleTool.getByTestId("circle-insights").boundingBox(),
      modeInsights.boundingBox(),
      keyChangeInsights.boundingBox(),
    ]);
    if (!panelBox || !graphBox || !detailsBox || !insightsBox || !modesBox || !changesBox) {
      throw new Error("Circle insight layout targets must have rendered bounds.");
    }
    expect(Math.abs(insightsBox.x - panelBox.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(insightsBox.width - panelBox.width)).toBeLessThanOrEqual(3);
    expect(insightsBox.y).toBeGreaterThanOrEqual(
      Math.max(graphBox.y + graphBox.height, detailsBox.y + detailsBox.height) - 1,
    );
    expect(Math.abs(modesBox.y - changesBox.y)).toBeLessThanOrEqual(1);
    expect(modesBox.x + modesBox.width).toBeLessThan(changesBox.x);

    await modeInsights.locator('[data-insight-id="dorian"]').click();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(page.getByRole("complementary", { name: "C Dorian details" })).toBeVisible();

    await page.locator("#theory-scale").selectOption("major");
    await keyChangeInsights.locator('[data-insight-id="chromatic-mediant"]').click();
    await expect(page.locator("#theory-root")).toHaveValue("E");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await expect(page.getByRole("complementary", { name: "E Major (Ionian) details" })).toBeVisible();

    const relationships = circleTool.getByRole("heading", { name: "Relationships" }).locator("..");
    const strengthBadges = relationships.locator("[data-relationship-strength]");
    await expect(strengthBadges).toHaveCount(8);
    await expect(strengthBadges.filter({ hasText: "strong relationship" }).first()).toBeVisible();
    await expect(strengthBadges.filter({ hasText: "medium relationship" }).first()).toBeVisible();
    await expect(strengthBadges.filter({ hasText: "weak relationship" }).first()).toBeVisible();
    expect(await relationships.textContent()).not.toMatch(/[━┄]/);
    const badgesContained = await strengthBadges.evaluateAll((badges) => badges.every((badge) => {
      const item = badge.closest("li");
      if (!item) return false;
      const badgeRect = badge.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      return badgeRect.left >= itemRect.left - 1 && badgeRect.right <= itemRect.right + 1;
    }));
    expect(badgesContained).toBe(true);
    expect(issues).toEqual([]);
  });

  test("hands a dictionary-valid progression to the existing builder", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openCircle(page);

    const gMajor = page.getByRole("option", { name: /G major, relative E minor/ });
    await gMajor.focus();
    await gMajor.press("ArrowRight");
    await page.getByTestId("circle-of-fifths")
      .getByRole("button", { name: "HASH it", exact: true })
      .click();

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

      const insights = page.getByTestId("circle-insights");
      const [insightsBox, modesBox, changesBox] = await Promise.all([
        insights.boundingBox(),
        page.getByTestId("circle-mode-insights").boundingBox(),
        page.getByTestId("circle-key-change-insights").boundingBox(),
      ]);
      if (!insightsBox || !modesBox || !changesBox) {
        throw new Error("Responsive Circle insight layout targets must have rendered bounds.");
      }
      for (const columnBox of [modesBox, changesBox]) {
        expect(columnBox.x).toBeGreaterThanOrEqual(insightsBox.x - 1);
        expect(columnBox.x + columnBox.width).toBeLessThanOrEqual(insightsBox.x + insightsBox.width + 1);
      }
      if (viewport.name === "mobile") {
        expect(changesBox.y).toBeGreaterThan(modesBox.y + modesBox.height);
      }

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
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Describe the progression you want" }).fill(
      "delayed circle race",
    );
    await page.getByRole("button", { name: "Run progression agent" }).click();
    await started;

    await page.getByRole("button", { name: "TUNE TOOLBOX" }).click();
    const circleDisclosure = page.locator('button[aria-controls="theory-tool-circle"]');
    if (await circleDisclosure.getAttribute("aria-expanded") !== "true") await circleDisclosure.click();
    await page.getByTestId("circle-of-fifths")
      .getByRole("button", { name: "HASH it", exact: true })
      .click();
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
    await expect(page.locator(`#${labelledBy}`)).toHaveText("THE CIRCLE");
    expect(issues).toEqual([]);
  });

  test("keeps one expanded-only HASH and IMPROV action", async ({ page }) => {
    await openCircle(page);
    const circleTool = page.getByTestId("circle-of-fifths");
    await expect(circleTool.getByRole("button", { name: "HASH it", exact: true })).toHaveCount(1);
    await expect(circleTool.getByRole("button", { name: "IMPROV INSIGHT", exact: true })).toHaveCount(1);
    await expect(circleTool.getByRole("button", { name: "Open IMPROV INSIGHT", exact: true })).toHaveCount(0);

    await page.locator('button[aria-controls="theory-tool-circle"]').click();
    await expect(circleTool).toBeHidden();
  });
});

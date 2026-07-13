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
    await expect(page.getByRole("list", { name: "Chord progression composer" })).toContainText("Dm7");
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
    await page.getByText("Or pick a preset", { exact: true }).click();
    await expect(presetKey).toHaveValue("E");
    expect(browserIssues).toEqual([]);
  });

  test("uses the last composed chord, preserves explicit Run, and survives instrument changes", async ({
    page,
  }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFreeInputGrid(page);
    await page.locator('button[data-chord-name="G7"]').click();

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
    await expect(page.locator('button[data-chord-name="Cmaj7"]')).toBeFocused();
    const composer = page.getByRole("list", { name: "Chord progression composer" });
    await expect(composer.getByRole("button", { name: "Remove G7 at position 1" })).toBeVisible();
    await expect(composer.getByRole("button", { name: "Remove Cmaj7 at position 2" })).toBeVisible();
    await expect(page.getByTestId("chord-card")).toHaveCount(0);

    await page.getByRole("button", { name: "Run chord composer" }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(2);
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    await expect(page.getByRole("button", { name: /Hide grid/ })).toBeVisible();

    await page.getByRole("button", { name: "Piano" }).click();
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    await expect(page.getByTestId("chord-card").first().getByText("Fingering")).toBeVisible();
    await page.getByRole("button", { name: "Guitar" }).click();
    await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
    expect(browserIssues).toEqual([]);
  });

  test("maps jazz cadence paths, tritone substitutes, and tier-strength glow", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFreeInputGrid(page);
    await page.getByRole("button", { name: "Jazz chord suggestions" }).click();

    await expect(page.getByRole("button", { name: "Jazz chord suggestions" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("suggestion-summary")).toHaveText(
      "Jazz vocabulary in C major. Add a chord to reveal cadence paths.",
    );
    await expect(page.locator('button[data-fit-basis="jazz"]')).toHaveCount(84);

    await page.locator('button[data-chord-name="Dm7"]').click();
    await expect(page.getByTestId("suggestion-summary")).toHaveText(
      "Jazz movement after Dm7 in C major",
    );
    const primaryDominant = page.getByRole("button", {
      name: /G7, \d+% fit, strong.*ii–V motion/,
    });
    const tritoneSubstitute = page.getByRole("button", {
      name: /C#7, \d+% fit, good.*tritone-substitute dominant/,
    });
    await expect(primaryDominant).toBeVisible();
    await expect(tritoneSubstitute).toBeVisible();

    const primaryGlow = await primaryDominant.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    );
    const substituteGlow = await tritoneSubstitute.evaluate(
      (element) => getComputedStyle(element).boxShadow,
    );
    expect(primaryGlow).not.toBe("none");
    expect(substituteGlow).not.toBe("none");
    expect(primaryGlow).not.toBe(substituteGlow);

    const beforeHover = await primaryDominant.evaluate(
      (element) => (element as HTMLElement).style.background,
    );
    await primaryDominant.hover();
    await expect.poll(() => primaryDominant.evaluate(
      (element) => (element as HTMLElement).style.background,
    )).toBe(beforeHover);

    await primaryDominant.click();
    const tonicResolution = page.getByRole("button", {
      name: /Cmaj7, \d+% fit, strong.*completes ii–V–I/,
    });
    await expect(tonicResolution).toBeVisible();

    const startedAt = await page.evaluate(() => performance.now());
    await page.getByRole("combobox", { name: "Free Input key" }).selectOption("D");
    await expect(page.getByTestId("suggestion-summary")).toHaveText(
      "Jazz movement after G7 in D major",
    );
    expect(await page.evaluate((start) => performance.now() - start, startedAt)).toBeLessThan(500);

    expect(browserIssues).toEqual([]);
  });

  test("maps scale degrees to modal identities across major and harmonic minor", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFreeInputGrid(page);
    const modalMode = page.getByRole("button", { name: "Modal chord suggestions" });
    await modalMode.click();

    await expect(modalMode).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("suggestion-summary")).toHaveText(
      "Modal roots across C major · fill maps root modes; % tracks chord-tone fit.",
    );
    await expect(page.locator('button[data-fit-basis="modal"]')).toHaveCount(84);
    await expect(page.getByRole("group", { name: "Modal root legend" })
      .locator("[data-modal-legend-id]")).toHaveCount(7);

    const tonic = page.locator('button[data-chord-name="Cmaj7"]');
    const dorian = page.locator('button[data-chord-name="Dm7"]');
    const mixolydian = page.locator('button[data-chord-name="G7"]');
    const outside = page.locator('button[data-chord-name="C#7"]');
    await expect(tonic).toHaveAttribute("data-modal-id", "major");
    await expect(tonic).toHaveAttribute("data-modal-degree", "1");
    await expect(dorian).toHaveAttribute("data-modal-id", "dorian");
    await expect(dorian).toHaveAttribute("data-modal-degree", "2");
    await expect(dorian).toContainText("M2");
    await expect(dorian).toHaveAccessibleName(/Dorian mode on scale degree 2/);
    await expect(mixolydian).toHaveAttribute("data-modal-id", "mixolydian");
    await expect(mixolydian).toHaveAttribute("data-modal-degree", "5");
    expect(await outside.getAttribute("data-modal-id")).toBeNull();
    await expect(outside).toHaveAccessibleName(/root falls outside C major/);

    const [tonicFill, dorianFill] = await Promise.all([
      tonic.evaluate((element) => (element as HTMLElement).style.background),
      dorian.evaluate((element) => (element as HTMLElement).style.background),
    ]);
    expect(tonicFill).not.toBe(dorianFill);

    await page.getByRole("combobox", { name: "Free Input key" }).selectOption("D");
    await page.getByRole("combobox", { name: "Free Input mode" }).selectOption("dorian");
    await expect(dorian).toHaveAttribute("data-modal-id", "dorian");
    await expect(dorian).toHaveAttribute("data-modal-degree", "1");
    await expect(dorian).toContainText("M1");
    expect(await dorian.evaluate((element) => (element as HTMLElement).style.background))
      .toBe(dorianFill);

    await page.getByRole("combobox", { name: "Free Input key" }).selectOption("A");
    await expect(page.getByTestId("suggestion-summary")).toContainText("A Dorian");
    const startedAt = await page.evaluate(() => performance.now());
    await page.getByRole("combobox", { name: "Free Input mode" }).selectOption("harmonic_minor");
    await expect(page.getByTestId("suggestion-summary")).toHaveText(
      "Modal roots across A harmonic minor · fill maps root modes; % tracks chord-tone fit.",
    );
    await expect(page.locator('button[data-chord-name="Bm7"]'))
      .toHaveAttribute("data-modal-id", "locrian_natural_6");
    await expect(page.locator('button[data-chord-name="E7"]'))
      .toHaveAttribute("data-modal-id", "phrygian_dominant");
    expect(await page.evaluate((start) => performance.now() - start, startedAt)).toBeLessThan(500);

    expect(browserIssues).toEqual([]);
  });

  test("contains Jazz scoring inside the mobile viewport", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFreeInputGrid(page);
    await page.getByRole("button", { name: "Jazz chord suggestions" }).click();

    await expect(page.locator('button[data-fit-basis="jazz"]')).toHaveCount(84);
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
    expect(await page.getByTestId("chord-grid-scroll").evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    )).toBe(true);
    expect(browserIssues).toEqual([]);
  });

  test("contains the Modal palette inside the mobile viewport", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFreeInputGrid(page);
    await page.getByRole("button", { name: "Modal chord suggestions" }).click();

    await expect(page.locator('button[data-fit-basis="modal"]')).toHaveCount(84);
    await expect(page.getByRole("group", { name: "Modal root legend" })).toBeVisible();
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
    expect(await page.getByTestId("chord-grid-scroll").evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    )).toBe(true);
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
    await page.locator('button[data-chord-name="G7"]').click();
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
    await expect(page.getByRole("button", { name: "Jazz chord suggestions" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Modal chord suggestions" })).toBeFocused();
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
    await expect(firstChord).toBeFocused();
    await expect(page.getByRole("list", { name: "Chord progression composer" })).toContainText("C");
    expect(browserIssues).toEqual([]);
  });
});

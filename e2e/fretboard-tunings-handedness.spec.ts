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

test.describe("Fretboard tunings and handedness", () => {
  test.describe.configure({ timeout: 120_000 });

  test("offers every tuning, maps exact pitches, and remembers each instrument", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFretboard(page);

    const tuning = page.getByRole("combobox", { name: "Fretboard tuning" });
    await expect(tuning).toHaveValue("guitar-standard");
    expect(await tuning.locator("option").allTextContents()).toEqual([
      "Standard · E A D G B E",
      "Drop D · D A D G B E",
      "DADGAD · D A D G A D",
      "Open G · D G D G B D",
    ]);
    await expect(page.getByRole("button", { name: "Right-handed", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await tuning.selectOption("guitar-drop-d");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute(
      "data-tuning",
      "guitar-drop-d",
    );
    await expect(page.getByRole("button", {
      name: "Right-handed Guitar string 6 (low D), Drop D tuning, fret 0, D, interval 2, All positions pattern tone",
    })).toBeVisible();
    await expect(page.getByRole("button", {
      name: "Right-handed Guitar string 6 (low D), Drop D tuning, fret 2, E, interval 3, All positions pattern tone",
    })).toBeVisible();

    await tuning.selectOption("guitar-dadgad");
    await page.getByRole("button", { name: "Bass", exact: true }).click();
    await expect(tuning).toHaveValue("bass-standard");
    expect(await tuning.locator("option").allTextContents()).toEqual([
      "Standard · E A D G",
      "Drop D · D A D G",
      "BEAD · B E A D",
    ]);
    await tuning.selectOption("bass-bead");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute(
      "data-tuning",
      "bass-bead",
    );

    await page.getByRole("button", { name: "Guitar", exact: true }).click();
    await expect(tuning).toHaveValue("guitar-dadgad");
    await page.getByRole("button", { name: "Bass", exact: true }).click();
    await expect(tuning).toHaveValue("bass-bead");
    expect(browserIssues).toEqual([]);
  });

  test("mirrors the full fret axis and follows visual arrow direction", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFretboard(page);

    const rightGrid = page.getByRole("grid", {
      name: "Right-handed Guitar scale positions in Standard tuning",
    });
    expect((await rightGrid.getByRole("columnheader").allTextContents()).slice(1)).toEqual([
      "OPEN", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
    ]);
    const rightFretZero = page.getByRole("button", {
      name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 0, E, interval 3, All positions pattern tone",
    });
    await rightFretZero.focus();
    await rightFretZero.press("ArrowRight");
    await expect(page.getByRole("button", {
      name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 1, F, interval 4, All positions pattern tone",
    })).toBeFocused();

    await page.getByRole("button", { name: "Left-handed", exact: true }).click();
    const leftGrid = page.getByRole("grid", {
      name: "Left-handed Guitar scale positions in Standard tuning",
    });
    expect((await leftGrid.getByRole("columnheader").allTextContents()).slice(1)).toEqual([
      "15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "OPEN",
    ]);
    const leftFretThree = page.getByRole("button", {
      name: "Left-handed Guitar string 1 (high E), Standard tuning, fret 3, G, interval 5, All positions pattern tone",
    });
    await leftFretThree.focus();
    await leftFretThree.press("ArrowRight");
    await expect(page.getByRole("button", {
      name: "Left-handed Guitar string 1 (high E), Standard tuning, fret 1, F, interval 4, All positions pattern tone",
    })).toBeFocused();
    const leftFretZero = page.getByRole("button", {
      name: "Left-handed Guitar string 1 (high E), Standard tuning, fret 0, E, interval 3, All positions pattern tone",
    });
    await leftFretZero.focus();
    await leftFretZero.press("ArrowRight");
    await expect(leftFretZero).toBeFocused();
    expect(await leftGrid.getByRole("rowheader").allTextContents()).toEqual([
      "E1", "B2", "G3", "D4", "A5", "E6",
    ]);
    expect(browserIssues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`keeps left-handed controls and the open-string edge usable at ${viewport.name} width`, async ({ page }) => {
      const browserIssues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openFretboard(page);
      await page.getByRole("combobox", { name: "Fretboard tuning" }).selectOption("guitar-open-g");
      await page.getByRole("button", { name: "Left-handed", exact: true }).click();

      const scroller = page.getByTestId("fretboard-scroller");
      await expect(scroller).toHaveAttribute("data-handedness", "left");
      await expect(scroller).toHaveAttribute("data-tuning", "guitar-open-g");
      await expectNoDocumentOverflow(page);
      if (viewport.name !== "desktop") {
        const edge = await scroller.evaluate((element) => ({
          current: element.scrollLeft,
          maximum: element.scrollWidth - element.clientWidth,
        }));
        expect(Math.abs(edge.maximum - edge.current)).toBeLessThanOrEqual(2);
        const openHeader = scroller.getByRole("columnheader", { name: "OPEN" });
        const horizontalBounds = await openHeader.evaluate((element) => {
          const scrollerElement = element.closest<HTMLElement>("[data-testid='fretboard-scroller']");
          if (!scrollerElement) throw new Error("Fretboard scroller not found");
          const open = element.getBoundingClientRect();
          const viewport = scrollerElement.getBoundingClientRect();
          return { openLeft: open.left, openRight: open.right, viewportLeft: viewport.left, viewportRight: viewport.right };
        });
        expect(horizontalBounds.openLeft).toBeGreaterThanOrEqual(horizontalBounds.viewportLeft - 1);
        expect(horizontalBounds.openRight).toBeLessThanOrEqual(horizontalBounds.viewportRight + 1);
      }
      if (viewport.name === "mobile") {
        await expect(scroller).toHaveAttribute("data-reduced-motion", "true");
        const leftButton = page.getByRole("button", { name: "Left-handed", exact: true });
        expect(await leftButton.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
        const note = page.getByRole("button", {
          name: "Left-handed Guitar string 1 (high D), Open G tuning, fret 0, D, interval 2, All positions pattern tone",
        });
        expect(await note.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
      }
      expect(browserIssues).toEqual([]);
    });
  }

  test("updates tuning and handedness within the interaction budget", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFretboard(page);
    const tuning = page.getByRole("combobox", { name: "Fretboard tuning" });

    const tuningStartedAt = await page.evaluate(() => performance.now());
    await tuning.selectOption("guitar-open-g");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute(
      "data-tuning",
      "guitar-open-g",
    );
    const tuningElapsed = await page.evaluate((startedAt) => performance.now() - startedAt, tuningStartedAt);
    expect(tuningElapsed).toBeLessThan(500);

    const handednessStartedAt = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "Left-handed", exact: true }).click();
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-handedness", "left");
    const handednessElapsed = await page.evaluate(
      (startedAt) => performance.now() - startedAt,
      handednessStartedAt,
    );
    expect(handednessElapsed).toBeLessThan(500);
    expect(browserIssues).toEqual([]);
  });
});

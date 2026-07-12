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

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

async function settleVisual(page: Page): Promise<void> {
  await expect(page.locator("body")).toHaveCSS("font-family", /Zalando Sans/);
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
  );
}

async function openFretboard(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Fretboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fretboard Explorer" })).toBeVisible();
}

test.describe("Fretboard Explorer", () => {
  // A first preview navigation can stall while macOS reads the cold production
  // bundle from the external workspace volume. Interaction latency remains
  // independently constrained to 500ms below.
  test.describe.configure({ timeout: 120_000 });

  test("lazy-loads the first-class workspace and maps guitar and bass", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(requestedUrls.some((url) => url.includes("FretboardExplorer"))).toBe(false);
    await page.getByRole("button", { name: "Fretboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fretboard Explorer" })).toBeVisible();

    expect(requestedUrls.some((url) => url.includes("FretboardExplorer"))).toBe(true);
    await expect(page.getByRole("button", { name: "Fretboard", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Guitar", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("combobox", { name: "Fretboard root" })).toHaveValue("C");
    await expect(page.getByRole("combobox", { name: "Fretboard mode" })).toHaveValue("major");
    await expect(page.getByRole("button", { name: "Intervals", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const guitarGrid = page.getByRole("grid", {
      name: "Right-handed Guitar scale positions in Standard tuning",
    });
    await expect(guitarGrid.getByRole("row")).toHaveCount(7);
    await expect(guitarGrid.locator("[data-fret-marker]")).toHaveCount(6);
    await expect(guitarGrid.locator('[data-double-marker="true"]')).toHaveCount(1);
    await expect(
      page.getByRole("button", {
        name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 8, C, interval 1, All positions pattern tone",
      }),
    ).toHaveText("1");

    await page.getByRole("button", { name: "Bass", exact: true }).click();
    const bassGrid = page.getByRole("grid", {
      name: "Right-handed Bass scale positions in Standard tuning",
    });
    await expect(bassGrid.getByRole("row")).toHaveCount(5);
    await page.getByRole("combobox", { name: "Fretboard root" }).selectOption("Eb");
    await page.getByRole("combobox", { name: "Fretboard mode" }).selectOption("dorian");
    await page.getByRole("button", { name: "Notes", exact: true }).click();
    await expect(page.getByRole("region", { name: "Eb Dorian scale summary" })).toContainText(
      "Eb Dorian · Bass",
    );
    await expect(
      page.getByRole("button", {
        name: "Right-handed Bass string 1 (G), Standard tuning, fret 8, Eb, interval 1, All positions pattern tone",
      }),
    ).toHaveText("Eb");
    expect(browserIssues).toEqual([]);

    await settleVisual(page);
    await expect(page).toHaveScreenshot("fretboard-desktop.png", { fullPage: true });
  });

  test("supports spatial focus and preserves the progression builder", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Cmaj7 Am7 Dm7 G7");
    await input.press("Enter");
    const firstCard = page.getByTestId("chord-card").nth(0);
    await firstCard.getByRole("button", { name: "Lock chord card" }).click();
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await page.getByRole("button", { name: "Expand Harmony Companion" }).click();
    const collapseCompanion = page.getByRole("button", { name: "Collapse Harmony Companion" });
    await expect(collapseCompanion).toHaveAttribute("aria-expanded", "true");

    await page.getByRole("button", { name: "Fretboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fretboard Explorer" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Harmony companion voice agent" })).toBeVisible();
    await expect(collapseCompanion).toHaveAttribute("aria-expanded", "true");

    const firstNote = page.getByRole("button", {
      name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 0, E, interval 3, All positions pattern tone",
    });
    await firstNote.focus();
    await expect(firstNote).toBeFocused();
    await firstNote.press("ArrowRight");
    const nextNote = page.getByRole("button", {
      name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 1, F, interval 4, All positions pattern tone",
    });
    await expect(nextNote).toBeFocused();
    const focusStyle = await nextNote.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.outlineColor, style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(focusStyle.style).toBe("solid");
    expect(focusStyle.width).toBe("2px");
    expect(focusStyle.color).not.toBe("rgba(0, 0, 0, 0)");
    await nextNote.press("ArrowDown");
    await expect(
      page.getByRole("button", {
        name: "Right-handed Guitar string 2 (B), Standard tuning, fret 1, C, interval 1, All positions pattern tone",
      }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Builder", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Piano", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(firstCard.getByRole("button", { name: "Unlock chord card" })).toBeVisible();
    await expect(collapseCompanion).toHaveAttribute("aria-expanded", "true");
    expect(browserIssues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains the board at ${viewport.name} width`, async ({ page }) => {
      const browserIssues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openFretboard(page);

      await expectNoDocumentOverflow(page);
      const scroller = page.getByTestId("fretboard-scroller");
      const widths = await scroller.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      if (viewport.name === "desktop") {
        expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      } else {
        expect(widths.scroll).toBeGreaterThan(widths.client);
      }
      if (viewport.name === "mobile") {
        await expect(page.getByTestId("fretboard-workspace")).toHaveAttribute(
          "data-reduced-motion",
          "true",
        );
        await expect(scroller).toHaveAttribute("data-reduced-motion", "true");
        const workspaceTransition = await page
          .getByRole("button", { name: "Fretboard", exact: true })
          .evaluate((element) => getComputedStyle(element).transitionDuration);
        expect(workspaceTransition).toBe("0s");

        const firstNote = page.getByRole("button", {
          name: "Right-handed Guitar string 1 (high E), Standard tuning, fret 0, E, interval 3, All positions pattern tone",
        });
        await firstNote.focus();
        const scaleFrets = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15];
        for (let index = 0; index < scaleFrets.length - 1; index++) {
          const current = scroller.locator(
            `button[data-string="1"][data-fret="${scaleFrets[index]}"]`,
          );
          const next = scroller.locator(
            `button[data-string="1"][data-fret="${scaleFrets[index + 1]}"]`,
          );
          await current.press("ArrowRight");
          await expect(next).toBeFocused();
        }
        expect(await scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      }
      expect(browserIssues).toEqual([]);
    });
  }

  test("updates the mapped scale within the interaction budget", async ({ page }) => {
    const browserIssues = collectBrowserIssues(page);
    await openFretboard(page);
    const mode = page.getByRole("combobox", { name: "Fretboard mode" });
    const startedAt = await page.evaluate(() => performance.now());
    await mode.selectOption("lydian");
    await expect(page.getByRole("region", { name: "C Lydian scale summary" })).toBeVisible();
    const elapsed = await page.evaluate((started) => performance.now() - started, startedAt);
    expect(elapsed).toBeLessThan(500);
    expect(browserIssues).toEqual([]);
  });
});

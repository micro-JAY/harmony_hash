import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, titleSize: 32 },
  { name: "tablet", width: 800, height: 900, titleSize: 32 },
  { name: "mobile", width: 375, height: 812, titleSize: 32 },
] as const;

const WORKSPACES = [
  { button: "Tune Toolbox", title: "Tune Toolbox" },
  { button: "Fret Finder", title: "Fretboard Explorer" },
] as const;

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectHeaderChromeContained(page: Page, viewportWidth: number): Promise<void> {
  const chrome = page.locator(".tonari-brand, nav[aria-label='Workspace'] button");
  const boxes = await chrome.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right };
  }));
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewportWidth);
  }
}

test.describe("Tonari UI system", () => {
  for (const viewport of VIEWPORTS) {
    test(`aligns workspace chrome at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const inputMode = page.getByRole("group", { name: "Hasher input mode" });
      const hasherPanel = page.locator(".hh-builder-primary");
      await expect(inputMode).toBeVisible();
      await expect(hasherPanel).toBeVisible();
      const primaryControlHeights = await Promise.all([
        page.getByRole("button", { name: "Hasher", exact: true }).evaluate((element) => element.getBoundingClientRect().height),
        page.getByRole("button", { name: "Guitar", exact: true }).evaluate((element) => element.getBoundingClientRect().height),
      ]);
      for (const height of primaryControlHeights) expect(height).toBeGreaterThanOrEqual(43);
      if (viewport.name === "mobile") {
        await expect(inputMode.getByRole("button", { name: "Free Input" })).toHaveCSS("transition-duration", "0s");
      }
      const [tabsBox, panelBox] = await Promise.all([inputMode.boundingBox(), hasherPanel.boundingBox()]);
      expect(tabsBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.x).toBeGreaterThanOrEqual(15);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport.width - 15);
      await expectNoDocumentOverflow(page);
      await expectHeaderChromeContained(page, viewport.width);
      await expect(page.getByText("Service unavailable", { exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`ui-hasher-${viewport.name}.png`);

      for (const workspace of WORKSPACES) {
        await page.getByRole("button", { name: workspace.button, exact: true }).click();
        const title = page.getByRole("heading", { name: workspace.title, level: 1 });
        await expect(title).toBeVisible();
        const style = await title.evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            family: computed.fontFamily,
            size: Number.parseFloat(computed.fontSize),
            weight: computed.fontWeight,
          };
        });
        expect(style.family).toContain("Zalando Sans");
        expect(style.size).toBe(viewport.titleSize);
        expect(style.weight).toBe("700");

        const controlRail = page.locator(".hh-control-rail:visible").first();
        if (await controlRail.count()) {
          const heights = await controlRail.locator("select:visible, .hh-segmented:visible").evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().height),
          );
          expect(heights.length).toBeGreaterThan(0);
          for (const height of heights) expect(height).toBeGreaterThanOrEqual(43);
        }
        await expectNoDocumentOverflow(page);
        await expectHeaderChromeContained(page, viewport.width);
        await expect(page).toHaveScreenshot(
          `ui-${workspace.button.toLowerCase()}-${viewport.name}.png`,
        );
      }
    });
  }

  test("keeps semantic learning colors distinct from structural Tonari chrome", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const read = (token: string) => root.getPropertyValue(token).trim();
      return {
        intervalRoot: read("--music-interval-root"),
        intervalSecond: read("--music-interval-2"),
        intervalMinorThird: read("--music-interval-minor-3"),
        intervalFourth: read("--music-interval-4"),
        intervalFifth: read("--music-interval-5"),
        intervalFlatSeventh: read("--music-interval-flat-7"),
        matchLow: read("--music-match-low"),
        matchHigh: read("--music-match-high"),
        structuralBorder: read("--border-default"),
      };
    });

    expect(new Set([
      colors.intervalRoot,
      colors.intervalSecond,
      colors.intervalMinorThird,
      colors.intervalFourth,
      colors.intervalFifth,
      colors.intervalFlatSeventh,
    ]).size).toBe(6);
    expect(colors.matchLow).not.toBe(colors.matchHigh);
    expect(colors.intervalRoot).not.toBe(colors.structuralBorder);
  });

  test("contains the standardized share and modifier panels on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7"]);

    await page.getByRole("button", { name: "Share progression" }).click();
    const share = page.getByRole("dialog", { name: "Share this progression" });
    await expect(share).toBeVisible();
    await expect(share).toHaveClass(/hh-panel/);
    const shareBox = await share.boundingBox();
    expect(shareBox).not.toBeNull();
    expect(shareBox!.x).toBeGreaterThanOrEqual(0);
    expect(shareBox!.x + shareBox!.width).toBeLessThanOrEqual(375);
    await page.getByRole("button", { name: "Close share progression" }).click();

    await page.getByRole("button", { name: "Modify Cmaj7" }).click();
    const modifier = page.getByRole("region", { name: "Modify Cmaj7 chord" });
    await expect(modifier).toBeVisible();
    await expect(modifier).toHaveClass(/hh-panel/);
    const modifierBox = await modifier.boundingBox();
    expect(modifierBox).not.toBeNull();
    expect(modifierBox!.x).toBeGreaterThanOrEqual(0);
    expect(modifierBox!.x + modifierBox!.width).toBeLessThanOrEqual(375);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Progressions" }).click();
    await page.getByText("Or pick a preset", { exact: true }).click();
    await page.getByRole("combobox", { name: "Progression tonality" }).selectOption("minor");
    await page.getByRole("button", { name: "What is the Minor Blend?" }).click();
    const minorBlendTrigger = page.getByRole("button", { name: "What is the Minor Blend?" });
    const minorBlend = page.getByRole("dialog", { name: "Why is my Minor Chord different?" });
    await expect(minorBlend).toBeVisible();
    await expect(minorBlend).toHaveClass(/hh-panel/);
    await expect(minorBlend).toHaveAttribute("data-reduced-motion", "true");
    await expect(minorBlend).toHaveCSS("transition-duration", "0s");
    const closeMinorBlend = page.getByRole("button", { name: "Close minor blend help" });
    await expect(closeMinorBlend).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeMinorBlend).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeMinorBlend).toBeFocused();
    const minorBlendBox = await minorBlend.boundingBox();
    expect(minorBlendBox).not.toBeNull();
    expect(minorBlendBox!.x).toBeGreaterThanOrEqual(0);
    expect(minorBlendBox!.x + minorBlendBox!.width).toBeLessThanOrEqual(375);
    await page.keyboard.press("Escape");
    await expect(minorBlend).toBeHidden();
    await expect(minorBlendTrigger).toBeFocused();
    await expectNoDocumentOverflow(page);
  });
});

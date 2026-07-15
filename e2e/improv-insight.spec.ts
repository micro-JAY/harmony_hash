import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

interface BrowserIssue {
  type: "console" | "pageerror";
  text: string;
}

function contrastRatio(foreground: string, background: string): number {
  function luminance(color: string): number {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${color}`);
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
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

async function enterProgression(page: Page, value = "Cmaj7 Am7 Dm7 G7") {
  await composeProgression(page, value);
  await expect(page.getByRole("button", { name: "IMPROV INSIGHT" })).toHaveAttribute("aria-expanded", "false");
}

async function openInsight(page: Page) {
  const disclosure = page.getByRole("button", { name: "IMPROV INSIGHT", exact: true });
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click();
  await expect(page.getByRole("heading", { name: "IMPROV INSIGHT" })).toBeVisible();
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test.describe("IMPROV INSIGHT", () => {
  test.describe.configure({ timeout: 120_000 });

  test("lazy-loads whole-progression rankings and exposes scale metadata", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(requests.some((url) => url.includes("ImprovInsight"))).toBe(false);

    await enterProgression(page);
    expect(requests.some((url) => url.includes("ImprovInsight"))).toBe(false);
    await openInsight(page);
    expect(requests.some((url) => url.includes("ImprovInsight"))).toBe(true);
    await expect(page.getByRole("tab", { name: "Whole progression" })).toHaveAttribute("aria-selected", "true");
    const cMajor = page.locator('[data-scale-result="C Major"]');
    await expect(cMajor).toHaveAttribute("data-match", "100");
    await expect(cMajor.getByRole("meter", { name: "C Major match" })).toHaveAttribute("aria-valuenow", "100");
    const highMatchColor = await cMajor.getByText("100%").evaluate((element) => getComputedStyle(element).color);
    await expect(cMajor.getByText("100%")).toHaveCSS("color", "rgb(155, 211, 165)");
    const matchContrast = await cMajor.getByText("Match", { exact: true }).evaluate((element) => ({
      background: getComputedStyle(element.closest("article")!).backgroundColor,
      foreground: getComputedStyle(element).color,
    }));
    expect(contrastRatio(matchContrast.foreground, matchContrast.background)).toBeGreaterThanOrEqual(4.5);
    await expect(cMajor).toContainText("smooth");
    await expect(cMajor).toContainText("static");
    await expect(cMajor).toContainText("diatonic");
    await expect(cMajor).toContainText("tonal");
    const scaleTitleFont = await cMajor.getByRole("heading", { name: "C Major" }).evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
    expect(scaleTitleFont).toContain("Zalando Sans");
    const rootNote = cMajor.locator('[data-note-interval="0"]').first();
    const majorThird = cMajor.locator('[data-note-interval="4"]').first();
    await expect(rootNote).toHaveAttribute("data-scale-note", "C");
    expect(await rootNote.evaluate((element) => getComputedStyle(element).color)).not.toBe(
      await majorThird.evaluate((element) => getComputedStyle(element).color),
    );
    const metadataColors = await cMajor.locator("[data-insight-metadata] dd").evaluateAll(
      (elements) => elements.map((element) => getComputedStyle(element).color),
    );
    expect(new Set(metadataColors).size).toBe(1);
    const panelBox = await page.getByTestId("improv-insight").locator("#improv-insight-panel").boundingBox();
    const meterBox = await cMajor.getByRole("meter", { name: "C Major match" }).boundingBox();
    expect(panelBox?.width).toBeLessThanOrEqual(1152);
    expect(meterBox?.width).toBeLessThanOrEqual(224);

    await page.getByRole("button", { name: "About Improv Insight vocabulary" }).click();
    const glossary = page.getByRole("dialog", { name: "About the vocabulary" });
    await expect(glossary).toContainText("Smooth");
    await expect(glossary).toContainText("Jumpy");
    await expect(glossary).toContainText("Rises");
    await expect(glossary).toContainText("Static");
    await expect(glossary).toContainText("Falls");
    await expect(glossary).toContainText("Diatonic");
    await expect(glossary).toContainText("Chromatic");
    await expect(glossary).toContainText("Tonal");
    await expect(glossary).toContainText("Modal");
    await expect(glossary).toContainText("Blues");
    await page.getByRole("button", { name: "Close Improv Insight vocabulary" }).click();
    await expect(page.getByRole("button", { name: "About Improv Insight vocabulary" })).toBeFocused();

    await composeProgression(page, "Cmaj7 Dm7 G7#9 Cmaj7");
    await openInsight(page);
    await expect(cMajor).toHaveAttribute("data-match", "88");
    const lowerMatchColor = await cMajor.getByText("88%").evaluate((element) => getComputedStyle(element).color);
    expect(lowerMatchColor).not.toBe(highMatchColor);
    expect(issues).toEqual([]);

    await expect(page).toHaveScreenshot("improv-insight-desktop.png", { fullPage: true });
  });

  test("supports keyboard tabs and per-chord ranking within the latency budget", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await enterProgression(page);
    await openInsight(page);
    const wholeProgression = page.getByRole("tab", { name: "Whole progression" });
    await wholeProgression.focus();
    const startedAt = await page.evaluate(() => performance.now());
    await wholeProgression.press("ArrowRight");
    const perChord = page.getByRole("tab", { name: "Per chord" });
    await expect(perChord).toBeFocused();
    await expect(perChord).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "4. G7", exact: true }).click();
    await expect(page.locator('[data-scale-result="G Mixolydian"]')).toHaveAttribute("data-match", "100");
    await expect(page.locator('[data-scale-result="G Mixolydian"]')).toContainText("modal");
    const elapsed = await page.evaluate((start) => performance.now() - start, startedAt);
    expect(elapsed).toBeLessThan(500);
    const disclosure = page.getByRole("button", { name: "IMPROV INSIGHT", exact: true });
    await disclosure.click();
    await expect(disclosure).toBeFocused();
    await expect(page.getByRole("heading", { name: "IMPROV INSIGHT" })).toBeHidden();
    expect(issues).toEqual([]);
  });

  test("uses flat-key labels and degree spelling for flat-root progressions", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await enterProgression(page, "bbmaj7 ebmaj7 f7");
    await openInsight(page);

    const bFlatMajor = page.locator('[data-scale-result="Bb Major"]');
    await expect(bFlatMajor).toBeVisible();
    await expect(bFlatMajor.locator("[data-scale-note]")).toHaveText(["Bb", "C", "D", "Eb", "F", "G", "A"]);
    await expect(page.locator('[data-scale-result="A# Major"]')).toHaveCount(0);

    await composeProgression(page, "Bfmaj7 Efmaj7 F7");
    await openInsight(page);
    await expect(bFlatMajor).toBeVisible();
    await expect(page.locator('[data-scale-result="A# Major"]')).toHaveCount(0);
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "tablet", width: 820, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains rankings at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await enterProgression(page, "Cmaj7 Dm7 G7#9 Cmaj7");
      await openInsight(page);
      await expectNoDocumentOverflow(page);
      await expect(page.getByTestId("improv-insight")).toHaveAttribute(
        "data-reduced-motion",
        viewport.name === "mobile" ? "true" : "false",
      );
      const results = page.locator("[data-scale-result]");
      await expect(results).toHaveCount(6);
      await expect(results.first().getByRole("meter")).toBeVisible();
      expect(issues).toEqual([]);
    });
  }
});

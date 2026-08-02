import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function expectInsightActionPalette(button: Locator) {
  await expect(button).toHaveAttribute("style", /--music-insight-action-bg/);
  await expect(button).toHaveAttribute("style", /--music-insight-action-text/);
  await expect(button).toHaveAttribute("style", /--music-insight-action-border/);
  const colors = await button.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    foreground: getComputedStyle(element).color,
  }));
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
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
    await expectInsightActionPalette(page.getByRole("button", { name: "IMPROV INSIGHT", exact: true }));
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
    const styleMetadata = cMajor.locator('[data-insight-metadata="style"]');
    const motionMetadata = cMajor.locator('[data-insight-metadata="motion"]');
    await expect(styleMetadata).toHaveAttribute("data-insight-tone", "pink");
    await expect(motionMetadata).toHaveAttribute("data-insight-tone", "pink");
    await expect(styleMetadata).toHaveAttribute("style", /--music-insight-surface-bg/);
    expect(await styleMetadata.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      await motionMetadata.evaluate((element) => getComputedStyle(element).backgroundColor),
    );
    expect(await styleMetadata.locator("dd").evaluate((element) => getComputedStyle(element).color)).toBe(
      await motionMetadata.locator("dd").evaluate((element) => getComputedStyle(element).color),
    );
    const panelBox = await page.getByTestId("improv-insight").locator("#improv-insight-panel").boundingBox();
    const meterBox = await cMajor.getByRole("meter", { name: "C Major match" }).boundingBox();
    expect(panelBox?.width).toBeLessThanOrEqual(1152);
    expect(meterBox?.width).toBeLessThanOrEqual(224);

    const vocabularyButton = page.getByRole("button", { name: "About Improv Insight vocabulary" });
    const vocabularyIcon = page.getByTestId("improv-vocabulary-icon");
    const [buttonVisual, iconVisual] = await Promise.all([
      vocabularyButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, width: element.getBoundingClientRect().width };
      }),
      vocabularyIcon.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          background: style.backgroundColor,
          borderRadius: style.borderRadius,
          width: rect.width,
          height: rect.height,
        };
      }),
    ]);
    expect(buttonVisual.background).toBe("rgba(0, 0, 0, 0)");
    expect(buttonVisual.width).toBe(44);
    expect(iconVisual.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(iconVisual.width).toBe(20);
    expect(iconVisual.height).toBe(20);
    expect(Number.parseFloat(iconVisual.borderRadius)).toBeGreaterThanOrEqual(10);

    await vocabularyButton.click();
    const glossary = page.getByRole("dialog", { name: "About the vocabulary" });
    await expect(glossary).toContainText("Motion");
    await expect(glossary).toContainText("How the scale line tends to move.");
    await expect(glossary).toContainText("Smooth");
    await expect(glossary).toContainText("Jumpy");
    await expect(glossary).toContainText("Stepwise, connected movement.");
    await expect(glossary).toContainText("Larger leaps and skips.");
    await expect(glossary).toContainText("Tension");
    await expect(glossary).toContainText("How the line creates or releases pull.");
    await expect(glossary).toContainText("Rises");
    await expect(glossary).toContainText("Static");
    await expect(glossary).toContainText("Falls");
    await expect(glossary).toContainText("Builds tension.");
    await expect(glossary).toContainText("Holds tension.");
    await expect(glossary).toContainText("Releases tension.");
    await expect(glossary).toContainText("Palette");
    await expect(glossary).toContainText("Which notes shape the sound.");
    await expect(glossary).toContainText("Diatonic");
    await expect(glossary).toContainText("Chromatic");
    await expect(glossary).toContainText("Mostly notes from the home key.");
    await expect(glossary).toContainText("Includes notes outside the home key.");
    await expect(glossary).toContainText("Style");
    await expect(glossary).toContainText("The broad musical context.");
    await expect(glossary).toContainText("Tonal");
    await expect(glossary).toContainText("Modal");
    await expect(glossary).toContainText("Blues");
    await expect(glossary).toContainText("Functional harmony centered on a key.");
    await expect(glossary).toContainText("Mode-based harmony and color.");
    await expect(glossary).toContainText("Blues and blues-derived language.");
    await page.getByRole("button", { name: "Close Improv Insight vocabulary" }).click();
    await expect(page.getByRole("button", { name: "About Improv Insight vocabulary" })).toBeFocused();
    await page.getByRole("button", { name: "About Improv Insight vocabulary" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "About Improv Insight vocabulary" })).toBeFocused();
    await page.getByRole("button", { name: "About Improv Insight vocabulary" }).click();
    await page.locator('[data-dialog-backdrop="true"]').click({ position: { x: 2, y: 2 } });
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
    await expect(perChord).toHaveAttribute("style", /--music-insight-surface-bg/);
    await page.getByRole("button", { name: "4. G7", exact: true }).click();
    const selectedScope = page.locator('[data-insight-chord-scope="G7"]');
    await expect(selectedScope).toHaveAttribute("style", /--music-insight-surface-bg/);
    await expect(selectedScope.locator('[data-chord-family="dominant"]')).toBeVisible();
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

  test("keeps Circle-origin Improv local and restores the exact launcher and state", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await enterProgression(page);
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await page.locator("#theory-root").selectOption("D");
    await page.locator("#theory-scale").selectOption("dorian");
    await page.locator("#theory-mood").selectOption("jazzy");

    const circleDisclosure = page.locator('button[aria-controls="theory-tool-circle"]');
    if (await circleDisclosure.getAttribute("aria-expanded") !== "true") await circleDisclosure.click();
    const circleLauncher = page.locator("#circle-improv-trigger");
    await expect(page.locator("#theory-circle-improv-trigger")).toHaveCount(0);
    await expectInsightActionPalette(circleLauncher);
    await circleLauncher.click();

    await expect(page.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#theory-improv-insight")).toBeFocused();
    await expect(page.getByTestId("improv-insight").getByTestId("improv-theory-context"))
      .toContainText("Circle context: D Dorian");
    await page.getByTestId("improv-insight").getByRole("button", { name: "Close IMPROV INSIGHT" }).click();
    await expect(circleLauncher).toBeFocused();
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(page.locator("#theory-mood")).toHaveValue("jazzy");
    await expect(page.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByRole("button", { name: "Piano", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    expect(issues).toEqual([]);
  });

  test("renders the same Ab minor-third color across Improv, Scale Synthesia, and FRET FINDER", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await enterProgression(page, "Fadd9 Fm6");
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await page.locator("#theory-root").selectOption("F");
    await page.locator("#theory-scale").selectOption("major_blues");
    await expect(page.locator("#theory-circle-improv-trigger")).toHaveCount(0);
    const circleDisclosure = page.locator('button[aria-controls="theory-tool-circle"]');
    if (await circleDisclosure.getAttribute("aria-expanded") !== "true") await circleDisclosure.click();
    await page.locator("#circle-improv-trigger").click();

    const improvAb = page.locator('[data-scale-result="F Major Blues"] [data-scale-note="Ab"]');
    await expect(improvAb).toBeVisible();
    await expect(improvAb.locator(".." )).toHaveAttribute("aria-label", "Ab, Minor third");
    const improvColor = await improvAb.evaluate((element) => getComputedStyle(element).color);

    await page.getByTestId("improv-insight").getByRole("button", { name: "Close IMPROV INSIGHT" }).click();
    const scaleDisclosure = page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first();
    if (await scaleDisclosure.getAttribute("aria-expanded") !== "true") await scaleDisclosure.click();
    const synthAb = page.getByTestId("scale-synthesia")
      .getByRole("list", { name: "Scale notes" })
      .getByRole("listitem")
      .filter({ hasText: /^Ab/ });
    await expect(synthAb).toBeVisible();
    expect(await synthAb.evaluate((element) => getComputedStyle(element).color)).toBe(improvColor);

    await page.getByRole("button", { name: "FRET FINDER", exact: true }).click();
    await page.getByRole("combobox", { name: "Fretboard root" }).selectOption("F");
    await page.getByRole("combobox", { name: "Fretboard mode" }).selectOption("major_blues");
    const fretAb = page.getByRole("list", { name: "Scale notes and intervals" })
      .getByRole("listitem")
      .filter({ hasText: /^Ab/ });
    await expect(fretAb).toBeVisible();
    expect(await fretAb.evaluate((element) => getComputedStyle(element).color)).toBe(improvColor);
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
      if (viewport.name === "mobile") {
        await page.getByRole("button", { name: "Switch language to Japanese" }).click();
        const help = page.getByRole("button", { name: "Improv Insightの用語について" });
        await help.click();
        const glossary = page.getByRole("dialog", { name: "用語について" });
        await expect(glossary).toContainText("スケールの旋律線がどのように動く傾向かを示します。");
        await expect(glossary).toHaveAttribute("data-reduced-motion", "true");
        await page.keyboard.press("Escape");
        await expect(help).toBeFocused();
        await expectNoDocumentOverflow(page);
      }
      expect(issues).toEqual([]);
    });
  }
});

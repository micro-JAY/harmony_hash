import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

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

async function openNetwork(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Note Neural Network" })).toBeVisible();
}

test.describe("Note Neural Network", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders the exact E harmonic-minor relative network", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openNetwork(page);

    const network = page.getByRole("listbox", {
      name: "E Harmonic Minor relative mode relationships",
    });
    await expect(network.getByRole("option")).toHaveCount(7);
    expect(await network.getByRole("option").evaluateAll((options) =>
      options.map((option) => option.getAttribute("aria-label")),
    )).toEqual([
      "E Harmonic Minor. Raised seventh over a minor sixth",
      "F# Locrian natural 6. Natural sixth over a flat fifth",
      "G Ionian sharp 5. Sharp fifth over a major third",
      "A Dorian sharp 4. Raised fourth over a minor third",
      "B Phrygian Dominant. Major third over a flat second",
      "C Lydian sharp 2. Augmented second with a raised fourth",
      "D# Altered Diminished. Diminished seventh with a flat fifth",
    ]);
    const details = page.getByRole("complementary", { name: "E Harmonic Minor details" });
    await expect(details).toContainText("E · F# · G · A · B · C · D#");
    await expect(details).toContainText("1 · 2 · b3 · 4 · 5 · b6 · 7");
    await expect(details).toContainText("W · H · W · W · H · 1½ · H");
    await expect(page.getByTestId("note-neural-network")).toHaveScreenshot(
      "note-neural-network-desktop.png",
    );
    expect(issues).toEqual([]);
  });

  test("supports pointer and roving-keyboard selection", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const options = page.getByRole("listbox").getByRole("option");

    await options.nth(1).click();
    await expect(page.getByRole("complementary", { name: "F# Locrian natural 6 details" }))
      .toBeVisible();
    await expect(options.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(options.nth(1).locator("circle")).toHaveAttribute("cx", "350");
    await expect(options.nth(1).locator("circle")).toHaveAttribute("cy", "340");
    await options.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("complementary", { name: "G Ionian sharp 5 details" }))
      .toBeVisible();
    await expect(options.nth(2)).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("complementary", { name: "D# Altered Diminished details" }))
      .toBeVisible();
    await page.keyboard.press("Home");
    await expect(page.getByRole("complementary", { name: "E Harmonic Minor details" }))
      .toBeVisible();
    expect(issues).toEqual([]);
  });

  test("switches between parallel roots and all four mode families", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const family = page.getByRole("combobox", { name: "Family" });

    await page.getByRole("button", { name: "parallel" }).click();
    await expect(page.getByRole("listbox", {
      name: "E Harmonic Minor parallel mode relationships",
    })).toBeVisible();
    const optionNames = await page.getByRole("listbox").getByRole("option")
      .evaluateAll((options) => options.map((option) => option.getAttribute("aria-label")));
    expect(optionNames.every((name) => name?.startsWith("E "))).toBe(true);

    for (const [value, label] of [
      ["major", "Major"],
      ["natural_minor", "Natural Minor"],
      ["harmonic_minor", "Harmonic Minor"],
      ["melodic_minor", "Melodic Minor"],
    ] as const) {
      await family.selectOption(value);
      await expect(page.getByRole("listbox", {
        name: `E ${label} parallel mode relationships`,
      }).getByRole("option")).toHaveCount(7);
    }
    expect(issues).toEqual([]);
  });

  test("opens the selected node in Scale Synthesia", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox", { name: "Mood or genre lens" }).selectOption("bright");
    await page.getByRole("button", { name: "Network", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Note Neural Network" })).toBeVisible();
    await page.getByRole("listbox").getByRole("option").nth(4).click();
    await page.getByRole("button", { name: "Open in Scale Synthesia" }).click();

    await expect(page.getByRole("heading", { name: "Scale Synthesia" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Root" })).toHaveValue("B");
    await expect(page.getByRole("combobox", { name: "Family" })).toHaveValue(
      "harmonic_minor_modes",
    );
    await expect(page.getByRole("combobox", { name: "Scale or mode" })).toHaveValue(
      "phrygian_dominant",
    );
    await expect(page.getByRole("combobox", { name: "Mood lens" })).toHaveValue("");
    await expect(page.getByText("B Phrygian Dominant · Ascending", { exact: true })).toBeVisible();
    expect(issues).toEqual([]);
  });

  test("keeps the Hasher timeline and hides Hanz outside the Hasher", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await page.getByRole("textbox", { name: "Describe the progression you want" }).fill("help me reharmonize this");
    await page.getByRole("button", { name: /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/ }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();

    await page.getByRole("button", { name: "Network", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Note Neural Network" })).toBeVisible();
    await page.getByRole("combobox", { name: "Root" }).selectOption("D");
    await page.getByRole("combobox", { name: "Family" }).selectOption("melodic_minor");
    await page.getByRole("button", { name: "parallel" }).click();
    await page.getByRole("listbox").getByRole("option").nth(3).click();
    await expect(page.getByRole("complementary", { name: "D Lydian Dominant details" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Hasher", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await page.getByRole("button", { name: "Network", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Root" })).toHaveValue("D");
    await expect(page.getByRole("combobox", { name: "Family" })).toHaveValue("melodic_minor");
    await expect(page.getByRole("button", { name: "parallel" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("complementary", { name: "D Lydian Dominant details" }))
      .toBeVisible();
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains the full network at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openNetwork(page);

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )).toBe(false);
      await expect(page.getByTestId("note-neural-network")).toHaveAttribute(
        "data-reduced-motion",
        viewport.name === "mobile" ? "true" : "false",
      );
      await expect(page.getByRole("complementary", { name: "E Harmonic Minor details" }))
        .toBeVisible();
      if (viewport.name === "mobile") {
        expect(await page.getByTestId("mode-network-graph-scroller").evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        )).toBe(true);
        const rootSize = await page.getByRole("option", { name: /^E Harmonic Minor/ })
          .locator("text").first()
          .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
        expect(rootSize).toBeGreaterThanOrEqual(20);
        const animations = await page.getByTestId("note-neural-network").evaluate(
          (element) => element.getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
        );
        expect(animations).toBe(0);
        await expect(page.getByRole("navigation", { name: "Workspace" })).toBeVisible();
      }
      expect(issues).toEqual([]);
    });
  }
});

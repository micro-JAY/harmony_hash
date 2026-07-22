import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

const INTERVAL_TOKENS = [
  "--music-interval-root",
  "--music-interval-flat-2",
  "--music-interval-2",
  "--music-interval-minor-3",
  "--music-interval-major-3",
  "--music-interval-4",
  "--music-interval-tritone",
  "--music-interval-5",
  "--music-interval-flat-6",
  "--music-interval-6",
  "--music-interval-flat-7",
  "--music-interval-major-7",
] as const;

async function expectIntervalPaint(
  locator: Locator,
  property: "backgroundColor" | "fill",
): Promise<void> {
  const presentations = await locator.evaluateAll((elements, args) => elements.map((element) => {
    const interval = Number(element.getAttribute("data-note-interval"));
    const probe = document.createElement("span");
    probe.style.color = `var(${args.tokens[interval]})`;
    document.body.appendChild(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return {
      actual: getComputedStyle(element)[args.property],
      expected,
      interval,
    };
  }), { property, tokens: INTERVAL_TOKENS });

  expect(presentations.length).toBeGreaterThan(0);
  for (const presentation of presentations) {
    expect(presentation.interval).toBeGreaterThanOrEqual(0);
    expect(presentation.interval).toBeLessThanOrEqual(11);
    expect(presentation.actual).toBe(presentation.expected);
  }
}

async function expectContained(page: Page, locator: Locator): Promise<void> {
  const [box, viewport] = await Promise.all([
    locator.boundingBox(),
    page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })),
  ]);
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
}

test.describe("HASHER output learning controls", () => {
  test("keeps the icon instrument selector beneath Run across widths and workspaces", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "G7"]);

    const header = page.locator("header").first();
    const navigation = page.getByRole("navigation", { name: "Workspace" });
    const instrument = page.getByRole("group", { name: "Instrument" });
    const run = page.getByRole("button", { name: "Run chord composer" });
    const browse = page.getByRole("button", { name: /Browse chords/ });
    const undo = page.getByRole("button", { name: /undo/i });

    await expect(header.getByRole("group", { name: "Instrument" })).toHaveCount(0);
    await expect(page.getByTestId("hasher-interval-legend")).toHaveCount(0);
    await expect(instrument.getByRole("button", { name: "Guitar" })).toHaveText("");
    await expect(instrument.getByRole("button", { name: "Piano" })).toHaveText("");
    await expect(instrument.locator("svg")).toHaveCount(2);
    await expect(browse).toHaveCSS("min-height", "44px");
    await expect(undo).toHaveCSS("min-height", "44px");

    for (const viewport of [
      { width: 1500, height: 900 },
      { width: 820, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await expectContained(page, instrument);
      const [navigationBox, instrumentBox, runBox] = await Promise.all([
        navigation.boundingBox(),
        instrument.boundingBox(),
        run.boundingBox(),
      ]);
      expect(navigationBox).not.toBeNull();
      expect(Math.abs(navigationBox!.x + navigationBox!.width / 2 - viewport.width / 2))
        .toBeLessThanOrEqual(2);
      expect(instrumentBox!.y).toBeGreaterThanOrEqual(runBox!.y + runBox!.height - 1);
      expect(Math.abs(instrumentBox!.x + instrumentBox!.width - (runBox!.x + runBox!.width)))
        .toBeLessThanOrEqual(1);
    }

    await page.getByRole("button", { name: "Switch language to Japanese" }).click();
    await page.getByRole("button", { name: "ピアノ", exact: true }).click();
    await page.getByRole("button", { name: "チューン・ツールボックス", exact: true }).click();
    await page.getByRole("button", { name: "ハッシャー", exact: true }).click();
    await expect(page.getByRole("button", { name: "ピアノ", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("chord-card")).toHaveCount(2);
  });

  test("shows note-role tooltips on Guitar positions and Piano keys", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Bsus4"]);

    const card = page.getByTestId("chord-card");
    const diagram = card.getByTestId("guitar-chord-diagram");
    await expect(diagram.locator('[data-position-source="circle"]')).not.toHaveCount(0);
    await expect(diagram.locator('[data-position-source="barre"]')).not.toHaveCount(0);
    await expect(diagram.locator('text[x="20"]')).toHaveText(["2", "3", "4", "5"]);
    await expect(diagram.locator('[data-note-tooltip="true"]')).not.toHaveCount(0);

    for (const mode of ["Fingering", "Intervals", "Notes"]) {
      await card.getByRole("button", { name: mode, exact: true }).click();
      await expectIntervalPaint(diagram.locator("[data-played-position][data-note-interval]"), "fill");
    }

    const guitarRoot = diagram.locator('[data-tooltip-degree="1"]').first();
    await guitarRoot.hover();
    await expect(diagram.getByTestId("note-role-tooltip")).toContainText("1");
    await expect(diagram.getByTestId("note-role-tooltip")).toContainText("Root");
    await guitarRoot.focus();
    await expect(guitarRoot).toHaveAttribute("aria-label", /· 1 · Root$/);

    await page.getByRole("button", { name: "Piano", exact: true }).click();
    const keyboard = card.getByTestId("piano-keyboard");
    await expect(keyboard).toHaveAttribute("data-color-mode", "interval");
    const activeKeys = keyboard.locator('[data-note-interval][class*="piano-key-active"]');
    await expectIntervalPaint(activeKeys, "backgroundColor");
    const perfectFourth = keyboard.locator('[data-tooltip-degree="4"]').first();
    await perfectFourth.hover();
    await expect(keyboard.getByTestId("note-role-tooltip")).toContainText("Perfect fourth");
    await perfectFourth.focus();
    await expect(perfectFourth).toHaveAttribute("aria-label", /· 4 · Perfect fourth$/);
  });
});

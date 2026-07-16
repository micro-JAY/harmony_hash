import { expect, test, type Locator, type Page } from "@playwright/test";
import { contrastRatio } from "./helpers/contrast";
import { composeProgression } from "./helpers/progression";

const FAMILY_CHORDS = [
  ["Cmaj7", "major"],
  ["Cm7", "minor"],
  ["G7", "dominant"],
  ["Csus4", "suspended"],
  ["Cdim", "diminished"],
  ["Caug", "augmented"],
] as const;

async function expectFamilyPresentation(locator: Locator, family: typeof FAMILY_CHORDS[number][1]) {
  const colors = await locator.evaluate((element, expectedFamily) => {
    const tokenName = expectedFamily === "suspended"
      ? "--music-chord-sus"
      : `--music-chord-${expectedFamily}`;
    const probe = document.createElement("span");
    probe.style.color = `var(${tokenName})`;
    document.body.append(probe);
    const tokenColor = getComputedStyle(probe).color;
    probe.remove();
    const style = getComputedStyle(element);
    return {
      foreground: style.color,
      background: style.backgroundColor,
      tokenColor,
    };
  }, family);
  if (family === "dominant") expect(colors.background).toBe(colors.tokenColor);
  else expect(colors.foreground).toBe(colors.tokenColor);
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
}

async function openChordGrid(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Browse chords/ }).click();
  await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
}

test.describe("global chord-family presentation", () => {
  test("colors all six composer-chip and rendered-card families", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, FAMILY_CHORDS.map(([chord]) => chord));

    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const cards = page.getByTestId("chord-card");
    for (const [chord, family] of FAMILY_CHORDS) {
      const chip = composer.getByRole("button", { name: new RegExp(`^${chord}, position`) });
      const heading = cards.getByRole("heading", { name: chord });
      await expect(chip).toHaveAttribute("data-chord-family", family);
      await expect(heading).toHaveAttribute("data-chord-family", family);
      await expectFamilyPresentation(chip, family);
      await expectFamilyPresentation(heading, family);

      const card = cards.filter({ has: page.getByRole("heading", { name: chord, exact: true }) });
      await card.getByRole("button", { name: `Modify ${chord}`, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: `Modify ${chord} chord`, exact: true });
      const dialogChord = dialog.getByRole("heading", { name: `Modify ${chord} chord`, exact: true })
        .locator(`[data-chord-family="${family}"]`);
      await expect(dialogChord).toBeVisible();
      await expectFamilyPresentation(dialogChord, family);
      await dialog.getByRole("button", { name: "Close chord modifier", exact: true }).click();
    }
  });

  test("colors every grid family while keeping blue roots and match scores independent", async ({ page }) => {
    await openChordGrid(page);
    const panel = page.getByTestId("chord-grid-panel");

    for (const [header, family] of [["M", "major"], ["m", "minor"], ["7", "dominant"]] as const) {
      const familyHeader = panel.getByTestId(`chord-quality-header-${header}`);
      await expect(familyHeader).toHaveAttribute("data-chord-family", family);
      await expectFamilyPresentation(familyHeader, family);
    }

    const root = panel.getByTestId("chord-root-label-C");
    const rootColor = await root.evaluate((element) => getComputedStyle(element).color);
    await expect(root).toHaveAttribute("data-root-color", "blue");
    await page.getByRole("button", { name: "Key chord suggestions" }).click();
    await expect(root).toHaveCSS("color", rootColor);

    const dominantHeader = panel.getByTestId("chord-quality-header-7");
    const c7 = panel.locator('button[data-chord-name="C7"]');
    const score = c7.locator("span").last();
    await expect(c7).toHaveAttribute("data-fit-score", /\d+/);
    const [headerColor, scoreColor] = await Promise.all([
      dominantHeader.evaluate((element) => getComputedStyle(element).color),
      score.evaluate((element) => getComputedStyle(element).color),
    ]);
    expect(scoreColor).not.toBe(headerColor);

    await page.getByRole("button", { name: "Sus", exact: true }).click();
    const suspendedHeader = panel.getByTestId("chord-quality-header-sus4");
    await expect(suspendedHeader).toHaveAttribute("data-chord-family", "suspended");
    await expectFamilyPresentation(suspendedHeader, "suspended");
    await page.getByRole("button", { name: "Alt", exact: true }).click();
    const diminishedHeader = panel.getByTestId("chord-quality-header-dim");
    const augmentedHeader = panel.getByTestId("chord-quality-header-aug");
    await expect(diminishedHeader).toHaveAttribute("data-chord-family", "diminished");
    await expect(augmentedHeader).toHaveAttribute("data-chord-family", "augmented");
    await expectFamilyPresentation(diminishedHeader, "diminished");
    await expectFamilyPresentation(augmentedHeader, "augmented");

    await expect(panel.locator('button[data-chord-name] [data-chord-family]')).toHaveCount(0);
  });

  test("colors Circle diatonic chord labels without replacing relationship text", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    const list = page.getByRole("list", { name: "C Major (Ionian) Diatonic chords" });
    const labels = list.locator("[data-chord-family]");
    await expect(labels).toHaveCount(7);
    expect(await labels.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute("data-chord-family"))
    ))).toEqual([
      "major", "minor", "minor", "major", "major", "minor", "diminished",
    ]);
    await expect(list).toContainText("Tonic");
    await expect(list).toContainText("Dominant");
    const relationshipChord = page.getByRole("heading", { name: "Relationships", exact: true })
      .locator("..").locator("[data-chord-family]").first();
    await expect(relationshipChord).toBeVisible();
  });

  test("colors chord nodes throughout NOTE NEURAL NETWORK without replacing selection state", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first().click();
    const network = page.getByTestId("note-neural-network");
    const chordNodes = network.locator("[data-network-node][data-chord-family]");
    await expect(chordNodes).not.toHaveCount(0);
    const semanticChordLabels = network.getByRole("list", { name: "Network nodes" })
      .locator("[data-chord-family]");
    await expect(semanticChordLabels).not.toHaveCount(0);
    await semanticChordLabels.first().click();
    await expect(network.locator("h2[data-chord-family]")).toBeVisible();
  });

  test("colors FRET FINDER overlay results, selection, and readout", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "FRET FINDER", exact: true }).click();
    await page.getByRole("button", { name: "Choose a chord" }).click();
    await page.getByRole("searchbox", { name: "Search chord overlay" }).fill("G7#9");
    const result = page.getByRole("list", { name: "Chord overlay results" })
      .getByRole("button", { name: /^G7#9 / });
    await expect(result.locator('[data-chord-family="dominant"]')).toBeVisible();
    await result.click();

    await expect(page.getByRole("button", { name: "Overlay: G7#9" })
      .locator('[data-chord-family="dominant"]')).toBeVisible();
    await expect(page.getByTestId("fretboard-overlay-readout"))
      .toHaveAttribute("data-chord-family", "dominant");
    await expect(page.getByTestId("fretboard-scroller")).toHaveAttribute("data-overlay", "G7#9");
  });
});

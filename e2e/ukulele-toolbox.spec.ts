import { expect, test } from "@playwright/test";
import { composeProgression } from "./helpers/progression";
import { openFretFinder } from "./helpers/toolbox";

test("keeps four persistent toolbox panels with shared scale controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
  expect(await page.locator("[data-theory-tool]").evaluateAll((panels) =>
    panels.map((panel) => panel.getAttribute("data-theory-tool")),
  )).toEqual(["fretboard", "scales", "circle", "network"]);
  await openFretFinder(page, false);
  const fretboard = page.getByTestId("fretboard-workspace");
  await expect(fretboard.getByRole("combobox")).toHaveCount(0);
  await page.locator("#theory-root").selectOption("D");
  await page.locator("#theory-scale").selectOption("dorian");
  await fretboard.getByRole("button", { name: "Ukulele", exact: true }).click();
  await expect(fretboard.getByTestId("fretboard-scroller")).toHaveAttribute("data-tuning", "ukulele-standard");
  await expect(fretboard.locator('button[data-root="true"]').first()).toHaveAttribute("data-note", "D");
  await openFretFinder(page);
  await fretboard.getByRole("button", { name: "Left-handed", exact: true }).click();
  const disclosure = page.locator('button[aria-controls="theory-tool-fretboard"]');
  await disclosure.click();
  await expect(fretboard).toBeHidden();
  await page.getByRole("button", { name: "HASHER", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guitar", exact: true })).toHaveAttribute("aria-pressed", "true");
  await openFretFinder(page, false);
  await expect(fretboard.getByTestId("fretboard-scroller")).toHaveAttribute("data-handedness", "left");
  await expect(fretboard.getByTestId("fretboard-scroller")).toHaveAttribute("data-tuning", "ukulele-standard");
  await expect(page.locator("#theory-root")).toHaveValue("D");
});

test("preserves unsupported ukulele chords as timed rests and round-trips the progression", async ({ page }) => {
  await page.goto("/");
  await composeProgression(page, ["C", "F#maj9", "G7"]);
  await page.getByRole("button", { name: "Ukulele", exact: true }).click();
  const cards = page.getByTestId("chord-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(1).getByTestId("ukulele-unavailable")).toContainText("as a rest");
  await expect(page.getByTestId("ukulele-chord-diagram")).toHaveCount(2);
  await page.getByRole("button", { name: "Play progression", exact: true }).click();
  await expect(cards.nth(1)).toHaveAttribute("data-playing", "true");
  await expect(cards.nth(2)).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "Stop playback", exact: true }).click();

  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  const share = page.getByRole("dialog", { name: "Share this progression" });
  await expect(share.getByRole("button", { name: "Download MIDI (.mid)" })).toBeEnabled();
  const link = await share.getByRole("textbox", { name: "Shareable progression link" }).inputValue();
  expect(new URL(link).searchParams.get("instrument")).toBe("ukulele");
  await page.goto(link);
  await expect(page.getByRole("button", { name: "Ukulele", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["C", "F#maj9", "G7"]);
  await expect(page.getByTestId("ukulele-unavailable")).toHaveCount(1);

  await composeProgression(page, ["F#maj9"]);
  await expect(page.getByRole("button", { name: "Play progression", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Share this progression" }))
    .toContainText("No playable ukulele shapes are available for MIDI export.");
});

for (const width of [1280, 375]) {
  test(`contains ukulele and aligned optional controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await composeProgression(page, ["C", "Am", "F", "G7", "C13"]);
    await page.getByRole("button", { name: "Ukulele", exact: true }).click();
    await expect(page.getByTestId("ukulele-chord-diagram")).toHaveCount(5);
    await expect(page.getByTestId("ukulele-chord-diagram").first()).toHaveAttribute("data-frets", "0-0-0-3");
    await expect(page.getByTestId("ukulele-omissions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play progression", exact: true })).toBeEnabled();
    const firstCard = page.getByTestId("chord-card").first();
    const initialShape = await firstCard.getByTestId("ukulele-chord-diagram").getAttribute("data-frets");
    await firstCard.getByRole("button", { name: /Lock/ }).click();
    await page.getByRole("button", { name: "RANDOMIZE (UNLOCKED VOICES)", exact: true }).click();
    await expect(firstCard.getByTestId("ukulele-chord-diagram")).toHaveAttribute("data-frets", initialShape!);
    await page.getByRole("button", { name: "Piano", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(5);
    await expect(page.getByTestId("ukulele-chord-diagram")).toHaveCount(0);
    await page.getByRole("button", { name: "Ukulele", exact: true }).click();
    await expect(firstCard.getByTestId("ukulele-chord-diagram")).toHaveAttribute("data-frets", initialShape!);
    await openFretFinder(page);
    const controls = page.getByRole("region", { name: "Fretboard display settings" });
    const heights = await controls.locator("select, .hh-segmented").evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

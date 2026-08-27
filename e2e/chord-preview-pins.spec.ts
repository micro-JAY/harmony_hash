import { expect, test } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

test("delays preview, promotes a silent full card, and preserves the pin across app workspaces", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __audioContextConstructions?: number };
    testWindow.__audioContextConstructions = 0;
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(contextOptions?: AudioContextOptions) {
        super(contextOptions);
        testWindow.__audioContextConstructions =
          (testWindow.__audioContextConstructions ?? 0) + 1;
      }
    };
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/API ready|Service unavailable/, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();

  const grid = page.getByTestId("chord-grid-panel");
  const cell = grid.locator('[data-chord-name="Cmaj7"]');
  const preview = page.getByTestId("chord-hover-preview");
  await page.waitForTimeout(250);
  await cell.hover();
  expect(await cell.evaluate((element) => element.matches(":hover"))).toBe(true);
  await page.waitForTimeout(1_400);
  expect(await preview.count()).toBe(0);
  await page.waitForTimeout(200);
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-instrument", "guitar");
  await expect(preview.getByRole("button", { name: "Lock chord card" })).toHaveCount(0);

  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();
  await expect(preview).toHaveCount(0);
  const pin = page.getByTestId("pinned-chord-card").first();
  await expect(pin).toBeVisible();
  await expect(pin.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
  await pin.getByRole("button", { name: "Modify Cmaj7" }).click();
  await page.getByRole("dialog", { name: "Modify Cmaj7 chord" })
    .getByRole("button", { name: "Change Cmaj7 to C6", exact: true })
    .click();
  await expect(pin.getByRole("heading", { name: "C6" })).toBeVisible();
  await expect(pin.getByRole("group", { name: "Guitar labels for C6" })).toBeVisible();
  await expect(pin.getByRole("button", { name: "Lock chord card" })).toHaveCount(0);

  const pinBeforeControl = await pin.boundingBox();
  await pin.getByRole("button", { name: "Next guitar variant" }).click();
  await expect(pin).toContainText("2 /");
  const pinAfterControl = await pin.boundingBox();
  expect(pinAfterControl?.x).toBe(pinBeforeControl?.x);
  expect(pinAfterControl?.y).toBe(pinBeforeControl?.y);

  const handle = pin.getByRole("button", { name: "Move pinned chord card: C6" });
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("Pinned chord drag handle has no bounds");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 180, { steps: 8 });
  await page.mouse.up();
  const draggedBox = await pin.boundingBox();
  expect(draggedBox).not.toBeNull();
  expect(draggedBox!.x).toBeGreaterThanOrEqual(-1);
  expect(draggedBox!.y).toBeGreaterThanOrEqual(-1);
  expect(draggedBox!.x + draggedBox!.width).toBeLessThanOrEqual(1_281);
  expect(draggedBox!.y + draggedBox!.height).toBeLessThanOrEqual(721);

  await page.getByRole("button", { name: "Tune Toolbox" }).click();
  await expect(pin).toBeVisible();
  await page.getByRole("button", { name: "Fret Finder" }).click();
  await expect(pin).toBeVisible();
  await page.getByRole("button", { name: "Hasher" }).click();
  await composeProgression(page, ["Dm7", "G7", "Cmaj7"]);
  await expect(pin).toBeVisible();
  const timelineCard = page.getByRole("region", { name: "Chord cards output" })
    .getByTestId("chord-card")
    .first();
  await timelineCard.getByRole("button", { name: "Modify Dm7" }).click();
  await page.getByRole("dialog", { name: "Modify Dm7 chord" })
    .getByRole("button", { name: "Change Dm7 to Dm9", exact: true })
    .click();
  await expect(pin.getByRole("heading", { name: "C6" })).toBeVisible();
  expect(await page.evaluate(
    () => (window as Window & { __audioContextConstructions?: number })
      .__audioContextConstructions,
  )).toBe(0);

  await pin.getByRole("button", { name: "Dismiss pinned chord card: C6" }).click();
  await expect(pin).toHaveCount(0);
});

test("pins a piano chord with its independent voicing controls", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Piano", exact: true }).click();
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();

  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  await page.waitForTimeout(250);
  await cell.hover();
  const preview = page.getByTestId("chord-hover-preview");
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await expect(preview).toHaveAttribute("data-instrument", "piano");
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();

  const pin = page.getByTestId("pinned-chord-card");
  await expect(pin).toHaveAttribute("data-instrument", "piano");
  await expect(pin.getByTestId("piano-keyboard")).toBeVisible();
  const styles = pin.getByRole("group", { name: "Piano voicing style for Cmaj7" });
  await expect(styles).toBeVisible();
  await styles.getByRole("button", { name: "Drop 2" }).click();
  await expect(styles.getByRole("button", { name: "Drop 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(pin.getByRole("button", { name: "Modify Cmaj7" })).toBeVisible();
  await expect(pin.getByRole("button", { name: "Lock chord card" })).toHaveCount(0);
});

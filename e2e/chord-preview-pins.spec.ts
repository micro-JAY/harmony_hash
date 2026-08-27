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
  await expect(pin).toHaveCSS("touch-action", "pan-y");
  await expect(handle).toHaveCSS("touch-action", "none");
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("Pinned chord drag handle has no bounds");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 180, { steps: 8 });
  await page.mouse.up();
  const draggedBox = await pin.boundingBox();
  expect(draggedBox).not.toBeNull();
  expect(draggedBox!.x).toBeGreaterThanOrEqual(-2);
  expect(draggedBox!.y).toBeGreaterThanOrEqual(-2);
  expect(draggedBox!.x + draggedBox!.width).toBeLessThanOrEqual(1_281);
  expect(draggedBox!.y + draggedBox!.height).toBeLessThanOrEqual(721);

  const draggedHandleBox = await handle.boundingBox();
  if (!draggedHandleBox) throw new Error("Pinned chord drag handle disappeared");
  await page.mouse.move(
    draggedHandleBox.x + draggedHandleBox.width / 2,
    draggedHandleBox.y + draggedHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(1_270, 710, { steps: 8 });
  await page.mouse.up();
  await page.setViewportSize({ width: 640, height: 480 });
  await expect.poll(async () => {
    const [box, resizedHandleBox] = await Promise.all([
      pin.boundingBox(),
      handle.boundingBox(),
    ]);
    return box !== null
      && resizedHandleBox !== null
      && box.x >= -1
      && box.y >= -1
      && box.x + box.width <= 641
      && box.y + box.height <= 481
      && resizedHandleBox.x >= 0
      && resizedHandleBox.y >= 0
      && resizedHandleBox.x + resizedHandleBox.width <= 640
      && resizedHandleBox.y + resizedHandleBox.height <= 480;
  }).toBe(true);
  await page.setViewportSize({ width: 1_280, height: 720 });

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

test("re-clamps a pin inside an offset visual viewport", async ({ page }) => {
  await page.addInitScript(() => {
    const bounds = {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
    };
    const visualViewport = new EventTarget();
    for (const property of ["width", "height", "offsetLeft", "offsetTop"] as const) {
      Object.defineProperty(visualViewport, property, {
        configurable: true,
        get: () => bounds[property],
      });
    }
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    (window as Window & {
      __setTestVisualViewport?: (next: typeof bounds) => void;
    }).__setTestVisualViewport = (next) => {
      Object.assign(bounds, next);
      visualViewport.dispatchEvent(new Event("resize"));
    };
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();
  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  await page.waitForTimeout(250);
  await cell.hover();
  const preview = page.getByTestId("chord-hover-preview");
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();

  const pin = page.getByTestId("pinned-chord-card");
  await page.evaluate(() => {
    const setVisualViewport = (window as Window & {
      __setTestVisualViewport?: (next: {
        width: number;
        height: number;
        offsetLeft: number;
        offsetTop: number;
      }) => void;
    }).__setTestVisualViewport;
    if (!setVisualViewport) throw new Error("Visual viewport fixture is unavailable");
    setVisualViewport({ width: 700, height: 620, offsetLeft: 400, offsetTop: 80 });
  });

  await expect.poll(async () => {
    const box = await pin.boundingBox();
    return box !== null
      && box.x >= 411
      && box.y >= 91
      && box.x + box.width <= 1_089
      && box.y + box.height <= 689;
  }).toBe(true);

  const handle = pin.getByRole("button", { name: "Move pinned chord card: Cmaj7" });
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("Pinned chord drag handle has no bounds");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 80, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => {
    const box = await pin.boundingBox();
    return box !== null
      && box.x >= 411
      && box.y >= 91
      && box.x + box.width <= 1_089
      && box.y + box.height <= 689;
  }).toBe(true);

  await page.evaluate(() => {
    const setVisualViewport = (window as Window & {
      __setTestVisualViewport?: (next: {
        width: number;
        height: number;
        offsetLeft: number;
        offsetTop: number;
      }) => void;
    }).__setTestVisualViewport;
    if (!setVisualViewport) throw new Error("Visual viewport fixture is unavailable");
    setVisualViewport({ width: 260, height: 500, offsetLeft: 500, offsetTop: 100 });
  });
  await expect(pin).toHaveCSS("width", "236px");
  await expect.poll(() => pin.evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).maxHeight)
  ))).toBeLessThanOrEqual(476);
  await expect.poll(async () => {
    const box = await pin.boundingBox();
    return box !== null
      && box.width <= 239
      && box.height <= 479
      && box.x >= 509
      && box.y >= 109
      && box.x + box.width <= 751
      && box.y + box.height <= 591;
  }).toBe(true);

  await page.evaluate(() => {
    const setVisualViewport = (window as Window & {
      __setTestVisualViewport?: (next: {
        width: number;
        height: number;
        offsetLeft: number;
        offsetTop: number;
      }) => void;
    }).__setTestVisualViewport;
    if (!setVisualViewport) throw new Error("Visual viewport fixture is unavailable");
    setVisualViewport({ width: 260, height: 80, offsetLeft: 500, offsetTop: 0 });
  });
  await expect(pin).toHaveCSS("max-height", "40px");
  const compactHandle = pin.getByRole("button", { name: "Move pinned chord card: Cmaj7" });
  await expect.poll(async () => {
    const box = await compactHandle.boundingBox();
    return box !== null
      && box.x >= 500
      && box.y >= 0
      && box.x + box.width <= 760
      && box.y + box.height <= 80;
  }).toBe(true);
});

test("keeps compact repeated pins reachable below the Share panel", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 480 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7"]);
  await page.getByRole("button", { name: "Piano", exact: true }).click();
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();
  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  const preview = page.getByTestId("chord-hover-preview");

  await page.waitForTimeout(250);
  await cell.hover();
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();
  await page.mouse.move(0, 0);
  // The first compact card intentionally fills the viewport. Dispatching the
  // same grid intent isolates the repeated-pin layout without bypassing pinning.
  await cell.dispatchEvent("pointerover", {
    pointerType: "mouse",
    clientX: 180,
    clientY: 240,
  });
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();

  const pins = page.getByTestId("pinned-chord-card");
  await expect(pins).toHaveCount(2);
  const [firstCard, secondCard, firstHandle] = await Promise.all([
    pins.nth(0).boundingBox(),
    pins.nth(1).boundingBox(),
    pins.nth(0).getByRole("button", { name: "Move pinned chord card: Cmaj7" }).boundingBox(),
  ]);
  if (!firstCard || !secondCard || !firstHandle) {
    throw new Error("Repeated pin bounds are unavailable");
  }
  expect({ x: secondCard.x, y: secondCard.y })
    .not.toEqual({ x: firstCard.x, y: firstCard.y });
  expect(secondCard.y - firstCard.y).toBeGreaterThanOrEqual(39);
  await expect(pins.nth(1)).toHaveCSS("max-height", "416px");
  const firstHandleCovered = firstHandle.x >= secondCard.x
    && firstHandle.y >= secondCard.y
    && firstHandle.x + firstHandle.width <= secondCard.x + secondCard.width
    && firstHandle.y + firstHandle.height <= secondCard.y + secondCard.height;
  expect(firstHandleCovered).toBe(false);

  const shareTrigger = page.getByRole("button", { name: "SHARE", exact: true });
  await shareTrigger.focus();
  await page.keyboard.press("Enter");
  const sharePanel = page.getByRole("dialog", { name: "Share this progression" });
  await expect(sharePanel).toBeVisible();
  const stacking = await page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>(".hh-floating-chord-layer");
    const panel = document.querySelector<HTMLElement>("#share-progression-panel");
    const pin = document.querySelector<HTMLElement>('[data-testid="pinned-chord-card"]');
    if (!layer || !panel || !pin) throw new Error("Floating-card stacking fixtures are missing");
    const panelRect = panel.getBoundingClientRect();
    const pinRect = pin.getBoundingClientRect();
    const overlapLeft = Math.max(panelRect.left, pinRect.left);
    const overlapRight = Math.min(panelRect.right, pinRect.right);
    const overlapTop = Math.max(panelRect.top, pinRect.top);
    const overlapBottom = Math.min(panelRect.bottom, pinRect.bottom);
    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
      throw new Error("Compact Share panel did not overlap the floating pin");
    }
    const elements = document.elementsFromPoint(
      (overlapLeft + overlapRight) / 2,
      (overlapTop + overlapBottom) / 2,
    );
    return {
      layerZIndex: Number.parseInt(getComputedStyle(layer).zIndex, 10),
      panelZIndex: Number.parseInt(getComputedStyle(panel).zIndex, 10),
      panelAbovePin: elements.indexOf(panel) < elements.indexOf(pin),
    };
  });
  expect(stacking.panelZIndex).toBeGreaterThan(stacking.layerZIndex);
  expect(stacking.panelAbovePin).toBe(true);
  await sharePanel.getByRole("button", { name: "Close share progression" }).click();
  await expect(sharePanel).toHaveCount(0);
});

test("cascades from a dragged pin's live position", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();
  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  const preview = page.getByTestId("chord-hover-preview");
  await page.waitForTimeout(250);
  await cell.hover();
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();

  const firstPin = page.getByTestId("pinned-chord-card").first();
  const firstHandle = firstPin.getByRole("button", { name: "Move pinned chord card: Cmaj7" });
  const [firstBox, firstHandleBox] = await Promise.all([
    firstPin.boundingBox(),
    firstHandle.boundingBox(),
  ]);
  if (!firstBox || !firstHandleBox) throw new Error("Dragged pin bounds are unavailable");
  const target = { x: 400, y: 100 };
  await page.mouse.move(
    firstHandleBox.x + firstHandleBox.width / 2,
    firstHandleBox.y + firstHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    firstHandleBox.x + firstHandleBox.width / 2 + target.x - firstBox.x,
    firstHandleBox.y + firstHandleBox.height / 2 + target.y - firstBox.y,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect.poll(async () => {
    const box = await firstPin.boundingBox();
    return box !== null
      && Math.abs(box.x - target.x) <= 2
      && Math.abs(box.y - target.y) <= 2;
  }).toBe(true);

  await page.mouse.move(0, 0);
  await cell.dispatchEvent("pointerover", {
    pointerType: "mouse",
    clientX: target.x - 16,
    clientY: target.y - 16,
  });
  await expect(preview).toBeVisible({ timeout: 2_000 });
  await preview.getByRole("button", { name: "Pin chord preview: Cmaj7" }).click();

  const pins = page.getByTestId("pinned-chord-card");
  await expect(pins).toHaveCount(2);
  const [liveFirst, second, liveHandle] = await Promise.all([
    pins.nth(0).boundingBox(),
    pins.nth(1).boundingBox(),
    firstHandle.boundingBox(),
  ]);
  if (!liveFirst || !second || !liveHandle) throw new Error("Live cascade bounds are unavailable");
  expect(Math.abs(second.x - liveFirst.x) >= 39
    || Math.abs(second.y - liveFirst.y) >= 39).toBe(true);
  const firstHandleCovered = liveHandle.x >= second.x
    && liveHandle.y >= second.y
    && liveHandle.x + liveHandle.width <= second.x + second.width
    && liveHandle.y + liveHandle.height <= second.y + second.height;
  expect(firstHandleCovered).toBe(false);
});

test("cancels pending hover intent when keyboard navigation leaves Hasher", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();
  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  await page.waitForTimeout(250);
  await cell.hover();
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "Tune Toolbox" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("theory-workspace")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("chord-hover-preview")).toHaveCount(0);
});

test("renders hover previews without entrance motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Browse chords ↓", exact: true }).click();
  const cell = page.getByTestId("chord-grid-panel").locator('[data-chord-name="Cmaj7"]');
  await page.waitForTimeout(250);
  await cell.hover();

  const preview = page.getByTestId("chord-hover-preview");
  await preview.waitFor({ state: "attached", timeout: 2_000 });
  await expect(preview).toHaveAttribute("data-reduced-motion", "true");
  const initialPresentation = await preview.evaluate((element) => {
    const style = getComputedStyle(element);
    return { opacity: style.opacity, transform: style.transform };
  });
  expect(initialPresentation).toEqual({ opacity: "1", transform: "none" });
});

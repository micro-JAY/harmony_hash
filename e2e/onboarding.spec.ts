import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const TOUR_STEP_COUNT = 19;

async function expectTourTarget(page: Page, targetSelector: string) {
  await expect(page.locator(".hh-guided-tour")).toHaveAttribute("data-target-missing", "false");
  await expect(page.locator(targetSelector)).toBeVisible();
}

async function advanceToStep(page: Page, title: string, targetSelector: string) {
  await page.keyboard.press("ArrowRight");
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await expectTourTarget(page, targetSelector);
  return dialog;
}

async function expectReachableHandoff(
  page: Page,
  target: Locator,
  dialog: Locator,
): Promise<void> {
  await expect(target).toBeFocused();
  await expect(dialog).toHaveAttribute("data-placement", "bottom");
  const viewportHeight = page.viewportSize()?.height ?? await page.evaluate(() => window.innerHeight);
  await expect.poll(async () => {
    const [targetBox, tooltipBox] = await Promise.all([
      target.boundingBox(),
      dialog.boundingBox(),
    ]);
    if (!targetBox || !tooltipBox) return false;
    return targetBox.y >= -1
      && targetBox.y + targetBox.height <= viewportHeight
      && tooltipBox.y >= targetBox.y + targetBox.height;
  }).toBe(true);
}

test("first visit welcomes people with the logo and three destinations, persists dismissal, and reopens from Help", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "HARMONY HASH" });
  await expect(dialog).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Find the harmony inside every chord.",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://harmony.tonari.ai/harmony-hash-share-v2.png",
  );
  await expect(dialog.locator('img[src="/hh_logo.png"]')).toBeVisible();
  await expect(dialog.locator('img[src="/hh_logo_light.jpg"]')).toBeAttached();
  await expect(dialog.locator('[data-onboarding-destination-icon="toolbox"]')).toBeVisible();
  await expect(dialog.locator('[data-onboarding-destination-icon="discovery"]')).toBeVisible();
  const [visualBox, logoBox] = await Promise.all([
    dialog.locator('[data-onboarding-visual="true"]').boundingBox(),
    dialog.locator(".hh-onboarding-logo-stack").boundingBox(),
  ]);
  expect(visualBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(Math.abs(visualBox!.x - logoBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(visualBox!.y - logoBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(visualBox!.width - logoBox!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(visualBox!.height - logoBox!.height)).toBeLessThanOrEqual(1);
  const tagline = dialog.getByText(
    /^(Harmony doesn't have to be hard\.|Find the harmony inside every chord\.|Start with a chord\. Discover where it wants to go\.|Every chord is a doorway to another\.|Follow the tension\. Find the release\.|Build progressions by ear, shape, and feel\.|Try a chord\. Hear what comes next\.|Harmony is a map, not a maze\.)$/,
  );
  await expect(tagline).toBeVisible();
  await expect(tagline).toHaveCSS("font-style", "italic");
  await expect(dialog.getByRole("heading", { name: "HASHER" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "TUNE TOOLBOX" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "DISCOVERY" })).toBeVisible();
  await expect(dialog).toContainText(/FRET FINDER \+ theory/i);
  await expect(dialog.getByRole("button", { name: "TAKE A TOUR" })).toBeVisible();
  await expect(dialog).not.toContainText("send a scale back");

  await dialog.getByRole("button", { name: "START HASHING" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem("hh:onboarding:v2:dismissed")
  ))).toBe("true");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(dialog).toBeHidden();
  const help = page.getByRole("button", { name: "Help / About" });
  await help.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
});

test("guided tour waits for real workspace handoffs and resolves every current target", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const introduction = page.getByRole("dialog", { name: "HARMONY HASH" });
  await introduction.getByRole("button", { name: "TAKE A TOUR" }).click();
  await expect(introduction).toBeHidden();

  let tour = page.getByRole("dialog", { name: "Choose a workspace" });
  await expect(tour).toBeVisible();
  await expect(tour).toContainText(`Step 1 / ${TOUR_STEP_COUNT}`);
  await expect(page.locator(".hh-guided-tour")).toHaveAttribute("data-tour-mode", "modal");
  await expectTourTarget(page, '[data-tour="workspace-navigation"]');

  await advanceToStep(page, "Describe what you hear", '[data-tour="hasher-describe"]');
  await advanceToStep(page, "Build chord by chord", '[data-tour="hasher-composer"]');
  await advanceToStep(page, "Browse the chord dictionary", '[data-tour="hasher-chord-browser"]');
  await advanceToStep(page, "Set the harmonic context", '[data-tour="hasher-context"]');
  await advanceToStep(page, "Choose your instrument", '[data-tour="instrument-switcher"]');
  await advanceToStep(page, "Start with a preset", '[data-tour="hasher-presets"]');
  await advanceToStep(page, "Hear and explore your progression", '[data-tour="hasher-actions"]');
  await advanceToStep(page, "Shape each chord", '[data-tour="chord-output"]');

  tour = await advanceToStep(
    page,
    "Continue in TUNE TOOLBOX",
    '[data-tour-workspace="theory"]',
  );
  await expect(page.locator(".hh-guided-tour")).toHaveAttribute("data-tour-mode", "handoff");
  await expect(tour).toHaveAttribute("aria-modal", "false");
  const hasherTab = page.locator('[data-tour-workspace="builder"]');
  const toolboxTab = page.locator('[data-tour-workspace="theory"]');
  const discoveryTab = page.locator('[data-tour-workspace="discovery"]');
  await expect(hasherTab).toHaveAttribute("aria-pressed", "true");
  await expectReachableHandoff(page, toolboxTab, tour);
  await expect(tour.getByRole("button", { name: "Next" })).toHaveCount(0);
  await expect(page).toHaveScreenshot("guided-tour-toolbox-handoff-desktop.png");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Continue in TUNE TOOLBOX" })).toBeVisible();
  await expect(hasherTab).toHaveAttribute("aria-pressed", "true");

  await discoveryTab.click();
  await expect(discoveryTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog", { name: "Continue in TUNE TOOLBOX" })).toBeVisible();
  await toolboxTab.click();

  await expect(page.getByRole("dialog", { name: "Find notes on the fretboard" })).toBeVisible();
  await expect(toolboxTab).toHaveAttribute("aria-pressed", "true");
  await expectTourTarget(page, '[data-theory-tool="fretboard"]');
  await advanceToStep(page, "See a scale on the keyboard", '[data-theory-tool="scales"]');
  await advanceToStep(page, "Explore THE CIRCLE", '[data-theory-tool="circle"]');
  await advanceToStep(page, "Connect the note network", '[data-theory-tool="network"]');

  tour = await advanceToStep(
    page,
    "Continue in DISCOVERY",
    '[data-tour-workspace="discovery"]',
  );
  await expect(page.locator(".hh-guided-tour")).toHaveAttribute("data-tour-mode", "handoff");
  await expect(tour).toHaveAttribute("aria-modal", "false");
  await expect(toolboxTab).toHaveAttribute("aria-pressed", "true");
  await expectReachableHandoff(page, discoveryTab, tour);
  await expect(page).toHaveScreenshot("guided-tour-discovery-handoff-desktop.png");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Continue in DISCOVERY" })).toBeVisible();
  await expect(toolboxTab).toHaveAttribute("aria-pressed", "true");
  await hasherTab.click();
  await expect(hasherTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog", { name: "Continue in DISCOVERY" })).toBeVisible();

  await discoveryTab.focus();
  await expect(discoveryTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Play notes in DISCOVERY" })).toBeVisible();
  await expect(discoveryTab).toHaveAttribute("aria-pressed", "true");
  await expectTourTarget(page, '[data-tour="discovery-input"]');
  await advanceToStep(page, "Name the harmony you find", '[data-tour="discovery-results"]');
  await advanceToStep(page, "Highlight a scale path", '[data-tour="discovery-improv"]');
  tour = await advanceToStep(page, "Practice over your progression", '[data-tour="discovery-loop"]');
  await expect(tour).toContainText(`Step ${TOUR_STEP_COUNT} / ${TOUR_STEP_COUNT}`);

  await tour.getByRole("button", { name: "Finish tour" }).click();
  await expect(tour).toBeHidden();
  await expect(hasherTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("chord-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Help / About" })).toBeFocused();
});

test("starting the tour collapses the chord browser before the preset step", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const introduction = page.getByRole("dialog", { name: "HARMONY HASH" });
  await introduction.getByRole("button", { name: "START HASHING" }).click();
  const browse = page.getByRole("button", { name: "Browse chords ↓", exact: true });
  await browse.click();
  await expect(page.getByTestId("chord-grid-panel")).toBeVisible();
  await expect(page.getByTestId("hasher-preset-section")).toHaveCount(0);

  await page.getByRole("button", { name: "Help / About" }).click();
  await introduction.getByRole("button", { name: "TAKE A TOUR" }).click();
  await expect(page.locator('button[aria-controls="chord-reference-grid-panel"]'))
    .toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("hasher-preset-section")).toBeVisible();

  for (let step = 0; step < 6; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Start with a preset" })).toBeVisible();
  await expect(page.locator('[data-tour="hasher-presets"]')).toBeVisible();
});

test("handoff prompt fits a short mobile viewport without bypassing the requested tab", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 430 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const introduction = page.getByRole("dialog", { name: "HARMONY HASH" });
  await introduction.getByRole("button", { name: "TAKE A TOUR" }).click();
  for (let step = 0; step < 9; step += 1) await page.keyboard.press("ArrowRight");

  const handoff = page.getByRole("dialog", { name: "Continue in TUNE TOOLBOX" });
  await expect(handoff).toBeVisible();
  const toolboxTab = page.locator('[data-tour-workspace="theory"]');
  await expectReachableHandoff(page, toolboxTab, handoff);
  const box = await handoff.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(430);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 375);
  await expect(page).toHaveScreenshot("guided-tour-toolbox-handoff-mobile.png");

  await page.keyboard.press("ArrowRight");
  await expect(handoff).toBeVisible();
  await expect(page.locator('[data-tour-workspace="builder"]')).toHaveAttribute("aria-pressed", "true");
});

test("blocked storage remains usable and dismissal lasts for the page session", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function blockedOnboardingRead(key: string) {
      if (key.startsWith("hh:onboarding:")) throw new Error("onboarding storage blocked");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function blockedOnboardingWrite(key: string, value: string) {
      if (key.startsWith("hh:onboarding:")) throw new Error("onboarding storage blocked");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "HARMONY HASH" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "START HASHING" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Help / About" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close Harmony Hash introduction" }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("onboarding is contained in a short mobile viewport and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 430 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog", { name: "HARMONY HASH" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-reduced-motion", "true");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(430);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 375);

  const primaryAction = dialog.getByRole("button", { name: "START HASHING" });
  const finalDestination = dialog.getByRole("heading", { name: "DISCOVERY" });
  await primaryAction.scrollIntoViewIfNeeded();
  await expect(primaryAction).toBeVisible();
  await finalDestination.scrollIntoViewIfNeeded();
  await expect(finalDestination).toBeVisible();
});

test.describe("Japanese guided tour", () => {
  test.use({ locale: "ja-JP" });

  test("localizes both required handoffs and every refreshed destination", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const introduction = page.getByRole("dialog", { name: "HARMONY HASH" });
    await introduction.getByRole("button", { name: "ツアーを見る" }).click();
    const opening = page.getByRole("dialog", { name: "ワークスペースを選ぶ" });
    await expect(opening).toBeVisible();
    await expect(opening.locator(".hh-guided-tour__primary")).toHaveText("次へ");
    await expectTourTarget(page, '[data-tour="workspace-navigation"]');

    const hasherTargets = [
      '[data-tour="hasher-describe"]',
      '[data-tour="hasher-composer"]',
      '[data-tour="hasher-chord-browser"]',
      '[data-tour="hasher-context"]',
      '[data-tour="instrument-switcher"]',
      '[data-tour="hasher-presets"]',
      '[data-tour="hasher-actions"]',
      '[data-tour="chord-output"]',
    ];
    for (const target of hasherTargets) {
      await page.keyboard.press("ArrowRight");
      await expectTourTarget(page, target);
    }

    await page.keyboard.press("ArrowRight");
    const toolboxHandoff = page.getByRole("dialog", { name: "チューン・ツールボックスへ進む" });
    await expect(toolboxHandoff).toContainText("選ぶまでツアーはここで待ちます");
    const toolboxTab = page.locator('[data-tour-workspace="theory"]');
    await expect(toolboxTab).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "指板で音を探す" })).toBeVisible();
    await expectTourTarget(page, '[data-theory-tool="fretboard"]');

    for (const target of [
      '[data-theory-tool="scales"]',
      '[data-theory-tool="circle"]',
      '[data-theory-tool="network"]',
    ]) {
      await page.keyboard.press("ArrowRight");
      await expectTourTarget(page, target);
    }

    await page.keyboard.press("ArrowRight");
    const discoveryHandoff = page.getByRole("dialog", { name: "ディスカバリーへ進む" });
    await expect(discoveryHandoff).toContainText("ハッシャーのコード進行もそのまま引き継がれます");
    const discoveryTab = page.locator('[data-tour-workspace="discovery"]');
    await expect(discoveryTab).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "ディスカバリーで音を鳴らす" })).toBeVisible();
    await expectTourTarget(page, '[data-tour="discovery-input"]');

    for (const target of [
      '[data-tour="discovery-results"]',
      '[data-tour="discovery-improv"]',
      '[data-tour="discovery-loop"]',
    ]) {
      await page.keyboard.press("ArrowRight");
      await expectTourTarget(page, target);
    }

    const finalStep = page.getByRole("dialog", { name: "コード進行に合わせて練習する" });
    await expect(finalStep).toContainText(`ステップ ${TOUR_STEP_COUNT} / ${TOUR_STEP_COUNT}`);
    await finalStep.getByRole("button", { name: "ツアーを終了" }).click();
    await expect(finalStep).toBeHidden();
  });
});

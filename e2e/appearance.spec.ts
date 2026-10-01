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

async function chooseAppearance(page: Page, name: "Dark appearance" | "Light appearance") {
  const dialog = page.getByRole("dialog", { name: "HARMONY HASH" });
  if (!(await dialog.isVisible())) {
    await page.getByRole("button", { name: "Help / About" }).click();
  }
  const option = dialog.getByRole("button", { name });
  await option.click();
  await expect(option).toBeFocused();
  await expect(option).toHaveAttribute("aria-pressed", "true");
  return dialog;
}

test.describe("appearance", () => {
  test("restores the warm light appearance before the welcome view and uses the light logo", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.addInitScript(() => {
      localStorage.removeItem("hh:onboarding:v2:dismissed");
      localStorage.setItem("hh:appearance:v1", "light");
      Math.random = () => 0;
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const root = page.locator("html");
    const dialog = page.getByRole("dialog", { name: "HARMONY HASH" });
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(root).toHaveCSS("color-scheme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F0EDE8");
    await expect(dialog).toHaveCSS("background-color", "rgb(240, 237, 232)");
    await expect(dialog.locator('img[src="/hh_logo_light.jpg"]')).toBeVisible();
    await expect(dialog.locator('img[src="/hh_logo.png"]')).toBeHidden();
    await expect(dialog.getByRole("button", { name: "Light appearance" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect(dialog).toHaveScreenshot("appearance-light-welcome-desktop.png");

    await chooseAppearance(page, "Dark appearance");
    await expect(root).toHaveAttribute("data-theme", "dark");
    await expect(dialog.locator('img[src="/hh_logo.png"]')).toBeVisible();
    await chooseAppearance(page, "Light appearance");
    await expect(dialog.locator('img[src="/hh_logo_light.jpg"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("hh:appearance:v1")))
      .toBe("light");

    await page.setViewportSize({ width: 375, height: 430 });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(430);
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 375);
    await expect(page).toHaveScreenshot("appearance-light-welcome-mobile.png");

    await dialog.getByRole("button", { name: "START HASHING" }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(dialog.locator('img[src="/hh_logo_light.jpg"]')).toBeVisible();
    expect(issues).toEqual([]);
  });

  test("redraws a mounted NOTE NEURAL NETWORK when appearance changes", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    const disclosure = page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first();
    if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click();

    const network = page.getByTestId("note-neural-network");
    const graph = network.getByTestId("mode-network-graph-scroller");
    const canvas = network.getByTestId("note-network-canvas");
    await expect(network).toBeVisible();
    await expect(canvas).toHaveAttribute("data-appearance", "dark");
    await expect(graph).toHaveCSS("background-color", "rgb(5, 5, 7)");

    await page.getByRole("button", { name: "Help / About" }).click();
    const dialog = await chooseAppearance(page, "Light appearance");
    await expect(canvas).toHaveAttribute("data-appearance", "light");
    await dialog.getByRole("button", { name: "Close Harmony Hash introduction" }).click();
    await expect(network).toBeVisible();
    await expect(graph).toHaveCSS("background-color", "rgb(240, 237, 232)");
    await expect(network).toHaveScreenshot("note-neural-network-light.png", {
      animations: "allow",
    });
    expect(issues).toEqual([]);
  });

  test("keeps every main workspace contained in light appearance", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.addInitScript(() => localStorage.setItem("hh:appearance:v1", "light"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const workspaces = [
      { button: "HASHER", slug: "hasher", ready: page.getByTestId("chord-composer") },
      { button: "TUNE TOOLBOX", slug: "tune-toolbox", ready: page.getByText("FRET FINDER", { exact: true }).first() },
      { button: "DISCOVERY", slug: "discovery-piano", ready: page.getByTestId("discovery") },
    ] as const;
    const viewports = [
      { name: "desktop", width: 1280, height: 900 },
      { name: "mobile", width: 375, height: 812 },
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const workspace of workspaces) {
        await page.getByRole("button", { name: workspace.button, exact: true }).click();
        await expect(workspace.ready).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
        const documentOverflow = await page.evaluate(() => (
          document.documentElement.scrollWidth - window.innerWidth
        ));
        expect(documentOverflow).toBeLessThanOrEqual(0);
        await expect(page).toHaveScreenshot(
          `appearance-light-${workspace.slug}-${viewport.name}.png`,
        );
      }
    }
    expect(issues).toEqual([]);
  });

  test("keeps the Discovery scale layer readable on guitar in both appearances and mobile", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await page.getByRole("button", { name: "DISCOVERY", exact: true }).click();
    await page.getByRole("button", { name: "Highlight", exact: true }).click();
    await page.getByRole("group", { name: "Discovery instrument" })
      .getByRole("button", { name: "Fretboard", exact: true }).click();

    const discovery = page.getByTestId("discovery");
    const board = page.getByRole("group", { name: "Discovery guitar fretboard" });
    const scroller = page.getByTestId("discovery-guitar-scroller");
    const scaleTones = board.locator('.discovery-fret[data-scale-tone="true"]');
    const scaleRoots = board.locator('.discovery-fret[data-scale-root="true"]');
    await expect(scaleTones).not.toHaveCount(0);
    await expect(scaleRoots).not.toHaveCount(0);
    await expect(board).toHaveAttribute("data-scale-overlay", "C Major");

    const keyboardTarget = scaleTones.first();
    await keyboardTarget.focus();
    await expect(keyboardTarget).toBeFocused();
    await keyboardTarget.press("Space");
    await expect(keyboardTarget).toHaveAttribute("aria-pressed", "true");
    expect(await keyboardTarget.locator("span").evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--palette-gold)";
      document.body.append(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(element).backgroundColor === expected;
    })).toBe(true);
    await expect(discovery).toHaveScreenshot("discovery-guitar-overlay-dark.png");

    await page.getByRole("button", { name: "Help / About" }).click();
    const dialog = await chooseAppearance(page, "Light appearance");
    await dialog.getByRole("button", { name: "Close Harmony Hash introduction" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(board).toHaveAttribute("data-scale-overlay", "C Major");
    await expect(discovery).toHaveScreenshot("discovery-guitar-overlay-light.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await scroller.scrollIntoViewIfNeeded();
    const containment = await scroller.evaluate((element) => ({
      clientWidth: element.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      right: element.getBoundingClientRect().right,
      scrollWidth: element.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(containment.right).toBeLessThanOrEqual(containment.viewportWidth);
    expect(containment.documentOverflow).toBeLessThanOrEqual(0);
    expect(containment.scrollWidth).toBeGreaterThan(containment.clientWidth);
    await expect(page).toHaveScreenshot("discovery-guitar-overlay-light-mobile.png");
    expect(issues).toEqual([]);
  });
});

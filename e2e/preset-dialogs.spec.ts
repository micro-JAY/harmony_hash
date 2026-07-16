import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "./helpers/contrast";

const CATEGORIES = [
  {
    label: "Major",
    dialog: "Major presets",
    count: 23,
    subgroups: [
      "The Foundations (Rock, Pop, Folk)",
      "Jazz & R&B Fundamentals",
      "Gospel & Soul Movement",
    ],
  },
  {
    label: "Minor",
    dialog: "Minor presets",
    count: 21,
    subgroups: [
      "The Essentials (Pop & Rock)",
      "R&B & Soul Minor Loops",
      "Harmonic/Classical Minor (Strong Pull)",
      "Jazz Minor (Sophisticated)",
    ],
  },
  {
    label: "Modal",
    dialog: "Modal presets",
    count: 13,
    subgroups: [
      'Dorian (The "Cool" Funk)',
      'Mixolydian (The "Greasy" Rock/Soul)',
      'Lydian (The "Ethereal" Dream)',
      'Phrygian (The "Aggressive" Dark)',
      'Locrian (The "Forbidden" / Unstable)',
    ],
  },
  {
    label: "Advanced",
    dialog: "Advanced presets",
    count: 5,
    subgroups: ["Chromatic & Secondary Dominant Movement"],
  },
] as const;

function presetSurface(page: Page) {
  return page.getByRole("group", { name: "Preset collection" });
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test.describe("complete preset dialogs and centered header", () => {
  test("keeps the workspace navigation at the true center in English and Japanese", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 820, height: 900 },
      { width: 500, height: 812 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const navigation = page.getByRole("navigation", { name: "Workspace" });
      const centerDelta = await navigation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs((bounds.left + bounds.width / 2) - window.innerWidth / 2);
      });
      expect(centerDelta).toBeLessThanOrEqual(1);

      await page.getByRole("button", { name: "JP", exact: true }).click();
      const japaneseNavigation = page.getByRole("navigation", { name: "ワークスペース" });
      const japaneseCenterDelta = await japaneseNavigation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs((bounds.left + bounds.width / 2) - window.innerWidth / 2);
      });
      expect(japaneseCenterDelta).toBeLessThanOrEqual(1);
      await expectNoDocumentOverflow(page);
    }
  });

  test("renders all four complete category inventories and restores focus on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (const category of CATEGORIES) {
      const trigger = presetSurface(page).getByRole("button", {
        name: category.label,
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: category.dialog });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("[data-preset-option]"))
        .toHaveCount(category.count);
      for (const subgroup of category.subgroups) {
        await expect(dialog.getByRole("heading", { name: subgroup, level: 3 }))
          .toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }

    await expect(page.getByTestId("chord-card")).toHaveCount(0);
  });

  test("keeps inactive navigation and preset labels readable on their real surfaces", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const majorTrigger = presetSurface(page).getByRole("button", { name: "Major", exact: true });
    const navigationButton = page.getByRole("button", { name: "TUNE TOOLBOX", exact: true });
    const surfaceColors = await Promise.all([
      navigationButton.evaluate((element) => {
        const foreground = getComputedStyle(element).color;
        const background = getComputedStyle(element.parentElement!).backgroundColor;
        return { foreground, background };
      }),
      majorTrigger.evaluate((element) => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: style.backgroundColor };
      }),
    ]);
    for (const colors of surfaceColors) {
      expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    }

    await majorTrigger.click();
    const dialog = page.getByRole("dialog", { name: "Major presets" });
    const labelColors = await Promise.all([
      dialog.getByRole("heading", { name: CATEGORIES[0].subgroups[0], level: 3 }).evaluate((element) => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: getComputedStyle(element.parentElement!).backgroundColor };
      }),
      dialog.locator("[data-preset-option] small").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: getComputedStyle(element.parentElement!).backgroundColor };
      }),
    ]);
    for (const colors of labelColors) {
      expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("applies pointer and keyboard selections through the shared timeline", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox", { name: "HASHER key" }).selectOption("D");

    const majorTrigger = presetSurface(page).getByRole("button", { name: "Major", exact: true });
    await majorTrigger.click();
    await page.getByRole("dialog", { name: "Major presets" })
      .getByRole("button", { name: "The Plagal Loop: I – IV – I – V" })
      .click();
    await expect(page.getByRole("dialog", { name: "Major presets" })).toHaveCount(0);
    await expect(majorTrigger).toBeFocused();
    await expect(page.getByTestId("chord-card").locator("h3"))
      .toHaveText(["D", "G", "D", "A"]);

    const minorTrigger = presetSurface(page).getByRole("button", { name: "Minor", exact: true });
    await minorTrigger.focus();
    await minorTrigger.press("Enter");
    const minorDialog = page.getByRole("dialog", { name: "Minor presets" });
    const firstMinorPreset = minorDialog.locator("[data-preset-option]").first();
    await expect(firstMinorPreset).toBeFocused();
    await firstMinorPreset.press("Enter");
    await expect(minorDialog).toHaveCount(0);
    await expect(minorTrigger).toBeFocused();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
  });

  test("dismissal and Minor Blend help preserve progression state", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const advancedTrigger = presetSurface(page).getByRole("button", { name: "Advanced", exact: true });
    await advancedTrigger.click();
    const advancedDialog = page.getByRole("dialog", { name: "Advanced presets" });
    await page.locator('[data-dialog-backdrop="true"]').click({ position: { x: 2, y: 2 } });
    await expect(advancedDialog).toHaveCount(0);
    await expect(advancedTrigger).toBeFocused();
    await expect(page.getByTestId("chord-card")).toHaveCount(0);

    const minorTrigger = presetSurface(page).getByRole("button", { name: "Minor", exact: true });
    await minorTrigger.click();
    await page.getByRole("dialog", { name: "Minor presets" })
      .getByRole("button", { name: "What is the Minor Blend?" })
      .click();
    const help = page.getByRole("dialog", { name: "Why is my Minor Chord different?" });
    await expect(help).toBeVisible();
    await page.getByRole("button", { name: "Close minor blend help" }).click();
    await expect(help).toHaveCount(0);
    await expect(minorTrigger).toBeFocused();
    await expect(page.getByTestId("chord-card")).toHaveCount(0);
  });
});

test.describe("375px preset dialogs", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("contains every category dialog and presents natural Japanese labels", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "JP", exact: true }).click();

    const japaneseCategories = [
      { label: "メジャー", dialog: "メジャーのプリセット", count: 23 },
      { label: "マイナー", dialog: "マイナーのプリセット", count: 21 },
      { label: "モーダル", dialog: "モーダルのプリセット", count: 13 },
      { label: "アドバンスト", dialog: "アドバンストのプリセット", count: 5 },
    ] as const;

    const surface = page.getByRole("group", { name: "プリセットの種類" });
    for (const category of japaneseCategories) {
      await surface.getByRole("button", { name: category.label, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: category.dialog });
      await expect(dialog.locator("[data-preset-option]")).toHaveCount(category.count);
      const lastOption = dialog.locator("[data-preset-option]").last();
      await lastOption.scrollIntoViewIfNeeded();
      await expect(lastOption).toBeVisible();
      if (category.count > 5) {
        const scrollRegion = dialog.locator('[data-dialog-scroll-region="true"]');
        const scrollMetrics = await scrollRegion.evaluate((element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));
        expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
      }
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
      await expectNoDocumentOverflow(page);
      await page.keyboard.press("Escape");
    }
  });
});

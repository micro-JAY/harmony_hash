import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

const HELP_LABEL = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

async function expectStacked(first: Locator, second: Locator): Promise<void> {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height);
  expect(Math.abs(secondBox!.width - firstBox!.width)).toBeLessThanOrEqual(1);
}

async function expectCardColumns(cards: Locator, columnCount: 2 | 3): Promise<void> {
  await expect(cards).toHaveCount(4);
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width };
    }),
  );
  for (let index = 1; index < columnCount; index += 1) {
    expect(Math.abs(boxes[0].y - boxes[index].y)).toBeLessThanOrEqual(1);
    expect(boxes[index].x).toBeGreaterThan(boxes[index - 1].x + boxes[index - 1].width - 1);
  }
  expect(Math.abs(boxes[columnCount].x - boxes[0].x)).toBeLessThanOrEqual(1);
  expect(boxes[columnCount].y).toBeGreaterThan(boxes[0].y);
  if (columnCount === 2) {
    expect(Math.abs(boxes[2].y - boxes[3].y)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes[3].x - boxes[1].x)).toBeLessThanOrEqual(1);
  }
}

async function mockReadyHealth(page: Page): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        provider: "openai",
        bindings: { openaiApiKey: true },
      }),
    });
  });
}

test("compact action toolbar keeps cards adjacent and opens Hanz from prompt help", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);

  const actions = page.getByRole("region", { name: "Progression actions" });
  const cards = page.getByRole("region", { name: "Chord cards output" });
  const actionBox = await actions.boundingBox();
  const cardBox = await cards.boundingBox();
  expect(actionBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(cardBox!.y - (actionBox!.y + actionBox!.height)).toBeLessThanOrEqual(40);
  await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);

  await page
    .getByRole("textbox", { name: "Describe the progression you want" })
    .fill("help me tighten this progression");
  await page.getByRole("button", { name: HELP_LABEL }).click();
  const dialog = page.getByRole("dialog", { name: "Hanz Hasher" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/hh-panel/);
  await expect(page.getByRole("button", { name: "Hanz, Help!" })).toBeVisible();
  await expect(page).toHaveScreenshot("builder-desktop-expanded-companion.png", { fullPage: true });

  await expect(page.getByRole("heading", { name: "Choose from a preset" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build your own" })).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
  await expect(dialog).toHaveCount(0);
});

test.describe("800px tablet layout", () => {
  test.use({ viewport: { width: 800, height: 900 } });

  test("renders dense guitar cards and two-column piano cards without overflow", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);

    const cards = page
      .getByRole("region", { name: "Chord cards output" })
      .getByTestId("chord-card");
    await expectCardColumns(cards, 3);
    await expectNoDocumentOverflow(page);

    await page.getByRole("button", { name: "Piano" }).click();
    await expectCardColumns(cards, 2);
    await expectNoDocumentOverflow(page);
  });
});

test.describe("375px HASHER layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("stacks the prompt and composer and keeps the Hanz popup in bounds", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.99;
    });
    await mockReadyHealth(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const prompt = page.getByRole("textbox", {
      name: "Describe the progression you want",
    });
    const agentRun = page.getByRole("button", { name: "Run progression agent" });
    await expectStacked(prompt, agentRun);
    const composer = page.getByRole("group", { name: "Chord progression composer" });
    const composerRun = page.getByRole("button", { name: "Run chord composer" });
    await expectStacked(composer, composerRun);
    await expectNoDocumentOverflow(page);
    await expect(page).toHaveScreenshot("builder-mobile-free.png", { fullPage: true });

    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await prompt.fill("help me get unstuck");
    await page.getByRole("button", { name: HELP_LABEL }).click();
    const dialog = page.getByRole("dialog", { name: "Hanz Hasher" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Hanz, Help!" })).toBeVisible();
    const dialogBox = await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, width: bounds.width };
    });
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(375);

    await expectStacked(prompt, agentRun);
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose from a preset" })).toBeVisible();
    const describeHeading = page.getByRole("heading", { name: "Describe a progression or mood" });
    const describeHeadingLines = await describeHeading.evaluate((element) => {
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().height / Number.parseFloat(style.lineHeight);
    });
    expect(describeHeadingLines).toBeGreaterThanOrEqual(1.9);
    await expect(page.getByRole("heading", { name: "Build your own" })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expectNoDocumentOverflow(page);
    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await expect(dialog).toHaveCount(0);
    const snapshotMetrics = await page.evaluate(() => {
      const measure = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { top: bounds.top, height: bounds.height, bottom: bounds.bottom };
      };
      return {
        documentHeight: document.documentElement.scrollHeight,
        header: measure(".hh-app-header"),
        brand: measure(".hh-app-header__brand"),
        utilities: measure(".hh-app-header__utilities"),
        navigation: measure(".hh-app-header__nav"),
        context: measure('[data-tour="hasher-context"]'),
        presets: measure('[data-tour="hasher-presets"]'),
        describe: measure('[data-tour="hasher-describe"]'),
        describeTitle: measure("#hasher-describe-title"),
        composer: measure('[data-tour="hasher-composer"]'),
        chordBrowser: measure('[data-tour="hasher-chord-browser"]'),
        chordOutput: measure('[data-tour="chord-output"]'),
      };
    });
    await expect(page, `mobile snapshot metrics ${JSON.stringify(snapshotMetrics)}`)
      .toHaveScreenshot("builder-mobile-progressions.png", { fullPage: true });
  });

  test("contains rendered guitar and piano cards without page overflow", async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        browserErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expect(
      page
        .getByRole("region", { name: "Chord cards output" })
        .locator('svg[height="auto"]'),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Piano" }).click();
    await expectNoDocumentOverflow(page);
    const output = page.getByRole("region", { name: "Chord cards output" });
    const keyboards = output.getByTestId("piano-keyboard");
    await expect(keyboards).toHaveCount(4);
    const containment = await keyboards.evaluateAll((elements) => elements.map((element) => {
      const keyboard = element.getBoundingClientRect();
      const card = element.closest('[data-testid="chord-card"]')?.getBoundingClientRect();
      const keys = Array.from(element.querySelectorAll<HTMLElement>("[data-midi]"));
      return {
        width: keyboard.width,
        keyCount: keys.length,
        insideCard: card
          ? keyboard.left >= card.left - 1 && keyboard.right <= card.right + 1
          : false,
        keysInside: keys.every((key) => {
          const bounds = key.getBoundingClientRect();
          return bounds.left >= keyboard.left - 1 && bounds.right <= keyboard.right + 1;
        }),
      };
    }));
    for (const keyboard of containment) {
      expect(keyboard.width).toBeGreaterThan(0);
      expect(keyboard.keyCount).toBe(36);
      expect(keyboard.insideCard).toBe(true);
      expect(keyboard.keysInside).toBe(true);
    }
    await expect(output.locator(".overflow-x-auto")).toHaveCount(0);
    expect(browserErrors).toEqual([]);
  });
});

import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
  );
}

test("compact action toolbar keeps cards adjacent and companion state mounted", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
  await input.fill("Cmaj7 Am7 Dm7 G7");
  await input.press("Enter");

  const actions = page.getByRole("region", { name: "Progression actions" });
  const cards = page.getByRole("region", { name: "Chord cards output" });
  const panel = page.getByRole("region", {
    name: "Harmony companion voice agent",
  });
  const compactBox = await panel.boundingBox();
  const actionBox = await actions.boundingBox();
  const cardBox = await cards.boundingBox();
  expect(compactBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(compactBox!.height).toBeLessThan(64);
  expect(cardBox!.y - (actionBox!.y + actionBox!.height)).toBeLessThanOrEqual(40);

  await page.getByRole("button", { name: "Expand Harmony Companion" }).click();
  const collapse = page.getByRole("button", {
    name: "Collapse Harmony Companion",
  });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: /Talk to the companion/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Progressions" }).click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Free Input" }).click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await settlePaint(page);
  await expect(page).toHaveScreenshot("builder-desktop-expanded-companion.png", {
    fullPage: true,
  });
});

test.describe("375px builder layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("stacks both input modes and keeps the compact companion in bounds", async ({
    page,
  }) => {
    await mockReadyHealth(page);
    await page.goto("/");

    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    const run = page.getByRole("button", { name: "Run" });
    await expectStacked(freeInput, run);
    await expectNoDocumentOverflow(page);

    const panel = page.getByRole("region", {
      name: "Harmony companion voice agent",
    });
    expect((await panel.boundingBox())!.height).toBeLessThan(64);
    await settlePaint(page);
    await expect(page).toHaveScreenshot("builder-mobile-free.png", {
      fullPage: true,
    });

    await page.getByRole("button", { name: "Progressions" }).click();
    const prompt = page.getByRole("textbox", {
      name: "Describe the progression you want",
    });
    const build = page.getByRole("button", { name: "Build progression" });
    await expectStacked(prompt, build);
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await settlePaint(page);
    await expect(page).toHaveScreenshot("builder-mobile-progressions.png", {
      fullPage: true,
    });
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

    await page.goto("/");
    const input = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await input.fill("Cmaj7 Am7 Dm7 G7");
    await input.press("Enter");
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expect(
      page
        .getByRole("region", { name: "Chord cards output" })
        .locator('svg[height="auto"]'),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Piano" }).click();
    await expectNoDocumentOverflow(page);
    const keyboardScroller = page
      .getByRole("region", { name: "Chord cards output" })
      .locator(".overflow-x-auto")
      .first();
    const localWidths = await keyboardScroller.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(localWidths.scroll).toBeGreaterThan(localWidths.client);
    expect(browserErrors).toEqual([]);
  });
});

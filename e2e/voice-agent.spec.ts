import { expect, test } from "@playwright/test";

const HELP_LABEL = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

test.describe("Hanz Hasher voice sessions", () => {
  test("surfaces a signed-URL failure and restores the connect action", async ({
    page,
  }) => {
    await page.route("**/api/voice/signed-url", async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Could not start a voice session" }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const prompt = page.getByRole("textbox", { name: "Describe the progression you want" });
    await prompt.fill("I need another perspective");
    await page.getByRole("button", { name: HELP_LABEL }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();
    await page.getByRole("button", { name: "Hanz, Help!" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Could not start a voice session",
    );
    await expect(
      page.getByRole("button", { name: "Hanz, Help!" }),
    ).toBeEnabled();
    await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
  });

  test("does not request microphone access on mount and restores help focus on Escape", async ({
    page,
  }) => {
    let signedUrlRequests = 0;
    await page.route("**/api/voice/signed-url", async (route) => {
      signedUrlRequests += 1;
      await route.abort();
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    expect(signedUrlRequests).toBe(0);

    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("help me choose the next chord");
    const help = page.getByRole("button", { name: HELP_LABEL });
    await help.click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();
    const close = page.getByRole("button", { name: "Close Hanz Hasher" });
    await expect(close).toBeVisible();
    await expect(close).toBeFocused();
    expect(signedUrlRequests).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(signedUrlRequests).toBe(0);
  });

  test("aborts a pending signed-URL attempt when the popup closes", async ({ page }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => { requestStarted = resolve; });

    await page.route("**/api/voice/signed-url", async (route) => {
      requestStarted();
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedUrl: "wss://example.com/voice" }),
      }).catch(() => undefined);
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      (window as unknown as { __micRequests: number }).__micRequests = 0;
      const mediaDevices = navigator.mediaDevices ?? {};
      if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, "mediaDevices", {
          configurable: true,
          value: mediaDevices,
        });
      }
      Object.defineProperty(mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          (window as unknown as { __micRequests: number }).__micRequests += 1;
          return new MediaStream();
        },
      });
    });
    const prompt = page.getByRole("textbox", { name: "Describe the progression you want" });
    await prompt.fill("help before I change my mind");
    const help = page.getByRole("button", { name: HELP_LABEL });
    await help.click();
    await page.getByRole("button", { name: "Hanz, Help!" }).click();
    await started;

    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    releaseResponse();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    await expect.poll(() => page.evaluate(
      () => (window as unknown as { __micRequests: number }).__micRequests,
    )).toBe(0);
  });

  test("keeps the popup reachable in a short landscape viewport", async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("help in landscape");
    await page.getByRole("button", { name: HELP_LABEL }).click();

    const bounds = await page.getByRole("dialog", { name: "Hanz Hasher" }).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { top: rect.top, bottom: rect.bottom, maxHeight: style.maxHeight, overflowY: style.overflowY };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(375);
    expect(bounds.maxHeight).not.toBe("none");
    expect(bounds.overflowY).toBe("auto");
    await expect(page.getByRole("button", { name: "Close Hanz Hasher" })).toBeFocused();
  });
});

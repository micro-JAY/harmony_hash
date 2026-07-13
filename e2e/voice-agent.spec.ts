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
    await expect(page.getByRole("button", { name: "Close Hanz Hasher" })).toBeVisible();
    expect(signedUrlRequests).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(signedUrlRequests).toBe(0);
  });
});

import { expect, test } from "@playwright/test";

test.describe("Harmony Companion session failures", () => {
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

    await page.goto("/");
    await page.getByRole("button", { name: /Talk to the companion/i }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Could not start a voice session",
    );
    await expect(
      page.getByRole("button", { name: /Talk to the companion/i }),
    ).toBeEnabled();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  });
});

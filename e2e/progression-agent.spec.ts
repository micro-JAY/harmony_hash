import { expect, test, type Page } from "@playwright/test";

async function mockHealthyProgressionService(page: Page): Promise<void> {
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

async function openProgressionAgent(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Progressions" }).click();
  await expect(page.getByText("API ready", { exact: true })).toBeVisible();
}

test.describe("OpenAI progression builder", () => {
  test("renders a validated 3–8 chord response through the shared card path", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    await page.route("**/api/progression", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        prompt: "neo-soul turnaround with chromatic bass",
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chords: ["Cmaj7", "D/F#", "E7#9", "Am7"],
          key: "C major",
          rationale: "The slash chord and altered dominant pull smoothly into A minor.",
        }),
      });
    });

    await openProgressionAgent(page);
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("neo-soul turnaround with chromatic bass");
    await page.getByRole("button", { name: "Build progression" }).click();

    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "D/F#" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E7#9" })).toBeVisible();
    await expect(page.getByText("C major", { exact: true })).toBeVisible();
    await expect(
      page.getByText("The slash chord and altered dominant pull smoothly into A minor."),
    ).toBeVisible();
  });

  test("rejects a malformed success body without replacing existing cards", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    await page.route("**/api/progression", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chords: ["C", "G"],
          key: "C major",
          rationale: "Too short for the contract.",
        }),
      });
    });

    await page.goto("/");
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await freeInput.fill("Cmaj7 Am7 Dm7 G7");
    await freeInput.press("Enter");
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();

    await page.getByRole("button", { name: "Progressions" }).click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("test malformed response");
    await page.getByRole("button", { name: "Build progression" }).click();

    await expect(page.getByRole("alert")).toContainText("between 3 and 8");
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "G7" })).toBeVisible();
  });

  test("preserves prior cards on upstream failure and retries successfully", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    let attempts = 0;
    await page.route("**/api/progression", async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Progression service is temporarily unavailable",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chords: ["Fmaj9", "Am7", "D/F#", "G7"],
          key: "C major",
          rationale: "A brighter retry with a descending inner line.",
        }),
      });
    });

    await page.goto("/");
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await freeInput.fill("Cmaj7 Am7 Dm7 G7");
    await freeInput.press("Enter");
    await page.getByRole("button", { name: "Progressions" }).click();

    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("bright cinematic resolution");
    await page.getByRole("button", { name: "Build progression" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Progression service is temporarily unavailable",
    );
    await expect(page.getByRole("heading", { name: "Cmaj7" })).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByRole("heading", { name: "Fmaj9" })).toBeVisible();
    await expect(page.getByText("A brighter retry with a descending inner line.")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(attempts).toBe(2);
  });
});

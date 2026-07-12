import { expect, test, type Page } from "@playwright/test";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
  );
}

async function mockDelayedProgression(page: Page): Promise<{
  requestStarted: Promise<void>;
  releaseResponse: () => void;
  responseHandled: Promise<void>;
}> {
  const responseGate = deferred();
  const started = deferred();
  const handled = deferred();

  await page.route("**/api/progression", async (route) => {
    started.resolve();
    await responseGate.promise;
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chords: ["Cmaj7", "D/F#", "E7#9", "Am7"],
          key: "C major",
          rationale: "This response arrived after the user chose a newer result.",
        }),
      });
    } finally {
      handled.resolve();
    }
  });

  return {
    requestStarted: started.promise,
    releaseResponse: responseGate.resolve,
    responseHandled: handled.promise,
  };
}

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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Progressions" }).click();
  await expect(page.getByText("API ready", { exact: true })).toBeVisible();
}

test.describe("OpenAI progression builder", () => {
  test("keeps submission disabled until validated health is ready", async ({
    page,
  }) => {
    const healthGate = deferred();
    await page.route("**/api/health", async (route) => {
      await healthGate.promise;
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

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Progressions" }).click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("slow health check");
    const build = page.getByRole("button", { name: "Build progression" });
    await expect(page.getByText("Checking…", { exact: true })).toBeVisible();
    await expect(build).toBeDisabled();

    healthGate.resolve();
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
    await expect(build).toBeEnabled();
  });

  test("keeps submission disabled when health reports unavailable", async ({
    page,
  }) => {
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          provider: "openai",
          bindings: { openaiApiKey: false },
        }),
      });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Progressions" }).click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("should remain blocked");

    await expect(page.getByText("Service unavailable", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Build progression" }),
    ).toBeDisabled();
  });

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

    await page.getByRole("button", { name: "Free Input" }).click();
    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(
      page.getByText("The slash chord and altered dominant pull smoothly into A minor."),
    ).toBeVisible();

    await page.getByText("Or pick a preset", { exact: true }).click();
    await page.getByRole("combobox").nth(1).selectOption("minor");
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

    await page.goto("/", { waitUntil: "domcontentloaded" });
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

    await page.goto("/", { waitUntil: "domcontentloaded" });
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

  test("does not let a superseded agent response overwrite newer free input", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    const delayed = await mockDelayedProgression(page);

    await openProgressionAgent(page);
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("delayed agent response");
    await page.getByRole("button", { name: "Build progression" }).click();
    await delayed.requestStarted;

    await page.getByRole("button", { name: "Free Input" }).click();
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await freeInput.fill("Fmaj7 G7 Cmaj7 Am7");
    await freeInput.press("Enter");
    await expect(page.getByRole("heading", { name: "Fmaj7" })).toBeVisible();

    delayed.releaseResponse();
    await delayed.responseHandled;
    await settlePaint(page);
    await expect(page.getByRole("heading", { name: "Fmaj7" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "D/F#" })).toHaveCount(0);

    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(
      page.getByRole("textbox", { name: "Describe the progression you want" }),
    ).toHaveValue("delayed agent response");
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
  });

  test("does not let a superseded agent response overwrite a newer preset", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    const delayed = await mockDelayedProgression(page);

    await openProgressionAgent(page);
    const prompt = page.getByRole("textbox", {
      name: "Describe the progression you want",
    });
    await prompt.fill("delayed agent response");
    await page.getByRole("button", { name: "Build progression" }).click();
    await delayed.requestStarted;

    await page.getByText("Or pick a preset", { exact: true }).click();
    await page.getByTitle('The "Primary" Loop').click();
    await expect(page.getByRole("heading", { name: "F", exact: true })).toBeVisible();

    delayed.releaseResponse();
    await delayed.responseHandled;
    await settlePaint(page);
    await expect(page.getByRole("heading", { name: "F", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "D/F#" })).toHaveCount(0);
    await expect(prompt).toHaveValue("delayed agent response");
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();
  });

  test("does not let a superseded agent response overwrite a chord modifier", async ({
    page,
  }) => {
    await mockHealthyProgressionService(page);
    const delayed = await mockDelayedProgression(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await freeInput.fill("C G7 Am F");
    await freeInput.press("Enter");
    await page.getByRole("button", { name: "Progressions" }).click();
    await expect(page.getByText("API ready", { exact: true })).toBeVisible();

    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("delayed agent response");
    await page.getByRole("button", { name: "Build progression" }).click();
    await delayed.requestStarted;

    const secondCard = page.getByTestId("chord-card").nth(1);
    await secondCard.getByRole("button", { name: "Modify G7" }).click();
    await secondCard.getByRole("button", { name: "Change G7 to G7#9" }).click();
    await expect(secondCard.getByRole("heading", { name: "G7#9" })).toBeVisible();

    delayed.releaseResponse();
    await delayed.responseHandled;
    await settlePaint(page);
    await expect(secondCard.getByRole("heading", { name: "G7#9" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "D/F#" })).toHaveCount(0);
  });
});

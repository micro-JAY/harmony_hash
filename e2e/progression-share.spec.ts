import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

interface TestWindow extends Window {
  __hhCopiedShareLink?: string;
}

type ClipboardMode = "success" | "reject" | "hang";

async function installClipboardMock(page: Page, mode: ClipboardMode = "success"): Promise<void> {
  await page.addInitScript(({ behavior }) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (behavior === "reject") {
            throw new DOMException("Clipboard permission denied", "NotAllowedError");
          }
          if (behavior === "hang") await new Promise(() => undefined);
          (window as TestWindow).__hhCopiedShareLink = text;
        },
      },
    });
  }, { behavior: mode });
}

function trackBrowserProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(message.text());
    }
  });
  page.on("pageerror", (error) => problems.push(error.message));
  return problems;
}

test("shares a private snapshot, copies it, restores focus, and imports guitar/piano state", async ({
  page,
}) => {
  const browserProblems = trackBrowserProblems(page);
  await installClipboardMock(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7", "G7#9", "Bbmaj7"]);
  await page.getByRole("button", { name: "Piano" }).click();

  const sourceUrl = page.url();
  const trigger = page.getByRole("button", { name: "SHARE", exact: true });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Share this progression" });
  const linkInput = page.getByRole("textbox", { name: "Shareable progression link" });
  await expect(panel).toBeVisible();
  await expect(linkInput).toBeFocused();
  await expect(linkInput).toHaveAttribute("readonly", "");

  const shareLink = await linkInput.inputValue();
  const parsed = new URL(shareLink);
  expect([...parsed.searchParams.keys()]).toEqual(["hh", "instrument", "chords"]);
  expect(parsed.searchParams.get("hh")).toBe("1");
  expect(parsed.searchParams.get("instrument")).toBe("piano");
  expect(JSON.parse(parsed.searchParams.get("chords") ?? "")).toEqual([
    "Cmaj7",
    "G7#9",
    "Bbmaj7",
  ]);
  expect(shareLink).toContain("G7%239");
  expect(parsed.hash).toBe("");
  expect(page.url()).toBe(sourceUrl);
  await expect(panel).toContainText("Hanz conversations and prompts stay private.");

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Link copied." })).toBeVisible();
  expect(await page.evaluate(() => (window as TestWindow).__hhCopiedShareLink)).toBe(shareLink);
  expect(page.url()).toBe(sourceUrl);

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(linkInput).toBeFocused();
  await page.getByRole("button", { name: "RANDOMIZE (UNLOCKED VOICES)", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.goto(shareLink, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Piano" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("chord-card").locator("h3")).toHaveText([
    "Cmaj7",
    "G7#9",
    "Bbmaj7",
  ]);
  expect(page.url()).toBe(shareLink);
  expect(browserProblems).toEqual([]);
});

test("round-trips a Guitar progression through the rendered chord-card path", async ({ page }) => {
  const browserProblems = trackBrowserProblems(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7", "G7#9", "Bbmaj7"]);

  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  const shareLink = await page
    .getByRole("textbox", { name: "Shareable progression link" })
    .inputValue();
  expect(new URL(shareLink).searchParams.get("instrument")).toBe("guitar");

  await page.goto(shareLink, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Guitar", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const cards = page.getByTestId("chord-card");
  await expect(cards.locator("h3")).toHaveText(["Cmaj7", "G7#9", "Bbmaj7"]);
  await expect(cards.getByTestId("guitar-chord-diagram").locator("svg")).toHaveCount(3);
  expect(browserProblems).toEqual([]);
});

test("shows invalid and duplicate share payloads without breaking the composer", async ({ page }) => {
  const invalid = new URL("http://localhost:4173/");
  invalid.searchParams.set("hh", "1");
  invalid.searchParams.set("instrument", "guitar");
  invalid.searchParams.set("chords", JSON.stringify(["Cmaj7", "H13"]));
  await page.goto(invalid.toString(), { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("alert")).toContainText(
    "One or more chord names are not available in Harmony Hash.",
  );
  await expect(page.getByTestId("chord-card")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Chord progression composer" })).toBeVisible();

  await page.goto(
    "/?hh=1&hh=1&instrument=guitar&chords=%5B%22C%22%5D",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByRole("alert")).toContainText("missing or duplicate fields");
  await expect(page.getByTestId("chord-card")).toHaveCount(0);
});

for (const mode of ["reject", "hang"] as const) {
  test(`offers a truthful manual-copy fallback when clipboard access ${mode === "reject" ? "is denied" : "never settles"}`, async ({ page }) => {
    await installClipboardMock(page, mode);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["C", "G7"]);
    await page.getByRole("button", { name: "SHARE", exact: true }).click();

    const linkInput = page.getByRole("textbox", { name: "Shareable progression link" });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Copy wasn’t confirmed. The link is selected—copy it manually.",
    );
    await expect(linkInput).toBeFocused();
    const selection = await linkInput.evaluate((element) => {
      const input = element as HTMLInputElement;
      return {
        start: input.selectionStart,
        end: input.selectionEnd,
        length: input.value.length,
      };
    });
    expect(selection).toEqual({ start: 0, end: selection.length, length: selection.length });
  });
}

test("ignores a stale clipboard failure after the panel is reopened", async ({ page }) => {
  await page.addInitScript(() => {
    let attempt = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          attempt += 1;
          if (attempt === 1) {
            await new Promise((_, reject) => {
              window.setTimeout(
                () => reject(new DOMException("Clipboard permission denied", "NotAllowedError")),
                600,
              );
            });
          }
          (window as TestWindow).__hhCopiedShareLink = text;
        },
      },
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["C", "G7"]);

  const trigger = page.getByRole("button", { name: "SHARE", exact: true });
  await trigger.click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await page.keyboard.press("Escape");
  await trigger.click();
  await page.getByRole("button", { name: "Copy link" }).click();

  const panel = page.getByRole("dialog", { name: "Share this progression" });
  const copiedButton = page.getByRole("button", { name: "Copied" });
  await expect(panel.getByRole("status")).toHaveText("Link copied.");
  await expect(copiedButton).toBeFocused();
  await page.waitForTimeout(800);
  await expect(panel.getByRole("status")).toHaveText("Link copied.");
  await expect(copiedButton).toBeFocused();
  await expect(page.getByText("Copy wasn’t confirmed.")).toHaveCount(0);
});

test("ignores a stale clipboard failure after the shared instrument changes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          await new Promise((_, reject) => {
            window.setTimeout(
              () => reject(new DOMException("Clipboard permission denied", "NotAllowedError")),
              600,
            );
          });
        },
      },
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["C", "G7"]);

  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  const linkInput = page.getByRole("textbox", { name: "Shareable progression link" });
  await page.getByRole("button", { name: "Copy link" }).click();
  const pianoButton = page.getByRole("button", { name: "Piano", exact: true });
  await pianoButton.click();

  await expect(linkInput).toHaveValue(/instrument=piano/);
  await page.waitForTimeout(800);
  await expect(pianoButton).toBeFocused();
  await expect(page.getByText("Copy wasn’t confirmed.")).toHaveCount(0);
});

for (const viewport of [
  { label: "800px tablet", width: 800, height: 900 },
  { label: "375px mobile", width: 375, height: 812 },
] as const) {
  test(`${viewport.label} contains the share panel for pointer and keyboard use`, async ({ page }) => {
    const browserProblems = trackBrowserProblems(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);

    const trigger = page.getByRole("button", { name: "SHARE", exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    const panel = page.getByRole("dialog", { name: "Share this progression" });
    await expect(panel).toBeVisible();
    const bounds = await panel.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width);
    expect(bounds.width).toBeGreaterThan(0);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(browserProblems).toEqual([]);
  });
}

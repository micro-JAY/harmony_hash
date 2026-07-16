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

async function openNetwork(
  page: Page,
  context: { root?: string; scale?: string } = {},
): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
  if (context.root) await page.locator("#theory-root").selectOption(context.root);
  if (context.scale) await page.locator("#theory-scale").selectOption(context.scale);
  const disclosure = page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first();
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click();
  const network = page.getByTestId("note-neural-network");
  await expect(network).toBeVisible();
  const graph = network.getByTestId("mode-network-graph-scroller");
  await expect.poll(async () => graph.evaluate((element) => (
    Math.abs(Number(element.dataset.layoutWidth) - element.getBoundingClientRect().width)
  )), {
    message: "wait for the measured graph width to reach the rendered SVG layout",
  }).toBeLessThan(0.01);
  await graph.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test.describe("NOTE NEURAL NETWORK in TUNE TOOLBOX", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders a stable clustered graph with redundant relationship cues", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await openNetwork(page, { root: "E", scale: "harmonic_minor" });

    const network = page.getByTestId("note-neural-network");
    await expect(network).toHaveAccessibleName("NOTE NEURAL NETWORK");
    await expect(network.getByRole("img", { name: "E relationship network" })).toBeVisible();
    const semanticList = network.getByRole("list", { name: "Network nodes" });
    const listItems = semanticList.getByRole("listitem");
    const nodes = semanticList.getByRole("button");
    await expect(listItems).toHaveCount(18);
    await expect(nodes).toHaveCount(18);
    expect(await semanticList.evaluate((list) => Array.from(list.children).every((item) => (
      item.tagName === "LI" && item.firstElementChild?.tagName === "BUTTON"
    )))).toBe(true);
    await expect(nodes.filter({ hasText: "E Harmonic Minor" })).toHaveAttribute("aria-pressed", "true");
    const details = network.getByRole("complementary", { name: "E Harmonic Minor details" });
    await expect(details).toContainText("E · F# · G · A · B · C · D#");
    await expect(details).toContainText("1 · 2 · b3 · 4 · 5 · b6 · 7");
    await expect(network.getByLabel("Relationship strength legend")).toContainText("Strong relationship");
    await expect(network.getByLabel("Relationship strength legend")).toContainText("Weak relationship");

    const labels = await network.locator("svg g[role=button] title").allTextContents();
    expect(labels.some((label) => label.length > 16)).toBe(true);
    await expect(network).toHaveScreenshot("note-neural-network-desktop.png");
    expect(issues).toEqual([]);
  });

  test("restores family and parallel/relative exploration inside the Toolbox", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const family = network.getByRole("combobox", { name: "Family" });
    await expect(family).toHaveValue("major");
    await family.selectOption("harmonic_minor");
    await expect(family).toHaveValue("harmonic_minor");
    await expect(page.locator("#theory-scale")).toHaveValue("harmonic_minor");

    const relationship = network.getByRole("group", { name: "Relationship" });
    await relationship.getByRole("button", { name: "Parallel" }).click();
    await expect(relationship.getByRole("button", { name: "Parallel" }))
      .toHaveAttribute("aria-pressed", "true");
    const parallelLabels = await network.locator("[data-network-node] title").allTextContents();
    await relationship.getByRole("button", { name: "Relative" }).click();
    await expect(relationship.getByRole("button", { name: "Relative" }))
      .toHaveAttribute("aria-pressed", "true");
    const relativeLabels = await network.locator("[data-network-node] title").allTextContents();
    expect(relativeLabels).not.toEqual(parallelLabels);
    expect(issues).toEqual([]);
  });

  test("supports bounded pan, zoom, reset, and semantic keyboard traversal", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    await network.getByRole("button", { name: "Zoom in" }).click();
    await network.getByRole("button", { name: "Zoom in" }).click();
    await expect(network.getByText("130%", { exact: true })).toBeVisible();
    await network.getByRole("button", { name: "Pan right" }).click();
    await network.getByRole("button", { name: "Pan down" }).click();
    await network.getByRole("button", { name: "Reset network view" }).click();
    await expect(network.getByText("100%", { exact: true })).toBeVisible();

    const nodes = network.getByRole("list", { name: "Network nodes" }).getByRole("button");
    await nodes.first().focus();
    await nodes.first().press("End");
    await expect(nodes.last()).toBeFocused();
    await expect(nodes.last()).toHaveAttribute("aria-pressed", "true");
    await nodes.last().press("Home");
    await expect(nodes.first()).toBeFocused();
    expect(issues).toEqual([]);
  });

  test("opens a selected scale without leaving the shared Toolbox context", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page, { root: "D", scale: "dorian" });
    const network = page.getByTestId("note-neural-network");
    const selected = network.getByRole("list", { name: "Network nodes" })
      .getByRole("button").filter({ hasText: "D Dorian" });
    await selected.click();
    await network.getByRole("button", { name: "Open in SCALE SYNTHESIA" }).click();

    await expect(page.getByRole("button", { name: "TUNE TOOLBOX", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /SCALE SYNTHESIA/ }).first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("scale-synthesia")).toBeVisible();
    await expect(page.getByText("D Dorian · Ascending", { exact: true })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    expect(issues).toEqual([]);
  });

  test("preserves graph selection and the HASHER timeline across workspace round trips", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await composeProgression(page, ["Cmaj7", "Am7", "Dm7", "G7"]);
    await expect(page.getByRole("region", { name: "Progression actions" }).getByRole("button", { name: /Hanz/ })).toHaveCount(0);

    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await page.locator("#theory-root").selectOption("D");
    await page.locator("#theory-scale").selectOption("lydian_dominant");
    const disclosure = page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first();
    await disclosure.click();
    const network = page.getByTestId("note-neural-network");
    await expect(network.getByRole("img", { name: "D relationship network" })).toBeVisible();
    const semanticNodes = network.getByRole("list", { name: "Network nodes" }).getByRole("button");
    await semanticNodes.nth(2).click();
    const selectedName = (await network.getByRole("list", { name: "Network nodes" })
      .locator('li > button[aria-pressed="true"]').first().innerText()).trim();
    const selectedRoot = await page.locator("#theory-root").inputValue();

    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#theory-root")).toHaveValue(selectedRoot);
    await expect(network).toBeVisible();
    await expect(semanticNodes.filter({ hasText: selectedName })).toHaveAttribute("aria-pressed", "true");
    expect(issues).toEqual([]);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 820, height: 1000 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    test(`contains the graph and semantic path at ${viewport.name} width`, async ({ page }) => {
      const issues = collectBrowserIssues(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.name === "mobile") await page.emulateMedia({ reducedMotion: "reduce" });
      await openNetwork(page);

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )).toBe(false);
      const network = page.getByTestId("note-neural-network");
      await expect(network).toHaveAttribute(
        "data-reduced-motion",
        viewport.name === "mobile" ? "true" : "false",
      );
      await expect(network.getByRole("img", { name: "C relationship network" })).toBeVisible();
      await expect(network.getByRole("list", { name: "Network nodes" }).getByRole("button")).toHaveCount(18);
      if (viewport.name === "mobile") {
        const graph = network.getByTestId("mode-network-graph-scroller");
        const panDown = network.getByRole("button", { name: "Pan down" });
        expect(Number(await graph.getAttribute("data-graph-height")))
          .toBeGreaterThan(Number(await graph.getAttribute("data-viewport-height")));
        for (let step = 0; step < 60 && await panDown.isEnabled(); step += 1) {
          await panDown.click();
        }
        await expect(panDown).toBeDisabled();
        expect(Number(await graph.getAttribute("data-pan-y")))
          .toBe(Number(await graph.getAttribute("data-pan-min-y")));
        await expect(network.getByText("100%", { exact: true })).toBeVisible();
        const graphBox = await graph.boundingBox();
        const bottomNodeBox = await graph.locator("[data-network-node]").last().boundingBox();
        expect(graphBox).not.toBeNull();
        expect(bottomNodeBox).not.toBeNull();
        expect(bottomNodeBox!.y + bottomNodeBox!.height)
          .toBeLessThanOrEqual(graphBox!.y + graphBox!.height + 1);
        const animations = await network.evaluate((element) => element.getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length);
        expect(animations).toBe(0);
      }
      expect(issues).toEqual([]);
    });
  }
});

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

  test("renders a centered radial graph with redundant relationship cues", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page, { root: "E", scale: "harmonic_minor" });

    const network = page.getByTestId("note-neural-network");
    await expect(network).toHaveAccessibleName("NOTE NEURAL NETWORK");
    await expect(network.getByRole("img", { name: "E relationship network" })).toBeVisible();
    const graph = network.getByTestId("mode-network-graph-scroller");
    await expect(graph).toHaveAttribute("data-graph-projection", "desktop-radial");
    await expect(graph).toHaveCSS("background-color", "rgb(0, 0, 0)");
    const selectedGraphNode = graph.locator('[data-network-node="scale:E:harmonic_minor"]');
    const [graphBox, selectedGraphNodeBox] = await Promise.all([
      graph.boundingBox(),
      selectedGraphNode.boundingBox(),
    ]);
    expect(graphBox).not.toBeNull();
    expect(selectedGraphNodeBox).not.toBeNull();
    expect(Math.abs(
      selectedGraphNodeBox!.x + selectedGraphNodeBox!.width / 2
      - (graphBox!.x + graphBox!.width / 2),
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(
      selectedGraphNodeBox!.y + selectedGraphNodeBox!.height / 2
      - (graphBox!.y + graphBox!.height / 2),
    )).toBeLessThanOrEqual(1);
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
    await page.waitForTimeout(650);
    const overlaps = await graph.locator("[data-network-node]").evaluateAll((elements) => {
      const bounds = elements.map((element) => ({
        id: element.getAttribute("data-network-node"),
        rect: element.getBoundingClientRect(),
      }));
      const collisions: string[] = [];
      for (let leftIndex = 0; leftIndex < bounds.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < bounds.length; rightIndex += 1) {
          const left = bounds[leftIndex];
          const right = bounds[rightIndex];
          if (left.rect.left < right.rect.right && left.rect.right > right.rect.left
            && left.rect.top < right.rect.bottom && left.rect.bottom > right.rect.top) {
            collisions.push(`${left.id}/${right.id}`);
          }
        }
      }
      return collisions;
    });
    expect(overlaps).toEqual([]);
    await expect(network).toHaveScreenshot("note-neural-network-desktop.png", {
      animations: "allow",
    });
    expect(issues).toEqual([]);
  });

  test("inspects on single click and recenters scales only on double click", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const graph = network.getByTestId("mode-network-graph-scroller");
    const chord = graph.locator('[data-network-node="chord:C"]');
    await chord.click();
    await expect(network.getByRole("complementary", { name: "C details" })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await chord.dblclick();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");

    const dorian = graph.locator('[data-network-node="scale:D:dorian"]');
    await dorian.click();
    await expect(network.getByRole("complementary", { name: "D Dorian details" })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await dorian.dblclick();
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    const recentered = graph.locator('[data-network-node="scale:D:dorian"]');
    const [recenteredGraphBox, recenteredNodeBox] = await Promise.all([
      graph.boundingBox(),
      recentered.boundingBox(),
    ]);
    expect(recenteredGraphBox).not.toBeNull();
    expect(recenteredNodeBox).not.toBeNull();
    expect(Math.abs(
      recenteredNodeBox!.x + recenteredNodeBox!.width / 2
      - (recenteredGraphBox!.x + recenteredGraphBox!.width / 2),
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(
      recenteredNodeBox!.y + recenteredNodeBox!.height / 2
      - (recenteredGraphBox!.y + recenteredGraphBox!.height / 2),
    )).toBeLessThanOrEqual(1);
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
    const dorian = nodes.filter({ hasText: "D Dorian" });
    await dorian.focus();
    await dorian.press("Enter");
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
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
        await expect(graph).toHaveAttribute("data-graph-projection", "mobile-static");
        await expect(graph.locator("[data-network-node]")).toHaveCount(11);
        await expect(graph.locator('[role="button"]')).toHaveCount(0);
        await expect(network.getByRole("group", { name: "Network viewport controls" })).toHaveCount(0);
        await expect(network.getByText("100%", { exact: true })).toHaveCount(0);
        await expect(graph).toHaveScreenshot("note-neural-network-mobile-static.png");
        const graphBox = await graph.boundingBox();
        const bottomNodeBox = await graph.locator("[data-network-node]").last().boundingBox();
        expect(graphBox).not.toBeNull();
        expect(bottomNodeBox).not.toBeNull();
        expect(bottomNodeBox!.y + bottomNodeBox!.height)
          .toBeLessThanOrEqual(graphBox!.y + graphBox!.height + 1);
        await expect(graph).toHaveAttribute("data-graph-motion", "static");
      } else {
        const graph = network.getByTestId("mode-network-graph-scroller");
        await expect(graph).toHaveAttribute("data-graph-motion", "outward");
        await expect(graph).toHaveAttribute("data-graph-projection", "desktop-radial");
        await expect(network.getByRole("group", { name: "Network viewport controls" })).toBeVisible();
      }
      expect(issues).toEqual([]);
    });
  }
});

import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function findCanvasNodePoint(
  canvas: Locator,
  targetNodeId: string,
): Promise<Readonly<{ x: number; y: number }>> {
  await canvas.scrollIntoViewIfNeeded();
  const point = await canvas.evaluate((element, requestedId) => {
    const rect = element.getBoundingClientRect();
    const maximumRadius = Math.min(rect.width, rect.height) / 2 - 12;
    for (let radius = 0; radius <= maximumRadius; radius += 6) {
      for (let angleStep = 0; angleStep < 180; angleStep += 1) {
        const angle = angleStep / 180 * Math.PI * 2;
        const x = rect.width / 2 + Math.cos(angle) * radius;
        const y = rect.height / 2 + Math.sin(angle) * radius;
        element.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true,
          clientX: rect.left + x,
          clientY: rect.top + y,
          pointerId: 997,
          pointerType: "mouse",
        }));
        if (element.dataset.hoveredNode === requestedId) {
          return { x: rect.left + x, y: rect.top + y };
        }
      }
    }
    return null;
  }, targetNodeId);
  if (!point) throw new Error(`Unable to locate ${targetNodeId} on the NOTE NEURAL NETWORK canvas`);
  return point;
}

test.describe("NOTE NEURAL NETWORK in TUNE TOOLBOX", () => {
  test.describe.configure({ timeout: 90_000 });

  test("renders a centered high-DPI force canvas with redundant relationship cues", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    });
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page, { root: "E", scale: "harmonic_minor" });

    const network = page.getByTestId("note-neural-network");
    await expect(network).toHaveAccessibleName("NOTE NEURAL NETWORK");
    await expect(network.getByRole("img", { name: "E relationship network" })).toBeVisible();
    const graph = network.getByTestId("mode-network-graph-scroller");
    const canvas = network.getByTestId("note-network-canvas");
    await expect(graph).toHaveAttribute("data-graph-projection", "desktop-force-canvas");
    await expect(graph).toHaveAttribute("data-graph-motion", "settled");
    await expect(graph).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(canvas).toHaveAttribute("data-simulation-state", "settled");
    await expect(canvas).toHaveAttribute("data-node-count", "18");
    const canvasGeometry = await canvas.evaluate((element) => ({
      backingHeight: element.height,
      backingWidth: element.width,
      cssHeight: Number(element.dataset.cssHeight),
      cssWidth: Number(element.dataset.cssWidth),
      dpr: Number(element.dataset.devicePixelRatio),
      selectedX: Number(element.dataset.selectedNodeX),
      selectedY: Number(element.dataset.selectedNodeY),
    }));
    expect(canvasGeometry.dpr).toBe(2);
    expect(canvasGeometry.backingWidth).toBe(Math.round(canvasGeometry.cssWidth * 2));
    expect(canvasGeometry.backingHeight).toBe(Math.round(canvasGeometry.cssHeight * 2));
    expect(canvasGeometry.selectedX).toBeCloseTo(canvasGeometry.cssWidth / 2, 1);
    expect(canvasGeometry.selectedY).toBeCloseTo(canvasGeometry.cssHeight / 2, 1);
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

    const labels = await nodes.allTextContents();
    expect(labels.some((label) => label.length > 16)).toBe(true);
    await canvas.scrollIntoViewIfNeeded();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    await page.mouse.move(
      canvasBox!.x + canvasBox!.width / 2,
      canvasBox!.y + canvasBox!.height / 2,
    );
    await expect(canvas).toHaveAttribute("data-hovered-node", "scale:E:harmonic_minor");
    await expect(network).toHaveScreenshot("note-neural-network-desktop.png", {
      animations: "allow",
    });
    await canvas.evaluate(() => {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1.5 });
      window.dispatchEvent(new Event("resize"));
    });
    await expect(canvas).toHaveAttribute("data-device-pixel-ratio", "1.50");
    const resizedBackingStore = await canvas.evaluate((element) => ({
      height: element.height,
      width: element.width,
      cssHeight: Number(element.dataset.cssHeight),
      cssWidth: Number(element.dataset.cssWidth),
    }));
    expect(resizedBackingStore.width).toBe(Math.round(resizedBackingStore.cssWidth * 1.5));
    expect(resizedBackingStore.height).toBe(Math.round(resizedBackingStore.cssHeight * 1.5));
    expect(issues).toEqual([]);
  });

  test("inspects on single click and recenters scales only on double click", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const canvas = network.getByTestId("note-network-canvas");
    const chordPoint = await findCanvasNodePoint(canvas, "chord:C");
    await page.mouse.click(chordPoint.x, chordPoint.y);
    await expect(network.getByRole("complementary", { name: "C details" })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await page.mouse.dblclick(chordPoint.x, chordPoint.y);
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");

    const dorianPoint = await findCanvasNodePoint(canvas, "scale:D:dorian");
    await page.mouse.click(dorianPoint.x, dorianPoint.y);
    await expect(network.getByRole("complementary", { name: "D Dorian details" })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await page.mouse.dblclick(dorianPoint.x, dorianPoint.y);
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(canvas).toHaveAttribute("data-simulation-state", "settled");
    const centered = await canvas.evaluate((element) => ({
      height: Number(element.dataset.cssHeight),
      selectedX: Number(element.dataset.selectedNodeX),
      selectedY: Number(element.dataset.selectedNodeY),
      width: Number(element.dataset.cssWidth),
    }));
    expect(centered.selectedX).toBeCloseTo(centered.width / 2, 1);
    expect(centered.selectedY).toBeCloseTo(centered.height / 2, 1);
    expect(issues).toEqual([]);
  });

  test("keeps physics active during node drag and supports background pan and cursor zoom", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const canvas = network.getByTestId("note-network-canvas");
    await expect.poll(async () => canvas.getAttribute("data-simulation-state"), {
      message: "wait for the initial force layout to settle before interaction",
    }).toBe("settled");

    const chordPoint = await findCanvasNodePoint(canvas, "chord:C");
    await page.mouse.move(chordPoint.x, chordPoint.y);
    await page.mouse.down();
    await page.mouse.move(chordPoint.x + 110, chordPoint.y - 64, { steps: 8 });
    await expect(canvas).toHaveAttribute("data-dragged-node", "chord:C");
    await expect(canvas).toHaveAttribute("data-simulation-state", "active");
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-dragged-node", "");
    await expect.poll(async () => Number(await canvas.getAttribute("data-simulation-energy")))
      .toBeGreaterThan(0);

    await network.getByRole("button", { name: "Reset network view" }).click();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const emptyStart = {
      x: canvasBox!.x + 18,
      y: canvasBox!.y + canvasBox!.height - 18,
    };
    await page.mouse.move(emptyStart.x, emptyStart.y);
    await page.mouse.down();
    await page.mouse.move(emptyStart.x + 92, emptyStart.y - 48, { steps: 6 });
    await page.mouse.up();
    const panned = await canvas.evaluate((element) => ({
      x: Number(element.dataset.cameraPanX),
      y: Number(element.dataset.cameraPanY),
    }));
    expect(Math.abs(panned.x)).toBeGreaterThan(40);
    expect(Math.abs(panned.y)).toBeGreaterThan(20);

    await network.getByRole("button", { name: "Reset network view" }).click();
    const zoomCursor = {
      x: canvasBox!.x + canvasBox!.width * 0.72,
      y: canvasBox!.y + canvasBox!.height * 0.38,
    };
    await page.mouse.move(zoomCursor.x, zoomCursor.y);
    await page.mouse.wheel(0, -180);
    const zoomed = await canvas.evaluate((element) => ({
      panX: Number(element.dataset.cameraPanX),
      panY: Number(element.dataset.cameraPanY),
      scale: Number(element.dataset.cameraScale),
    }));
    expect(zoomed.scale).toBeGreaterThan(1);
    expect(Math.abs(zoomed.panX) + Math.abs(zoomed.panY)).toBeGreaterThan(1);
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
    const parallelLabels = await network.getByRole("list", { name: "Network nodes" })
      .getByRole("button").allTextContents();
    await relationship.getByRole("button", { name: "Relative" }).click();
    await expect(relationship.getByRole("button", { name: "Relative" }))
      .toHaveAttribute("aria-pressed", "true");
    const relativeLabels = await network.getByRole("list", { name: "Network nodes" })
      .getByRole("button").allTextContents();
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
        await expect(network.getByTestId("note-network-canvas")).toHaveCount(0);
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
        const canvas = network.getByTestId("note-network-canvas");
        await expect(graph).toHaveAttribute("data-graph-motion", "force");
        await expect(graph).toHaveAttribute("data-graph-projection", "desktop-force-canvas");
        await expect(canvas).toHaveCount(1);
        await expect(canvas).toHaveAttribute("data-node-count", "18");
        await expect(network.getByRole("group", { name: "Network viewport controls" })).toBeVisible();
      }
      expect(issues).toEqual([]);
    });
  }
});

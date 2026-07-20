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

  test("separates inspection, progressive expansion, and explicit centering", async ({ page }) => {
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
    await expect.poll(async () => Number(await canvas.getAttribute("data-node-count")))
      .toBeGreaterThan(18);
    const chordExpansionCount = Number(await canvas.getAttribute("data-node-count"));
    await expect(network).toHaveAttribute("data-exploration-count", "1");

    const dorianPoint = await findCanvasNodePoint(canvas, "scale:D:dorian");
    await page.mouse.click(dorianPoint.x, dorianPoint.y);
    await expect(network.getByRole("complementary", { name: "D Dorian details" })).toBeVisible();
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await page.mouse.dblclick(dorianPoint.x, dorianPoint.y);
    await expect.poll(async () => Number(await canvas.getAttribute("data-node-count")))
      .toBeGreaterThan(chordExpansionCount);
    await expect(network).toHaveAttribute("data-exploration-count", "2");
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await network.getByRole("button", { name: "Make center" }).click();
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(network).toHaveAttribute("data-exploration-count", "0");
    await expect(canvas).toHaveAttribute("data-node-count", "18");
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

  test("pins by a stationary 550ms press and exposes equivalent explicit controls", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const canvas = network.getByTestId("note-network-canvas");
    const chordPoint = await findCanvasNodePoint(canvas, "chord:C");

    await page.mouse.move(chordPoint.x, chordPoint.y);
    await page.mouse.down();
    await page.waitForTimeout(575);
    await expect(canvas).toHaveAttribute("data-pinned-nodes", /chord:C/);
    await page.mouse.up();
    await expect(network.getByTestId("network-pin-status")).toContainText("C · Pinned");

    const pinnedPointBeforeCollapse = await findCanvasNodePoint(canvas, "chord:C");
    const canvasBoxBeforeCollapse = await canvas.boundingBox();
    expect(canvasBoxBeforeCollapse).not.toBeNull();
    const disclosure = page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await disclosure.click();
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-pinned-nodes", /chord:C/);
    const pinnedPointAfterReopen = await findCanvasNodePoint(canvas, "chord:C");
    const canvasBoxAfterReopen = await canvas.boundingBox();
    expect(canvasBoxAfterReopen).not.toBeNull();
    expect(pinnedPointAfterReopen.x - canvasBoxAfterReopen!.x)
      .toBeCloseTo(pinnedPointBeforeCollapse.x - canvasBoxBeforeCollapse!.x, 0);
    expect(pinnedPointAfterReopen.y - canvasBoxAfterReopen!.y)
      .toBeCloseTo(pinnedPointBeforeCollapse.y - canvasBoxBeforeCollapse!.y, 0);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(network.getByTestId("note-network-canvas")).toHaveCount(0);
    await expect(network.getByTestId("mode-network-graph-scroller"))
      .toHaveAttribute("data-graph-projection", "mobile-static");
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-pinned-nodes", /chord:C/);

    await network.getByRole("list", { name: "Network nodes" })
      .getByRole("button", { name: /chord · C · Pinned/ }).click();
    const unpin = network.getByRole("button", { name: "Unpin node" });
    await expect(unpin).toHaveAttribute("aria-pressed", "true");
    await unpin.click();
    await expect(canvas).toHaveAttribute("data-pinned-nodes", "[]");
    await expect(network.getByTestId("network-pin-status")).toContainText("C · Unpinned");

    const cancelledPoint = await findCanvasNodePoint(canvas, "chord:F");
    await page.mouse.move(cancelledPoint.x, cancelledPoint.y);
    await page.mouse.down();
    await page.mouse.move(cancelledPoint.x + 24, cancelledPoint.y, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(575);
    await expect(canvas).toHaveAttribute("data-pinned-nodes", "[]");

    const pointerCancelPoint = await findCanvasNodePoint(canvas, "chord:G");
    await page.mouse.move(pointerCancelPoint.x, pointerCancelPoint.y);
    await page.mouse.down();
    await canvas.dispatchEvent("pointercancel", {
      bubbles: true,
      button: 0,
      clientX: pointerCancelPoint.x,
      clientY: pointerCancelPoint.y,
      pointerId: 1,
      pointerType: "mouse",
    });
    await page.mouse.up();
    await page.waitForTimeout(575);
    await expect(canvas).toHaveAttribute("data-pinned-nodes", "[]");
    expect(issues).toEqual([]);
  });

  test("preserves exploration, pins, and selection across a Circle insight round trip", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const nodes = network.getByRole("list", { name: "Network nodes" });
    const cChord = nodes.locator('[data-network-node="chord:C"]');

    await cChord.click();
    await network.getByRole("button", { name: "Expand connections" }).click();
    await network.getByRole("button", { name: "Pin node" }).click();
    await nodes.locator('[data-network-node="scale:D:dorian"]').click();
    await network.getByRole("button", { name: "Pan right" }).click();
    const originalCameraPan = await network.getByTestId("note-network-canvas")
      .getAttribute("data-camera-pan-x");
    const originalPinnedPoint = await findCanvasNodePoint(
      network.getByTestId("note-network-canvas"),
      "chord:C",
    );
    const originalCanvasBox = await network.getByTestId("note-network-canvas").boundingBox();
    expect(originalCanvasBox).not.toBeNull();
    await expect(network).toHaveAttribute("data-exploration-count", "1");
    await expect(cChord).toHaveAttribute("data-network-pinned", "true");
    await expect(nodes.locator('[data-network-node="scale:D:dorian"]'))
      .toHaveAttribute("aria-pressed", "true");

    const circleDisclosure = page.locator('button[aria-controls="theory-tool-circle"]');
    if (await circleDisclosure.getAttribute("aria-expanded") !== "true") {
      await circleDisclosure.click();
    }
    await page.getByTestId("circle-mode-insights")
      .locator('[data-insight-id="dorian"]')
      .click();
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(network).toHaveAttribute("data-exploration-count", "0");
    await expect(network.getByTestId("note-network-canvas")).toHaveAttribute("data-pinned-nodes", "[]");
    await expect(nodes.locator('[data-network-node="scale:C:dorian"]'))
      .toHaveAttribute("aria-pressed", "true");

    const targetChord = nodes.locator('[data-network-kind="chord"]').first();
    await targetChord.click();
    await network.getByRole("button", { name: "Expand connections" }).click();
    await expect(network).toHaveAttribute("data-exploration-count", "1");

    await page.locator("#theory-scale").selectOption("major");
    await expect(network).toHaveAttribute("data-exploration-count", "1");
    await expect(cChord).toHaveAttribute("data-network-pinned", "true");
    await expect(network.getByTestId("note-network-canvas"))
      .toHaveAttribute("data-camera-pan-x", originalCameraPan ?? "42.00");
    const restoredPinnedPoint = await findCanvasNodePoint(
      network.getByTestId("note-network-canvas"),
      "chord:C",
    );
    const restoredCanvasBox = await network.getByTestId("note-network-canvas").boundingBox();
    expect(restoredCanvasBox).not.toBeNull();
    expect(restoredPinnedPoint.x - restoredCanvasBox!.x)
      .toBeCloseTo(originalPinnedPoint.x - originalCanvasBox!.x, 0);
    expect(restoredPinnedPoint.y - restoredCanvasBox!.y)
      .toBeCloseTo(originalPinnedPoint.y - originalCanvasBox!.y, 0);
    await expect(nodes.locator('[data-network-node="scale:D:dorian"]'))
      .toHaveAttribute("aria-pressed", "true");

    await network.getByRole("button", { name: "Make center" }).click();
    await expect(page.locator("#theory-root")).toHaveValue("D");
    await expect(page.locator("#theory-scale")).toHaveValue("dorian");
    await expect(network).toHaveAttribute("data-exploration-count", "0");
    await expect(network.getByTestId("note-network-canvas")).toHaveAttribute("data-pinned-nodes", "[]");

    await page.locator("#theory-root").selectOption("C");
    await page.locator("#theory-scale").selectOption("major");
    await expect(network).toHaveAttribute("data-exploration-count", "0");
    await expect(network.getByTestId("note-network-canvas")).toHaveAttribute("data-pinned-nodes", "[]");
    await expect(nodes.locator('[data-network-node="scale:C:major"]'))
      .toHaveAttribute("aria-pressed", "true");
    expect(issues).toEqual([]);
  });

  test("keeps unresolved seed chords inspectable without offering expansion", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNetwork(page, { root: "C#", scale: "major" });

    const network = page.getByTestId("note-neural-network");
    const leadingTone = network.getByRole("list", { name: "Network nodes" })
      .locator('[data-network-node="chord:B#dim"]');
    await expect(leadingTone).toBeVisible();
    await leadingTone.click();
    await expect(network.getByTestId("network-selection-kind")).toHaveText("Selected · CHORD");
    await expect(network.getByRole("button", { name: "Expand connections" })).toHaveCount(0);
    await expect(network).toHaveAttribute("data-exploration-count", "0");
    expect(issues).toEqual([]);
  });

  test("explains the graph in a focus-restoring accessible dialog", async ({ page }) => {
    const issues = collectBrowserIssues(page);
    await openNetwork(page);
    const network = page.getByTestId("note-neural-network");
    const trigger = network.getByRole("button", { name: "About NOTE NEURAL NETWORK" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "How NOTE NEURAL NETWORK works" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Scales use a double ring");
    await expect(dialog).toContainText("Hold a stationary node for 550ms");
    await expect(dialog).toContainText("Relative compares modes");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
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

    const interruptedPoint = await findCanvasNodePoint(canvas, "chord:F");
    await page.mouse.move(interruptedPoint.x, interruptedPoint.y);
    await page.mouse.down();
    await page.mouse.move(interruptedPoint.x + 36, interruptedPoint.y - 18, { steps: 3 });
    await expect(canvas).toHaveAttribute("data-dragged-node", "chord:F");
    const disclosure = page.getByRole("button", { name: /NOTE NEURAL NETWORK/ }).first();
    await disclosure.evaluate((element: HTMLButtonElement) => element.click());
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await page.mouse.up();
    await disclosure.click();
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-dragged-node", "");
    const resumedPoint = await findCanvasNodePoint(canvas, "chord:F");
    await page.mouse.move(resumedPoint.x, resumedPoint.y);
    await page.mouse.down();
    await page.mouse.move(resumedPoint.x - 30, resumedPoint.y + 12, { steps: 3 });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-dragged-node", "");

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
    await expect(page.locator("#theory-root")).toHaveValue("C");
    await expect(page.locator("#theory-scale")).toHaveValue("major");
    await expect(network).toHaveAttribute("data-exploration-count", "1");
    await network.getByRole("button", { name: "Make center" }).click();
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
    const selectedId = await network.getByRole("list", { name: "Network nodes" })
      .locator('li > button[aria-pressed="true"]').first().getAttribute("data-network-node");
    expect(selectedId).not.toBeNull();
    const selectedRoot = await page.locator("#theory-root").inputValue();

    await page.getByRole("button", { name: "HASHER", exact: true }).click();
    await expect(page.getByTestId("chord-card")).toHaveCount(4);
    await page.getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#theory-root")).toHaveValue(selectedRoot);
    await expect(network).toBeVisible();
    await expect(network.getByRole("list", { name: "Network nodes" })
      .locator(`[data-network-node="${selectedId}"]`)).toHaveAttribute("aria-pressed", "true");
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
        await network.getByRole("list", { name: "Network nodes" })
          .locator('[data-network-node="chord:C"]').click();
        await network.getByRole("button", { name: "Expand connections" }).click();
        await expect(network).toHaveAttribute("data-exploration-count", "1");
        await expect.poll(async () => network.getByRole("list", { name: "Network nodes" })
          .getByRole("button").count()).toBeGreaterThan(18);
        await expect(graph.locator("[data-network-node]")).toHaveCount(11);
        await expect(network.getByTestId("note-network-canvas")).toHaveCount(0);
        await expect(network.getByRole("button", { name: "Pin node" })).toHaveCount(0);
        await expect(network).toContainText("mobile keeps a static graph to conserve resources");
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

import { expect, test } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

test("touch-drags a chip to an insertion boundary on a wrapped composer row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const names = ["C", "Dm", "Em", "F", "G7", "Am", "Bdim"];
  await composeProgression(page, names);

  const composer = page.getByTestId("chord-composer");
  const chips = composer.locator("[data-composer-chip-index]");
  const boxes = await chips.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }));
  const firstRowTop = boxes[0]?.top;
  expect(firstRowTop).toBeDefined();
  const targetIndex = boxes.findIndex((box) => Math.abs(box.top - firstRowTop!) > 2);
  expect(targetIndex).toBeGreaterThan(0);

  const sourceIndex = 0;
  expect(targetIndex).toBeGreaterThan(sourceIndex);
  const source = boxes[sourceIndex];
  const target = boxes[targetIndex];
  const start = {
    x: source.left + source.width / 2,
    y: source.top + source.height / 2,
  };
  const end = {
    x: target.left + 1,
    y: target.top + target.height / 2,
  };

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...start, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      id: 0,
      force: 1,
      radiusX: 4,
      radiusY: 4,
    }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...end, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  const expected = [...names];
  const [moved] = expected.splice(sourceIndex, 1);
  const destinationIndex = targetIndex - 1;
  expected.splice(destinationIndex, 0, moved);
  await expect(chips).toHaveText(expected);
  await expect(chips.nth(destinationIndex)).toBeFocused();
  await expect(page.locator('.sr-only[role="status"]')).toContainText(
    `${moved} moved to position ${destinationIndex + 1} of ${names.length}`,
  );
  await cdp.detach();
});

test("touch-drags a committed chord outside the composer to remove it immediately", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["C", "F", "G7"]);

  const composer = page.getByTestId("chord-composer");
  const chips = composer.locator("[data-composer-chip-index]");
  const source = await chips.nth(1).boundingBox();
  expect(source).not.toBeNull();
  const start = {
    x: source!.x + source!.width / 2,
    y: source!.y + source!.height / 2,
  };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...start, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{
      x: start.x + 12,
      y: start.y + 12,
      id: 0,
      force: 1,
      radiusX: 4,
      radiusY: 4,
    }],
  });

  const end = { x: 2, y: 2 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...end, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await expect(composer).toHaveAttribute("data-composer-drag-zone", "outside");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await expect(chips).toHaveText(["C", "G7"]);
  await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["C", "G7"]);
  await cdp.detach();
});

test("touch cancellation, lost capture, and Escape leave the committed timeline intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["C", "F", "G7"]);

  const composer = page.getByTestId("chord-composer");
  const chips = composer.locator("[data-composer-chip-index]");
  const source = await chips.first().boundingBox();
  expect(source).not.toBeNull();
  const start = {
    x: source!.x + source!.width / 2,
    y: source!.y + source!.height / 2,
  };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });

  await page.evaluate(() => {
    document.addEventListener("pointerdown", (event) => {
      (window as Window & { __hhLastPointerId?: number }).__hhLastPointerId = event.pointerId;
    }, { capture: true });
  });

  async function beginTouchDrag() {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: start.x + 12,
        y: start.y + 12,
        id: 0,
        force: 1,
        radiusX: 4,
        radiusY: 4,
      }],
    });
    await expect(composer).toHaveAttribute("data-composer-drag-zone", "composer");
  }

  await beginTouchDrag();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(composer).toHaveAttribute("data-composer-drag-zone", "idle");
  await expect(chips).toHaveText(["C", "F", "G7"]);

  await beginTouchDrag();
  const pointerId = await page.evaluate(
    () => (window as Window & { __hhLastPointerId?: number }).__hhLastPointerId,
  );
  expect(pointerId).toBeDefined();
  await chips.first().dispatchEvent("lostpointercapture", { pointerId });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 2, y: 2, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(chips).toHaveText(["C", "F", "G7"]);

  await beginTouchDrag();
  await page.keyboard.press("Escape");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 2, y: 2, id: 0, force: 1, radiusX: 4, radiusY: 4 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(chips).toHaveText(["C", "F", "G7"]);
  await expect(page.getByTestId("chord-card").locator("h3")).toHaveText(["C", "F", "G7"]);
  await cdp.detach();
});

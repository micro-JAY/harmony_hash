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

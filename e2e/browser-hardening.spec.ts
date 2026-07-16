import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function dispatchNativeDrag(
  page: Page,
  source: Locator,
  target: Locator,
  targetPosition: { clientX: number; clientY: number },
): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer, ...targetPosition });
  await target.dispatchEvent("drop", { dataTransfer, ...targetPosition });
  await source.dispatchEvent("dragend", { dataTransfer });
  await dataTransfer.dispose();
}

test("renders only allowlisted chord SVG nodes and attributes", async ({ page }) => {
  await page.route("**/music_src/**/*.svg", async (route) => {
    await route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg width='230' height='230' xmlns='http://www.w3.org/2000/svg' onload='window.__hhSvgExecuted=true'>
        <script>window.__hhSvgExecuted=true</script>
        <foreignObject><div xmlns='http://www.w3.org/1999/xhtml'>unsafe</div></foreignObject>
        <a href='javascript:window.__hhSvgExecuted=true'><text x='1' y='1'>unsafe</text></a>
        <rect x='45' y='36' width='150' height='160' fill='#e1dce2' stroke='black' stroke-width='2' style='fill:url(javascript:alert(1))'/>
        <line x1='45' y1='36' x2='195' y2='36' stroke='black' stroke-width='2'/>
        <circle cx='45' cy='56' r='13' fill='#FF8000' stroke='black' stroke-width='2' onmouseover='window.__hhSvgExecuted=true'/>
        <text x='41' y='61' font-size='14' font-family='Arial' fill='black'>1</text>
      </svg>`,
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, "C");
  const diagram = page.getByTestId("guitar-chord-diagram").first();
  await expect(diagram.locator("svg")).toBeVisible();

  const result = await diagram.evaluate((container) => {
    const svg = container.querySelector("svg");
    if (!svg) throw new Error("Sanitized SVG did not render");
    const dangerousAttributes = Array.from(svg.querySelectorAll("*")).flatMap((element) => (
      Array.from(element.attributes)
        .filter((attribute) => (
          attribute.name.startsWith("on")
          || attribute.name === "href"
          || attribute.name === "xlink:href"
          || (attribute.name === "style" && element.localName !== "svg")
        ))
        .map((attribute) => `${element.localName}:${attribute.name}`)
    ));
    return {
      dangerousAttributes,
      dangerousElements: svg.querySelectorAll("script, foreignObject, a, image").length,
      safeShapeCount: svg.querySelectorAll("rect, line, circle, text").length,
      executed: (window as Window & { __hhSvgExecuted?: boolean }).__hhSvgExecuted ?? false,
    };
  });

  expect(result).toEqual({
    dangerousAttributes: [],
    dangerousElements: 0,
    safeShapeCount: 4,
    executed: false,
  });
});

test("does not trust forged internal drag MIME data", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, "C G7 Am");
  const composer = page.getByTestId("chord-composer");
  const chips = composer.locator("[data-composer-chip-index]");
  const firstChip = await chips.first().boundingBox();
  expect(firstChip).not.toBeNull();
  const forgedTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData("application/x-harmony-hash-timeline-index", "2");
    transfer.setData("text/plain", "Dm");
    return transfer;
  });
  await composer.dispatchEvent("dragover", {
    dataTransfer: forgedTransfer,
    clientX: firstChip!.x,
    clientY: firstChip!.y + firstChip!.height / 2,
  });
  await composer.dispatchEvent("drop", {
    dataTransfer: forgedTransfer,
    clientX: firstChip!.x,
    clientY: firstChip!.y + firstChip!.height / 2,
  });
  await forgedTransfer.dispose();

  await expect(chips).toHaveText(["Dm", "C", "G7", "Am"]);
  const newFirstChip = await chips.first().boundingBox();
  expect(newFirstChip).not.toBeNull();
  await dispatchNativeDrag(
    page,
    chips.last(),
    composer,
    {
      clientX: newFirstChip!.x,
      clientY: newFirstChip!.y + newFirstChip!.height / 2,
    },
  );
  await expect(chips).toHaveText(["Am", "Dm", "C", "G7"]);
});

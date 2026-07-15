import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function dispatchNativeDrag(page: Page, source: Locator, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
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
  const firstSlot = composer.getByTestId("timeline-insertion-slot").first();
  const forgedTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData("application/x-harmony-hash-timeline-index", "2");
    transfer.setData("text/plain", "Dm");
    return transfer;
  });
  await firstSlot.dispatchEvent("dragover", { dataTransfer: forgedTransfer });
  await firstSlot.dispatchEvent("drop", { dataTransfer: forgedTransfer });
  await forgedTransfer.dispose();

  await expect(composer.getByRole("listitem")).toHaveText(["Dm", "C", "G7", "Am"]);
  await dispatchNativeDrag(
    page,
    composer.getByRole("listitem").last(),
    composer.getByTestId("timeline-insertion-slot").first(),
  );
  await expect(composer.getByRole("listitem")).toHaveText(["Am", "Dm", "C", "G7"]);
});

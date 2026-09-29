import { expect, type Page } from "@playwright/test";

/** Open the relocated tool without resetting its remembered state. */
export async function openFretFinder(page: Page, settings = true): Promise<void> {
  await page.getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "TUNE TOOLBOX", exact: true }).click();
  for (const name of ["scales", "circle", "network"]) {
    const other = page.locator(`button[aria-controls="theory-tool-${name}"]`);
    if (await other.getAttribute("aria-expanded") === "true") await other.click();
  }
  const toggle = page.locator('button[aria-controls="theory-tool-fretboard"]');
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  const tool = page.getByTestId("fretboard-workspace");
  await expect(tool).toBeVisible();
  if (settings) {
    const detail = tool.locator("details");
    if (!(await detail.evaluate((element) => element.hasAttribute("open")))) {
      await detail.locator("summary").click();
    }
  }
}

export async function openMoodFilter(page: Page): Promise<void> {
  const detail = page.locator("details").filter({ has: page.locator("#theory-mood") });
  if (!(await detail.evaluate((element) => element.hasAttribute("open")))) {
    await detail.locator("summary").click();
  }
}

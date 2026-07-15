import { expect, type Page } from "@playwright/test";

export async function composeProgression(
  page: Page,
  chordNames: ReadonlyArray<string> | string,
): Promise<void> {
  const names = typeof chordNames === "string" ? chordNames.trim().split(/\s+/) : chordNames;
  const composer = page.getByTestId("chord-composer");
  const existing = composer.locator("[data-composer-chip-index]");
  while (await existing.count()) {
    await existing.last().focus();
    await existing.last().press("Delete");
  }

  const input = page.getByRole("textbox", { name: "Chord progression input" });
  for (const chordName of names) {
    await input.fill(chordName);
    await input.press("Enter");
  }

  await expect(composer.locator("[data-composer-chip-index]")).toHaveCount(names.length);
  await page.getByRole("button", { name: "Run chord composer" }).click();
}

import { expect, type Page } from "@playwright/test";

const DISPLAY_SPELLINGS: Readonly<Record<string, string>> = {
  Df: "C#",
  Ef: "Eb",
  Gf: "F#",
  Af: "Ab",
  Bf: "Bb",
};

function gridSpelling(chordName: string): string {
  return chordName
    .replace(/^[a-g]/, (root) => root.toUpperCase())
    .replace(/^[A-G]f/, (root) => DISPLAY_SPELLINGS[root] ?? root);
}

export async function composeProgression(
  page: Page,
  chordNames: ReadonlyArray<string> | string,
): Promise<void> {
  const names = typeof chordNames === "string" ? chordNames.trim().split(/\s+/) : chordNames;
  const clear = page.getByRole("button", { name: "Clear composed chords" });
  if (await clear.isVisible()) await clear.click();
  const browse = page.getByRole("button", { name: "Browse chords ↓" });
  if (await browse.isVisible()) await browse.click();

  await page.getByRole("button", { name: "All", exact: true }).click();

  for (const chordName of names) {
    const displayName = gridSpelling(chordName);
    const cell = page.locator(`[data-chord-name="${displayName}"]`);
    await expect(cell).toHaveCount(1);
    await cell.click();
  }

  await page.getByRole("button", { name: "Run chord composer" }).click();
}

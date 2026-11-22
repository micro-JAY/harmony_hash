import { expect, test, type Locator, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

interface PlayedNote {
  midi: number;
  wave: OscillatorType;
  interrupted: boolean;
}

type AudioProbeWindow = Window & { auditionNotes: PlayedNote[] };

function playedNotes(page: Page) {
  return page.evaluate(() => (window as AudioProbeWindow).auditionNotes);
}

function ascending(notes: number[]) {
  return notes.sort((a, b) => a - b);
}

async function displayedMidi(card: Locator, selector: string) {
  const notes = await card.locator(selector).evaluateAll((elements) =>
    elements.map((element) => Number(element.getAttribute("data-midi"))),
  );
  expect(notes.length).toBeGreaterThan(0);
  return ascending(notes);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const notes: PlayedNote[] = [];
    (window as AudioProbeWindow).auditionNotes = notes;
    const byOscillator = new WeakMap<OscillatorNode, PlayedNote>();
    const { start, stop } = OscillatorNode.prototype;
    OscillatorNode.prototype.start = function (when) {
      start.call(this, when);
      const note = {
        midi: Math.round(69 + 12 * Math.log2(this.frequency.value / 440)),
        wave: this.type,
        interrupted: false,
      };
      byOscillator.set(this, note);
      notes.push(note);
    };
    OscillatorNode.prototype.stop = function (when) {
      stop.call(this, when);
      const note = byOscillator.get(this);
      if (note && when === undefined) note.interrupted = true;
    };
  });
  await page.goto("/");
});

test("restarts the displayed piano voicing on each header click, Enter and Space", async ({ page }) => {
  await composeProgression(page, ["Dm7", "Cmaj7"]);
  await page.getByRole("button", { name: "Piano", exact: true }).click();
  const card = page.getByTestId("chord-card").nth(1);
  const heading = card.getByRole("heading", { name: "Cmaj7", level: 3, exact: true });
  const trigger = heading.getByRole("button", { name: "Play chord: Cmaj7", exact: true });
  const pianoKeys = '[data-testid="piano-keyboard"] [data-midi][data-note-interval]';
  const expected = await displayedMidi(card, pianoKeys);

  await card.getByRole("button", { name: "Lock chord card" }).click();
  expect(await playedNotes(page)).toHaveLength(0);
  // Click the top-left of the header, outside the chord-name chip and the lock.
  const header = heading.locator("..");
  await header.click({ position: { x: 8, y: 8 } });
  await expect.poll(async () => (await playedNotes(page)).length).toBe(expected.length);
  await header.dblclick({ position: { x: 8, y: 8 } });
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");

  await expect.poll(async () => (await playedNotes(page)).length).toBe(5 * expected.length);
  const notes = await playedNotes(page);
  for (let n = 0; n < 5; n++) {
    const chord = notes.slice(n * expected.length, (n + 1) * expected.length);
    expect(ascending(chord.map((note) => note.midi))).toEqual(expected);
    expect(chord.every((note) => note.wave === "triangle")).toBe(true);
  }
  expect(notes.slice(expected.length, 2 * expected.length).every((note) => note.interrupted)).toBe(true);
  await expect(card).toHaveAttribute("data-playing", "true");
  await expect(page.getByRole("button", { name: "Play progression" })).toBeEnabled();
  await expect(card.getByRole("button", { name: "Unlock chord card" })).toBeVisible();
  await expect(card).not.toHaveAttribute("data-playing", "true");

  await card.getByRole("button", { name: "Raise chord octave: Cmaj7" }).click();
  await trigger.click();
  const raised = expected.map((midi) => midi + 12);
  expect(await displayedMidi(card, pianoKeys)).toEqual(raised);
  await expect.poll(async () => ascending((await playedNotes(page)).slice(notes.length).map((note) => note.midi)))
    .toEqual(raised);
});

test("auditions the selected guitar and ukulele shapes and leaves rests silent", async ({ page }) => {
  await composeProgression(page, ["C", "F#maj9"]);
  const cards = page.getByTestId("chord-card");
  const card = cards.first();
  const trigger = card.getByRole("button", { name: "Play chord: C", exact: true });
  const openC = [48, 52, 55, 60, 64];
  const barreC = [48, 55, 60, 64, 67];
  await trigger.click();
  await expect.poll(async () => (await playedNotes(page)).map((note) => note.midi)).toEqual(openC);
  await card.getByRole("button", { name: "Next guitar variant" }).click();
  await trigger.click();
  await expect.poll(async () => (await playedNotes(page)).slice(openC.length).map((note) => note.midi))
    .toEqual(barreC);

  await page.getByRole("button", { name: "Ukulele", exact: true }).click();
  const expectedUke = await displayedMidi(card, '[data-testid="ukulele-chord-diagram"] [data-midi]');
  const rest = cards.nth(1);
  await expect(rest.getByRole("heading", { name: "F#maj9", exact: true })).toBeVisible();
  await expect(rest.getByRole("button", { name: "Play chord: F#maj9" })).toHaveCount(0);
  await rest.getByRole("heading", { name: "F#maj9", exact: true }).click();
  await trigger.click();
  const guitarNoteCount = openC.length + barreC.length;
  await expect.poll(async () => ascending((await playedNotes(page)).slice(guitarNoteCount).map((note) => note.midi)))
    .toEqual(expectedUke);
  expect((await playedNotes(page)).every((note) => note.wave === "sawtooth")).toBe(true);
});

test("interrupts the previous audio in both directions between card and progression", async ({ page }) => {
  await composeProgression(page, ["C", "G"]);
  await page.getByRole("button", { name: "Piano", exact: true }).click();
  const cards = page.getByTestId("chord-card");
  const pianoKeys = '[data-testid="piano-keyboard"] [data-midi][data-note-interval]';
  const first = await displayedMidi(cards.first(), pianoKeys);
  const second = await displayedMidi(cards.nth(1), pianoKeys);
  const progressionLength = first.length + second.length;
  const play = page.getByRole("button", { name: "Play progression", exact: true });

  await play.click();
  await expect(cards.first()).toHaveAttribute("data-playing", "true");
  await cards.nth(1).getByRole("button", { name: "Play chord: G", exact: true }).click();
  await expect(cards.nth(1)).toHaveAttribute("data-playing", "true");
  await expect(play).toBeEnabled();
  const throughAudition = await playedNotes(page);
  expect(throughAudition).toHaveLength(progressionLength + second.length);
  expect(throughAudition.slice(0, progressionLength).every((note) => note.interrupted)).toBe(true);
  expect(ascending(throughAudition.slice(progressionLength).map((note) => note.midi))).toEqual(second);

  await play.click();
  await expect(cards.first()).toHaveAttribute("data-playing", "true");
  const restarted = await playedNotes(page);
  expect(restarted).toHaveLength(throughAudition.length + progressionLength);
  expect(restarted.slice(progressionLength, throughAudition.length).every((note) => note.interrupted)).toBe(true);
  await page.getByRole("button", { name: "Stop playback", exact: true }).click();
  await expect(page.locator('[data-playing="true"]')).toHaveCount(0);
});

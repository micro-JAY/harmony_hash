/**
 * Live ElevenLabs smoke through the shipped browser integration.
 *
 * Requires the full Worker app to be running (normally `npx wrangler dev`).
 * Chromium receives a silent synthetic media device so CI/headless runs do not
 * depend on macOS microphone entitlement, while the signed URL, WebSocket,
 * ElevenLabs agent, registered client tool, React bridge, and visible timeline
 * are all real.
 */
import { chromium } from "playwright";

const appUrl = process.env.HH_VOICE_APP_URL ?? "http://127.0.0.1:8787";
const replacement = ["Fmaj7", "Gm7", "C7", "Fmaj7"];
const helpLabel = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

async function main(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  try {
    const context = await browser.newContext();
    await context.grantPermissions(["microphone"], { origin: new URL(appUrl).origin });
    const page = await context.newPage();

    // Capture the real SDK socket so the smoke can send a text turn after the
    // voice session connects. The browser still establishes a media session;
    // only the user utterance is deterministic text instead of ambient audio.
    await page.addInitScript(`(() => {
      const NativeWebSocket = window.WebSocket;
      const sockets = [];
      const events = [];
      Object.defineProperty(window, "__hhSmokeSockets", { value: sockets });
      Object.defineProperty(window, "__hhSmokeEvents", { value: events });
      class CapturingWebSocket extends NativeWebSocket {
        constructor(...args) {
          super(...args);
          sockets.push(this);
          this.addEventListener("message", (event) => {
            if (typeof event.data !== "string") return;
            try {
              const payload = JSON.parse(event.data);
              events.push({
                type: payload.type ?? "unknown",
                audioLength: payload.audio_event?.audio_base_64?.length ?? 0,
              });
            } catch {
              events.push({ type: "non-json", audioLength: 0 });
            }
          });
        }
      }
      Object.defineProperty(window, "WebSocket", { value: CapturingWebSocket });
    })()`);

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const onboardingClose = page.getByRole("button", { name: "Close Harmony Hash introduction" });
    if (await onboardingClose.isVisible().catch(() => false)) await onboardingClose.click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("Help me finish and understand this progression");
    await page.getByRole("button", { name: helpLabel }).click();
    const dialog = page.getByRole("dialog", { name: "Hanz Hasher" });
    await page.getByRole("button", { name: "Hanz, Help!" }).click();
    await page.getByText("Listening", { exact: true }).waitFor({ timeout: 20_000 });
    if ((await dialog.getAttribute("data-session-kind")) !== "voice") {
      throw new Error("ElevenLabs created a text-only conversation instead of a voice conversation");
    }
    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await page.getByRole("button", { name: helpLabel }).click();

    await page.evaluate((chords) => {
      const sockets = Reflect.get(window, "__hhSmokeSockets");
      if (!Array.isArray(sockets)) throw new Error("ElevenLabs socket was not captured");
      const socket = sockets.find(
        (candidate): candidate is WebSocket =>
          candidate instanceof WebSocket && candidate.readyState === WebSocket.OPEN,
      );
      if (!socket) throw new Error("ElevenLabs socket is not open");
      socket.send(JSON.stringify({
        type: "user_message",
        text: `Use the replace_progression client tool now. Replace the timeline with exactly these four chords: ${chords.join(", ")}. Do not only describe the change.`,
      }));
    }, replacement);

    for (const chord of new Set(replacement)) {
      await page.getByRole("heading", { name: chord }).first().waitFor({ timeout: 30_000 });
    }
    try {
      await page.waitForFunction(() => {
        const panel = document.querySelector('[role="dialog"][aria-labelledby="hanz-hasher-title"]');
        return Number(panel?.getAttribute("data-audio-packets") ?? 0) > 0;
      }, undefined, { timeout: 30_000 });
    } catch {
      const eventInventory = await page.evaluate(() => Reflect.get(window, "__hhSmokeEvents"));
      throw new Error(`Hanz produced no output audio. Socket events: ${JSON.stringify(eventInventory)}`);
    }
    const rendered = await page.getByRole("heading", { level: 3 }).allTextContents();
    if (JSON.stringify(rendered) !== JSON.stringify(replacement)) {
      throw new Error(`Client tool rendered ${rendered.join(", ")} instead of ${replacement.join(", ")}`);
    }

    await page.getByRole("button", { name: "End conversation" }).click();
    await page.getByText("Offline", { exact: true }).waitFor({ timeout: 10_000 });

    console.log(JSON.stringify({
      connected: true,
      sessionKind: "voice",
      audioPackets: Number(await dialog.getAttribute("data-audio-packets")),
      clientToolMutation: rendered,
      disconnected: true,
    }));
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

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
      Object.defineProperty(window, "__hhSmokeSockets", { value: sockets });
      class CapturingWebSocket extends NativeWebSocket {
        constructor(...args) {
          super(...args);
          sockets.push(this);
        }
      }
      Object.defineProperty(window, "WebSocket", { value: CapturingWebSocket });
    })()`);

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const freeInput = page.getByRole("textbox", { name: /Cmaj7 Dm7 G7 C/ });
    await freeInput.fill("Cmaj7 Am7 Dm7 G7");
    await freeInput.press("Enter");
    await page.getByRole("heading", { name: "Cmaj7" }).waitFor();

    await page.getByRole("button", { name: /Talk to the companion/i }).click();
    await page.getByText("Listening", { exact: true }).waitFor({ timeout: 20_000 });

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
    const rendered = await page.getByRole("heading", { level: 3 }).allTextContents();
    if (JSON.stringify(rendered) !== JSON.stringify(replacement)) {
      throw new Error(`Client tool rendered ${rendered.join(", ")} instead of ${replacement.join(", ")}`);
    }

    await page.getByRole("button", { name: "End conversation" }).click();
    await page.getByText("Offline", { exact: true }).waitFor({ timeout: 10_000 });

    console.log(JSON.stringify({
      connected: true,
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

import { expect, test, type Page } from "@playwright/test";
import {
  emitRealtimeEvent,
  installRealtimeVoiceMock,
  realtimeVoiceMockState,
  resolveMockMicrophone,
} from "./helpers/realtimeVoice";

const HELP_LABEL = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

async function openHanz(page: Page): Promise<void> {
  await page
    .getByRole("textbox", { name: "Describe the progression you want" })
    .fill("I need another perspective");
  await page.getByRole("button", { name: HELP_LABEL }).click();
  await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toBeVisible();
}

async function connectHanz(page: Page): Promise<void> {
  await openHanz(page);
  await page.getByRole("button", { name: "Hanz, Help!" }).click();
  await expect(page.getByText("Listening", { exact: true })).toBeVisible();
}

test.describe("Hanz Hasher voice sessions", () => {
  test("loads the voice runtime on help intent and reuses it after closing", async ({
    page,
  }) => {
    const voiceRuntimeRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/assets\/VoiceAgentRuntime-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
        voiceRuntimeRequests.push(request.url());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(voiceRuntimeRequests).toHaveLength(0);

    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("preload Hanz when I show intent");
    const help = page.getByRole("button", { name: HELP_LABEL });
    await help.focus();
    await expect.poll(() => voiceRuntimeRequests.length).toBe(1);
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);

    await help.click();
    const dialog = page.getByRole("dialog", { name: "Hanz Hasher" });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await expect(dialog).toHaveCount(0);

    await help.click();
    await expect(dialog).toBeVisible();
    expect(voiceRuntimeRequests).toHaveLength(1);
  });

  test("contains a voice-runtime payload failure and offers a clean reload", async ({
    page,
  }) => {
    await page.route("**/assets/VoiceAgentRuntime-*.js", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("recover Hanz without losing the HASHER");
    await page.getByRole("button", { name: HELP_LABEL }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Voice tools couldn’t load. Reload Harmony Hash to try again.",
    );
    await expect(page.getByText("HARMONY HASH", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload Harmony Hash" })).toBeVisible();
  });

  test("surfaces a client-secret failure without requesting the microphone", async ({ page }) => {
    const mock = await installRealtimeVoiceMock(page, {
      clientSecretStatus: 502,
      clientSecretError: "Could not start a voice session",
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await openHanz(page);
    expect(mock.clientSecretRequests).toBe(0);
    expect((await realtimeVoiceMockState(page)).micRequests).toBe(0);

    await page.getByRole("button", { name: "Hanz, Help!" }).click();

    await expect(page.getByRole("alert")).toHaveText("Could not start a voice session");
    await expect(page.getByRole("button", { name: "Hanz, Help!" })).toBeEnabled();
    await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
    expect(mock.clientSecretRequests).toBe(1);
    expect(mock.clientSecretBodies).toEqual([null]);
    expect(mock.realtimeCallRequests).toBe(0);
    expect((await realtimeVoiceMockState(page)).micRequests).toBe(0);

    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await page.getByRole("button", { name: HELP_LABEL }).click();
    await expect(page.getByRole("alert")).toHaveText("Could not start a voice session");
    expect(mock.clientSecretRequests).toBe(1);
  });

  test("does not request a secret or microphone on mount and restores focus on Escape", async ({
    page,
  }) => {
    const mock = await installRealtimeVoiceMock(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);

    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("help me choose the next chord");
    const help = page.getByRole("button", { name: HELP_LABEL });
    await help.click();
    await expect(page.getByRole("button", { name: "Close Hanz Hasher" })).toBeFocused();
    expect(mock.clientSecretRequests).toBe(0);
    expect((await realtimeVoiceMockState(page)).micRequests).toBe(0);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(mock.clientSecretRequests).toBe(0);
  });

  test("aborts a pre-mint start when the popup closes", async ({ page }) => {
    const mock = await installRealtimeVoiceMock(page, { holdClientSecret: true });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await openHanz(page);
    const help = page.getByRole("button", { name: HELP_LABEL });
    await page.getByRole("button", { name: "Hanz, Help!" }).click();
    await expect.poll(() => mock.clientSecretRequests).toBe(1);

    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    mock.releaseClientSecret();
    await expect(page.getByRole("dialog", { name: "Hanz Hasher" })).toHaveCount(0);
    await expect(help).toBeFocused();
    await expect.poll(async () => (await realtimeVoiceMockState(page)).micRequests).toBe(0);
  });

  test("stops media acquired after a post-mint close", async ({ page }) => {
    await installRealtimeVoiceMock(page, { holdMicrophone: true });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await openHanz(page);
    await page.getByRole("button", { name: "Hanz, Help!" }).click();
    await expect.poll(async () => (await realtimeVoiceMockState(page)).micRequests).toBe(1);

    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    await resolveMockMicrophone(page);
    await expect.poll(async () => (await realtimeVoiceMockState(page)).micTrackStops).toBe(1);
    expect((await realtimeVoiceMockState(page)).peerConnections).toBe(0);
  });

  test("cleans partial media and peer state when SDP exchange fails", async ({ page }) => {
    await installRealtimeVoiceMock(page, { realtimeCallStatus: 502 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await openHanz(page);
    await page.getByRole("button", { name: "Hanz, Help!" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "The voice service could not start this session. Please try again.",
    );
    await expect.poll(async () => (await realtimeVoiceMockState(page)).micTrackStops).toBe(1);
    const state = await realtimeVoiceMockState(page);
    expect(state.peerCloses).toBe(1);
    expect(state.channelCloses).toBe(1);
    expect(state.audioPauses).toBe(1);
  });

  test("keeps one live Realtime session and transcript across close and reopen", async ({ page }) => {
    const mock = await installRealtimeVoiceMock(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await connectHanz(page);
    const dialog = page.getByRole("dialog", { name: "Hanz Hasher" });

    await emitRealtimeEvent(page, {
      type: "conversation.item.added",
      event_id: "evt-user-order",
      previous_item_id: null,
      item: { id: "item-user", role: "user" },
    });
    await emitRealtimeEvent(page, {
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "evt-user-transcript",
      item_id: "item-user",
      transcript: "Try a brighter ending.",
    });
    await emitRealtimeEvent(page, {
      type: "conversation.item.added",
      event_id: "evt-agent-order",
      previous_item_id: "item-user",
      item: { id: "item-agent", role: "assistant" },
    });
    await emitRealtimeEvent(page, {
      type: "response.output_audio_transcript.done",
      event_id: "evt-agent-transcript",
      response_id: "response-agent",
      item_id: "item-agent",
      transcript: "Let's resolve it with C major.",
    });
    await expect(dialog.getByText("Try a brighter ending.")).toBeVisible();
    await expect(dialog.getByText("Let's resolve it with C major.")).toBeVisible();
    await expect.poll(async () => (await realtimeVoiceMockState(page)).micRequests).toBe(1);
    expect(mock.clientSecretRequests).toBe(1);
    expect(mock.clientSecretBodies).toEqual([null]);
    expect(mock.realtimeCallRequests).toBe(1);
    expect(mock.sawRealtimeAuthorization).toBe(true);

    await page.getByRole("button", { name: "Close Hanz Hasher" }).click();
    expect((await realtimeVoiceMockState(page)).peerCloses).toBe(0);
    await page.getByRole("button", { name: HELP_LABEL }).click();
    await expect(page.getByText("Listening", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Try a brighter ending.")).toBeVisible();
    await expect(dialog.getByText("Let's resolve it with C major.")).toBeVisible();
    expect(mock.clientSecretRequests).toBe(1);

    await page.getByRole("button", { name: "End conversation" }).click();
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
    const stopped = await realtimeVoiceMockState(page);
    expect(stopped.micTrackStops).toBe(1);
    expect(stopped.peerCloses).toBe(1);
    expect(stopped.channelCloses).toBe(1);
    expect(stopped.audioPauses).toBe(1);
  });

  test("executes a completed Realtime tool call against the visible timeline", async ({ page }) => {
    await installRealtimeVoiceMock(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await connectHanz(page);

    const replacement = ["Fmaj7", "Gm7", "C7", "Fmaj7"];
    await emitRealtimeEvent(page, {
      type: "response.done",
      event_id: "evt-tool-response",
      response: {
        id: "response-tool",
        status: "completed",
        output: [{
          type: "function_call",
          status: "completed",
          call_id: "call-replace",
          name: "replace_progression",
          arguments: JSON.stringify({ chords: replacement }),
        }],
      },
    });

    for (const chord of new Set(replacement)) {
      await expect(page.getByRole("heading", { name: chord }).first()).toBeVisible();
    }
    const rendered = await page.getByRole("heading", { level: 3 }).allTextContents();
    expect(rendered).toEqual(replacement);
    await expect.poll(async () => {
      const events = (await realtimeVoiceMockState(page)).sentEvents;
      return events.filter(({ type }) => type === "conversation.item.create").length;
    }).toBe(1);
    const events = (await realtimeVoiceMockState(page)).sentEvents;
    expect(events.some(({ type }) => type === "response.create")).toBe(true);
  });

  test("cleans up the live session on pagehide without Strict Mode duplication", async ({ page }) => {
    const mock = await installRealtimeVoiceMock(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await connectHanz(page);
    expect(mock.clientSecretRequests).toBe(1);
    expect((await realtimeVoiceMockState(page)).peerConnections).toBe(1);

    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(page.getByText("Offline", { exact: true })).toBeVisible();
    const state = await realtimeVoiceMockState(page);
    expect(state.micTrackStops).toBe(1);
    expect(state.peerCloses).toBe(1);
    expect(mock.clientSecretRequests).toBe(1);
  });

  test("keeps the popup reachable in a short landscape viewport", async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await openHanz(page);
    await expect(page.getByRole("button", { name: "Hanz, Help!" })).toBeVisible();

    const bounds = await page.getByRole("dialog", { name: "Hanz Hasher" }).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        top: rect.top,
        bottom: rect.bottom,
        maxHeight: style.maxHeight,
        overflowY: style.overflowY,
      };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(375);
    expect(bounds.maxHeight).not.toBe("none");
    expect(bounds.overflowY).toBe("auto");
    await expect(page.getByRole("button", { name: "Close Hanz Hasher" })).toBeFocused();
  });
});

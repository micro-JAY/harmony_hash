/**
 * Live OpenAI Realtime smoke through the shipped browser integration.
 *
 * Requires the full Worker app to be running (normally `npm run dev:worker`).
 * Chromium receives a silent synthetic media device so CI/headless runs do not
 * capture ambient audio. The Worker client-secret route, browser WebRTC/SDP
 * exchange, OpenAI Realtime session, client tool, React bridge, remote audio,
 * and visible timeline are all real.
 */
import { chromium, type Page } from "playwright";

const appUrl = process.env.HH_VOICE_APP_URL ?? "http://127.0.0.1:8787";
const clientSecretUrl = new URL("/api/voice/client-secret", appUrl).href;
const realtimeCallsUrl = "https://api.openai.com/v1/realtime/calls";
const replacement = ["Fmaj7", "Gm7", "C7", "Fmaj7"];
const helpLabel = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

interface TransportSnapshot {
  peerCount: number;
  channelCount: number;
  openChannelIds: number[];
  peerStates: string[];
  channelStates: string[];
  senderTrackStates: string[];
  responseDoneCount: number;
  audioTranscriptDoneCount: number;
}

async function transportSnapshot(page: Page): Promise<TransportSnapshot> {
  return page.evaluate(() => {
    const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
      peers: Array<{ id: number; value: RTCPeerConnection }>;
      channels: Array<{ id: number; value: RTCDataChannel }>;
      eventTypeCounts: Record<string, number>;
    } | undefined;
    if (!smoke) throw new Error("Realtime transport capture was not installed");

    return {
      peerCount: smoke.peers.length,
      channelCount: smoke.channels.length,
      openChannelIds: smoke.channels
        .filter(({ value }) => value.readyState === "open")
        .map(({ id }) => id),
      peerStates: smoke.peers.map(({ value }) => value.connectionState),
      channelStates: smoke.channels.map(({ value }) => value.readyState),
      senderTrackStates: smoke.peers.flatMap(({ value }) =>
        value.getSenders().flatMap(({ track }) => track ? [track.readyState] : []),
      ),
      responseDoneCount: smoke.eventTypeCounts["response.done"] ?? 0,
      audioTranscriptDoneCount:
        smoke.eventTypeCounts["response.output_audio_transcript.done"] ?? 0,
    };
  });
}

async function sendDeterministicToolTurn(page: Page, channelId: number): Promise<void> {
  await page.evaluate(({ chords, expectedChannelId }) => {
    const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
      channels: Array<{ id: number; value: RTCDataChannel }>;
    } | undefined;
    const channel = smoke?.channels.find(({ id }) => id === expectedChannelId)?.value;
    if (!channel || channel.readyState !== "open") {
      throw new Error("Captured Realtime data channel is not open");
    }

    const chordList = chords.join(", ");
    channel.send(JSON.stringify({
      type: "conversation.item.create",
      event_id: "hh_smoke_user_turn",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: `Replace the timeline with exactly these four chords, in this order: ${chordList}.`,
        }],
      },
    }));
    channel.send(JSON.stringify({
      type: "response.create",
      event_id: "hh_smoke_replace_progression",
      response: {
        output_modalities: ["audio"],
        instructions:
          `Call replace_progression exactly once with exactly these chords in order: ${chordList}. `
          + "Do not call any other tool and do not answer without calling it.",
        tool_choice: { type: "function", name: "replace_progression" },
      },
    }));
  }, { chords: replacement, expectedChannelId: channelId });
}

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
    let clientSecretRequests = 0;
    let realtimeCallRequests = 0;
    let realtimeCallStatus: number | null = null;
    let realtimeCallFailure: string | null = null;

    page.on("request", (request) => {
      if (request.method() !== "POST") return;
      if (request.url() === clientSecretUrl) clientSecretRequests += 1;
      if (request.url() === realtimeCallsUrl) realtimeCallRequests += 1;
    });
    page.on("response", (response) => {
      if (response.request().method() === "POST" && response.url() === realtimeCallsUrl) {
        realtimeCallStatus = response.status();
      }
    });
    page.on("requestfailed", (request) => {
      if (request.method() === "POST" && request.url() === realtimeCallsUrl) {
        realtimeCallFailure = request.failure()?.errorText.slice(0, 120) ?? "network failure";
      }
    });

    // Capture transport identities and safe event-type counts only. Provider
    // payloads, authorization headers, credentials, and SDP are never retained.
    await page.addInitScript(() => {
      const NativeRTCPeerConnection = window.RTCPeerConnection;
      const state = {
        nextPeerId: 1,
        nextChannelId: 1,
        peers: [] as Array<{ id: number; value: RTCPeerConnection }>,
        channels: [] as Array<{ id: number; value: RTCDataChannel }>,
        eventTypeCounts: Object.create(null) as Record<string, number>,
        transportFailure: null as { stage: string; name: string } | null,
      };

      const CapturingRTCPeerConnection = new Proxy(NativeRTCPeerConnection, {
        construct(target, args) {
          const peer = Reflect.construct(target, args) as RTCPeerConnection;
          const peerId = state.nextPeerId++;
          state.peers.push({ id: peerId, value: peer });
          const nativeCreateDataChannel = peer.createDataChannel.bind(peer);
          const nativeCreateOffer = peer.createOffer.bind(peer);
          const nativeSetLocalDescription = peer.setLocalDescription.bind(peer);
          const nativeSetRemoteDescription = peer.setRemoteDescription.bind(peer);

          peer.createOffer = async (...offerArgs) => {
            try {
              return await nativeCreateOffer(...offerArgs);
            } catch (error) {
              state.transportFailure = {
                stage: "createOffer",
                name: error instanceof Error ? error.name : "unknown",
              };
              throw error;
            }
          };
          peer.setLocalDescription = async (...descriptionArgs) => {
            try {
              await nativeSetLocalDescription(...descriptionArgs);
            } catch (error) {
              state.transportFailure = {
                stage: "setLocalDescription",
                name: error instanceof Error ? error.name : "unknown",
              };
              throw error;
            }
          };
          peer.setRemoteDescription = async (...descriptionArgs) => {
            try {
              await nativeSetRemoteDescription(...descriptionArgs);
            } catch (error) {
              state.transportFailure = {
                stage: "setRemoteDescription",
                name: error instanceof Error ? error.name : "unknown",
              };
              throw error;
            }
          };

          peer.createDataChannel = (...channelArgs) => {
            const channel = nativeCreateDataChannel(...channelArgs);
            const channelId = state.nextChannelId++;
            state.channels.push({ id: channelId, value: channel });
            channel.addEventListener("message", (event) => {
              if (typeof event.data !== "string") return;
              try {
                const payload = JSON.parse(event.data) as { type?: unknown };
                if (typeof payload.type === "string") {
                  state.eventTypeCounts[payload.type] =
                    (state.eventTypeCounts[payload.type] ?? 0) + 1;
                }
              } catch {
                // The shipped runtime owns validation and reporting.
              }
            });
            return channel;
          };
          return peer;
        },
      });

      Object.defineProperty(window, "__hhRealtimeSmoke", { value: state });
      Object.defineProperty(window, "RTCPeerConnection", {
        configurable: true,
        value: CapturingRTCPeerConnection,
      });
    });

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const onboardingClose = page.getByRole("button", { name: "Close Harmony Hash introduction" });
    if (await onboardingClose.isVisible().catch(() => false)) await onboardingClose.click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("Help me finish and understand this progression");
    await page.getByRole("button", { name: helpLabel }).click();
    let dialog = page.getByRole("dialog", { name: "Harmony" });
    await page.getByRole("button", { name: "Harmony, Help!" }).click();
    const listening = page.getByText("Listening", { exact: true });
    const alert = page.getByRole("alert");
    await Promise.any([
      listening.waitFor({ timeout: 20_000 }),
      alert.waitFor({ timeout: 20_000 }),
    ]);
    if (!await listening.isVisible()) {
      const message = (await alert.textContent())?.trim() || "unknown browser error";
      const capturedFailure = await page.evaluate(() => {
        const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
          transportFailure: { stage: string; name: string } | null;
        } | undefined;
        return smoke?.transportFailure ?? null;
      });
      const transport = realtimeCallStatus === null
        ? (capturedFailure
            ? `${capturedFailure.stage}/${capturedFailure.name}`
            : (realtimeCallFailure ?? "no SDP response"))
        : `HTTP ${realtimeCallStatus}`;
      throw new Error(`Harmony Realtime start failed (${transport}): ${message}`);
    }
    if ((await dialog.getAttribute("data-session-kind")) !== "voice") {
      throw new Error("OpenAI Realtime created a non-voice conversation");
    }
    if (clientSecretRequests !== 1 || realtimeCallRequests !== 1) {
      throw new Error("Harmony did not establish exactly one Worker-minted OpenAI Realtime session");
    }

    await page.waitForFunction(() => {
      const panel = document.querySelector('[role="dialog"][aria-labelledby="hanz-hasher-title"]');
      const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
        eventTypeCounts: Record<string, number>;
      } | undefined;
      return Number(panel?.getAttribute("data-audio-packets") ?? 0) > 0
        && (smoke?.eventTypeCounts["response.done"] ?? 0) > 0;
    }, undefined, { timeout: 30_000 });

    const beforeClose = await transportSnapshot(page);
    if (
      beforeClose.peerCount !== 1
      || beforeClose.channelCount !== 1
      || beforeClose.openChannelIds.length !== 1
    ) {
      throw new Error("Harmony did not keep exactly one open Realtime transport");
    }
    const activeChannelId = beforeClose.openChannelIds[0];
    const audioPacketsBeforeTurn = Number(await dialog.getAttribute("data-audio-packets"));

    await page.getByRole("button", { name: "Close Harmony" }).click();
    await dialog.waitFor({ state: "detached", timeout: 10_000 });
    const whileClosed = await transportSnapshot(page);
    if (
      whileClosed.peerCount !== 1
      || whileClosed.openChannelIds.length !== 1
      || whileClosed.openChannelIds[0] !== activeChannelId
    ) {
      throw new Error("Closing Harmony did not preserve the active Realtime session");
    }

    await page.getByRole("button", { name: helpLabel }).click();
    dialog = page.getByRole("dialog", { name: "Harmony" });
    await page.getByText("Listening", { exact: true }).waitFor({ timeout: 10_000 });
    const afterReopen = await transportSnapshot(page);
    if (
      (await dialog.getAttribute("data-session-kind")) !== "voice"
      || afterReopen.peerCount !== 1
      || afterReopen.openChannelIds.length !== 1
      || afterReopen.openChannelIds[0] !== activeChannelId
      || clientSecretRequests !== 1
      || realtimeCallRequests !== 1
    ) {
      throw new Error("Reopening Harmony did not resume the same Realtime session");
    }

    await sendDeterministicToolTurn(page, activeChannelId);
    await page.waitForFunction((expected) => {
      const rendered = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="chord-card"] h3'),
        (heading) => heading.textContent?.trim() ?? "",
      );
      return JSON.stringify(rendered) === JSON.stringify(expected);
    }, replacement, { timeout: 30_000 });

    const rendered = await page.getByTestId("chord-card").locator("h3").allTextContents();
    const postToolAudioBaseline = beforeClose.audioTranscriptDoneCount;
    await page.waitForFunction(({ packetBaseline, transcriptBaseline }) => {
      const panel = document.querySelector('[role="dialog"][aria-labelledby="hanz-hasher-title"]');
      const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
        eventTypeCounts: Record<string, number>;
      } | undefined;
      return Number(panel?.getAttribute("data-audio-packets") ?? 0) > packetBaseline
        && (smoke?.eventTypeCounts["response.output_audio_transcript.done"] ?? 0)
          > transcriptBaseline;
    }, {
      packetBaseline: audioPacketsBeforeTurn,
      transcriptBaseline: postToolAudioBaseline,
    }, { timeout: 30_000 });

    const audioPackets = Number(await dialog.getAttribute("data-audio-packets"));
    await page.getByRole("button", { name: "End conversation" }).click();
    await page.getByText("Offline", { exact: true }).waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => {
      const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
        peers: Array<{ value: RTCPeerConnection }>;
        channels: Array<{ value: RTCDataChannel }>;
      } | undefined;
      if (!smoke) return false;
      return smoke.peers.every(({ value }) => value.connectionState === "closed")
        && smoke.channels.every(({ value }) => value.readyState === "closed")
        && smoke.peers.every(({ value }) =>
          value.getSenders().every(({ track }) => !track || track.readyState === "ended"),
        );
    }, undefined, { timeout: 10_000 });

    const disconnected = await transportSnapshot(page);
    if ((await dialog.getAttribute("data-session-kind")) !== "none") {
      throw new Error("Harmony remained attached to a voice session after disconnect");
    }

    console.log(JSON.stringify({
      connected: true,
      sessionKind: "voice",
      workerClientSecretRequests: clientSecretRequests,
      realtimeCallRequests,
      remoteAudioPackets: audioPackets,
      clientToolMutation: rendered,
      closeReopenContinuity: true,
      peerStatesAfterDisconnect: disconnected.peerStates,
      channelStatesAfterDisconnect: disconnected.channelStates,
      microphoneTrackStatesAfterDisconnect: disconnected.senderTrackStates,
      disconnected: true,
    }));
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Live voice smoke failed");
  process.exitCode = 1;
});

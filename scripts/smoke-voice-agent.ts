/**
 * Live OpenAI Realtime smoke through the shipped browser integration.
 *
 * Requires the full Worker app to be running (normally `npm run dev:worker`).
 * Chromium receives a silent synthetic media device so CI/headless runs do not
 * capture ambient audio. The Worker client-secret route, browser WebRTC/SDP
 * exchange, OpenAI Realtime session, client tool, React bridge, remote audio,
 * and visible timeline are all real.
 * Set HH_VOICE_INPUT_MODE=type to exercise the actual Type composer instead.
 * HH_VOICE_APP_URL selects the UI; optional HH_VOICE_API_URL selects the API
 * origin to count when a development setup already routes requests separately.
 */
import { chromium, type Page } from "playwright";

const appUrl = process.env.HH_VOICE_APP_URL ?? "http://127.0.0.1:8787";
const apiUrl = process.env.HH_VOICE_API_URL ?? appUrl;
const clientSecretUrl = new URL("/api/voice/client-secret", apiUrl).href;
const inputMode = process.env.HH_VOICE_INPUT_MODE ?? "voice";
const realtimeCallsUrl = "https://api.openai.com/v1/realtime/calls";
const replacement = ["Fmaj7", "Gm7", "C7", "Fmaj7"];
const typedPrompt = `Replace the timeline with exactly these four chords, in this order: ${replacement.join(", ")}. `
  + "Use replace_progression, then briefly tell me that you finished.";
const helpLabel = /Need help\?|Stuck\?|Writer's block got you down\?|Phone a friend/;

interface TransportSnapshot {
  peerCount: number;
  channelCount: number;
  openChannelIds: number[];
  peerStates: string[];
  channelStates: string[];
  senderTrackStates: string[];
  microphoneRequests: number;
  typedAcknowledgements: number;
  responseDoneCount: number;
  audioTranscriptDoneCount: number;
}

async function transportSnapshot(page: Page): Promise<TransportSnapshot> {
  return page.evaluate(() => {
    const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
      peers: Array<{ id: number; value: RTCPeerConnection }>;
      channels: Array<{ id: number; value: RTCDataChannel }>;
      eventTypeCounts: Record<string, number>;
      microphoneRequests: number;
      typedAcknowledgements: number;
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
      microphoneRequests: smoke.microphoneRequests,
      typedAcknowledgements: smoke.typedAcknowledgements,
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
  if (inputMode !== "voice" && inputMode !== "type") {
    throw new Error("HH_VOICE_INPUT_MODE must be voice or type");
  }
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
    if (inputMode === "voice") {
      await context.grantPermissions(["microphone"], { origin: new URL(appUrl).origin });
    }
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

    // Capture transport identities and safe event/acknowledgement counts only. Provider
    // payloads, authorization headers, credentials, and SDP are never retained.
    await page.addInitScript(({ expectedTypedPrompt }) => {
      const NativeRTCPeerConnection = window.RTCPeerConnection;
      const state = {
        nextPeerId: 1,
        nextChannelId: 1,
        peers: [] as Array<{ id: number; value: RTCPeerConnection }>,
        channels: [] as Array<{ id: number; value: RTCDataChannel }>,
        eventTypeCounts: Object.create(null) as Record<string, number>,
        microphoneRequests: 0,
        typedAcknowledgements: 0,
        transportFailure: null as { stage: string; name: string } | null,
      };
      const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (...mediaArgs) => {
        state.microphoneRequests += 1;
        return nativeGetUserMedia(...mediaArgs);
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

          // Proxies preserve the native promise/callback overloads while
          // retaining safe stage/name diagnostics when negotiation fails.
          peer.createOffer = new Proxy(nativeCreateOffer, {
            async apply(target, receiver, args) {
              try {
                return await Reflect.apply(target, receiver, args);
              } catch (error) {
                state.transportFailure = {
                  stage: "createOffer",
                  name: error instanceof Error ? error.name : "unknown",
                };
                throw error;
              }
            },
          });
          peer.setLocalDescription = new Proxy(nativeSetLocalDescription, {
            async apply(target, receiver, args) {
              try {
                await Reflect.apply(target, receiver, args);
              } catch (error) {
                state.transportFailure = {
                  stage: "setLocalDescription",
                  name: error instanceof Error ? error.name : "unknown",
                };
                throw error;
              }
            },
          });
          peer.setRemoteDescription = new Proxy(nativeSetRemoteDescription, {
            async apply(target, receiver, args) {
              try {
                await Reflect.apply(target, receiver, args);
              } catch (error) {
                state.transportFailure = {
                  stage: "setRemoteDescription",
                  name: error instanceof Error ? error.name : "unknown",
                };
                throw error;
              }
            },
          });

          peer.createDataChannel = (...channelArgs) => {
            const channel = nativeCreateDataChannel(...channelArgs);
            const channelId = state.nextChannelId++;
            state.channels.push({ id: channelId, value: channel });
            channel.addEventListener("message", (event) => {
              if (typeof event.data !== "string") return;
              try {
                const payload = JSON.parse(event.data) as { type?: unknown; item?: unknown };
                if (typeof payload.type === "string") {
                  state.eventTypeCounts[payload.type] =
                    (state.eventTypeCounts[payload.type] ?? 0) + 1;
                }
                if (
                  payload.type === "conversation.item.added"
                  && typeof payload.item === "object"
                  && payload.item !== null
                  && "role" in payload.item && payload.item.role === "user"
                  && "content" in payload.item && Array.isArray(payload.item.content)
                  && payload.item.content.some((content: unknown) =>
                    typeof content === "object" && content !== null
                    && "type" in content && content.type === "input_text"
                    && "text" in content && content.text === expectedTypedPrompt)
                ) {
                  state.typedAcknowledgements += 1;
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
    }, { expectedTypedPrompt: typedPrompt });

    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    const onboardingClose = page.getByRole("button", { name: "Close Harmony Hash introduction" });
    if (await onboardingClose.isVisible().catch(() => false)) await onboardingClose.click();
    await page
      .getByRole("textbox", { name: "Describe the progression you want" })
      .fill("Help me finish and understand this progression");
    await page.getByRole("button", { name: helpLabel }).click();
    let dialog = page.getByRole("dialog", { name: "Harmony" });
    if (inputMode === "type") {
      await dialog.getByText("Type", { exact: true }).click();
    }
    await page.getByRole("button", { name: "Harmony, Help!" }).click();
    const connected = dialog.getByText(
      inputMode === "type" ? /^(Responding|Ready)$/ : "Listening", { exact: true },
    );
    const alert = page.getByRole("alert");
    await Promise.any([
      connected.waitFor({ timeout: 20_000 }),
      alert.waitFor({ timeout: 20_000 }),
    ]);
    if (!await connected.isVisible()) {
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
    if (inputMode === "type") {
      // Let the greeting finish playing so later audio/transcript counts can
      // only pass from the actual typed turn, not buffered greeting output.
      await dialog.getByText("Ready", { exact: true }).waitFor({ timeout: 30_000 });
    }

    const beforeClose = await transportSnapshot(page);
    if (
      beforeClose.peerCount !== 1
      || beforeClose.channelCount !== 1
      || beforeClose.openChannelIds.length !== 1
    ) {
      throw new Error("Harmony did not keep exactly one open Realtime transport");
    }
    if (inputMode === "type" && (
      beforeClose.microphoneRequests !== 0 || beforeClose.senderTrackStates.length !== 0
    )) {
      throw new Error("Type mode requested microphone input or attached a sender track");
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
    await dialog.getByText(inputMode === "type" ? "Ready" : "Listening", { exact: true })
      .waitFor({ timeout: 10_000 });
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

    if (inputMode === "type") {
      const composer = dialog.getByRole("textbox", { name: "Message Harmony" });
      await composer.fill(typedPrompt);
      await dialog.getByRole("button", { name: "Send", exact: true }).click({ timeout: 30_000 });
      await dialog.getByRole("listitem").filter({ hasText: typedPrompt }).waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => {
        const composer = document.querySelector<HTMLTextAreaElement>("#harmony-message");
        const smoke = Reflect.get(window, "__hhRealtimeSmoke") as {
          typedAcknowledgements: number;
        } | undefined;
        return smoke?.typedAcknowledgements === 1 && composer?.value === "" && !composer.readOnly;
      }, undefined, { timeout: 30_000 });
    } else {
      await sendDeterministicToolTurn(page, activeChannelId);
    }
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
    const afterTurn = await transportSnapshot(page);
    if (inputMode === "type" && (
      afterTurn.microphoneRequests !== 0 || afterTurn.senderTrackStates.length !== 0
    )) {
      throw new Error("Type mode acquired microphone input during the conversation");
    }
    if (inputMode === "type" && afterTurn.typedAcknowledgements !== 1) {
      throw new Error("Type request did not receive exactly one matching provider acknowledgement");
    }
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
    if (inputMode === "type" && (
      disconnected.microphoneRequests !== 0 || disconnected.senderTrackStates.length !== 0
    )) {
      throw new Error("Type mode did not remain microphone-free through disconnect");
    }

    console.log(JSON.stringify({
      connected: true,
      inputMode,
      sessionKind: "voice",
      microphoneRequests: disconnected.microphoneRequests,
      senderTracksWhileConnected: afterTurn.senderTrackStates.length,
      ...(inputMode === "type" ? {
        typedPromptAcknowledged: afterTurn.typedAcknowledgements === 1,
        typedDraftCleared: true,
      } : {}),
      workerClientSecretRequests: clientSecretRequests,
      realtimeCallRequests,
      remoteAudioPackets: audioPackets,
      spokenReplyTranscripts: afterTurn.audioTranscriptDoneCount - postToolAudioBaseline,
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

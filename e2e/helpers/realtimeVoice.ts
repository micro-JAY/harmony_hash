import type { Page, Route } from "@playwright/test";

export interface RealtimeVoiceMockOptions {
  autoConnect?: boolean;
  clientSecretStatus?: number;
  clientSecretError?: string;
  holdClientSecret?: boolean;
  holdMicrophone?: boolean;
  realtimeCallStatus?: number;
  failAt?: "microphone" | "peer" | "audio" | "data-channel" | "offer" | "local-description" | "remote-description" | "playback";
}

export interface RealtimeVoiceMockState {
  micRequests: number;
  micTrackStops: number;
  peerConnections: number;
  peerCloses: number;
  channelCloses: number;
  audioPauses: number;
  sentEvents: Array<Record<string, unknown>>;
}

export interface RealtimeVoiceMockController {
  readonly clientSecretRequests: number;
  readonly clientSecretBodies: Array<string | null>;
  readonly realtimeCallRequests: number;
  readonly sawRealtimeAuthorization: boolean;
  releaseClientSecret(): void;
}

interface BrowserVoiceMock {
  state: RealtimeVoiceMockState;
  emit(event: Record<string, unknown>): void;
  resolveMicrophone(): void;
}

/** Install a deterministic browser-only WebRTC transport around the real React runtime. */
export async function installRealtimeVoiceMock(
  page: Page,
  options: RealtimeVoiceMockOptions = {},
): Promise<RealtimeVoiceMockController> {
  let clientSecretRequests = 0;
  const clientSecretBodies: Array<string | null> = [];
  let realtimeCallRequests = 0;
  let sawRealtimeAuthorization = false;
  let releaseClientSecret: (() => void) | undefined;
  const clientSecretGate = options.holdClientSecret
    ? new Promise<void>((resolve) => { releaseClientSecret = resolve; })
    : Promise.resolve();

  await page.route("**/api/voice/client-secret", async (route: Route) => {
    clientSecretRequests += 1;
    clientSecretBodies.push(route.request().postData());
    await clientSecretGate;
    const status = options.clientSecretStatus ?? 200;
    const serverNow = Math.floor(Date.now() / 1_000);
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(status === 200
        ? {
            clientSecret: "ek_test_browser_ephemeral",
            expiresAt: serverNow + 60,
            serverNow,
            sessionEndsAt: serverNow + 300,
          }
        : { error: options.clientSecretError ?? "Could not start a voice session" }),
    }).catch(() => undefined);
  });

  await page.route("https://api.openai.com/v1/realtime/calls", async (route) => {
    realtimeCallRequests += 1;
    sawRealtimeAuthorization = route.request().headers().authorization?.startsWith("Bearer ")
      ?? false;
    const status = options.realtimeCallStatus ?? 200;
    await route.fulfill({
      status,
      contentType: "application/sdp",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: status === 200 ? "v=0\r\no=openai-browser-test" : "provider failure",
    });
  });

  await page.addInitScript(({ autoConnect, holdMicrophone, failAt }) => {
    type EventHandler = ((event: Event) => void) | null;
    type MessageHandler = ((event: MessageEvent<string>) => void) | null;

    const state: RealtimeVoiceMockState = {
      micRequests: 0,
      micTrackStops: 0,
      peerConnections: 0,
      peerCloses: 0,
      channelCloses: 0,
      audioPauses: 0,
      sentEvents: [],
    };

    const microphoneTrack = {
      id: "mock-microphone",
      kind: "audio",
      stop() {
        state.micTrackStops += 1;
      },
    };
    const remoteTrack = { id: "mock-remote-audio", kind: "audio", stop() {} };
    const microphoneStream = {
      getTracks: () => [microphoneTrack],
      getAudioTracks: () => [microphoneTrack],
      getVideoTracks: () => [],
    };
    const remoteStream = {
      getTracks: () => [remoteTrack],
      getAudioTracks: () => [remoteTrack],
      getVideoTracks: () => [],
    };

    let resolveMicrophone: ((stream: typeof microphoneStream) => void) | undefined;
    const microphoneGate = holdMicrophone
      ? new Promise<typeof microphoneStream>((resolve) => { resolveMicrophone = resolve; })
      : Promise.resolve(microphoneStream);

    const mediaDevices = {
      async getUserMedia() {
        state.micRequests += 1;
        if (failAt === "microphone") {
          throw new DOMException("mock microphone denied", "NotAllowedError");
        }
        return microphoneGate;
      },
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: mediaDevices,
    });

    class FakeAudio {
      autoplay = false;
      volume = 1;
      srcObject: unknown = null;

      constructor() {
        if (failAt === "audio") throw new Error("mock audio constructor failed");
      }

      setAttribute() {}

      async play() {
        if (failAt === "playback") throw new Error("mock playback failed");
      }

      pause() {
        state.audioPauses += 1;
      }
    }
    Object.defineProperty(window, "Audio", { configurable: true, value: FakeAudio });

    let activeChannel: FakeDataChannel | null = null;
    class FakeDataChannel {
      readyState: RTCDataChannelState = "connecting";
      onopen: EventHandler = null;
      onmessage: MessageHandler = null;
      onclose: EventHandler = null;
      onerror: EventHandler = null;

      send(serialized: string) {
        state.sentEvents.push(JSON.parse(serialized) as Record<string, unknown>);
      }

      close() {
        if (this.readyState === "closed") return;
        this.readyState = "closed";
        state.channelCloses += 1;
      }

      open() {
        this.readyState = "open";
        this.onopen?.(new Event("open"));
      }

      emit(event: Record<string, unknown>) {
        this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(event) }));
      }
    }

    class FakePeerConnection {
      connectionState: RTCPeerConnectionState = "new";
      ontrack: ((event: RTCTrackEvent) => void) | null = null;
      onconnectionstatechange: EventHandler = null;
      private channel: FakeDataChannel | null = null;

      constructor() {
        if (failAt === "peer") throw new Error("mock peer constructor failed");
        state.peerConnections += 1;
      }

      createDataChannel() {
        if (failAt === "data-channel") throw new Error("mock data channel failed");
        this.channel = new FakeDataChannel();
        activeChannel = this.channel;
        return this.channel;
      }

      addTrack() {}

      async createOffer() {
        if (failAt === "offer") throw new Error("mock offer failed");
        return { type: "offer" as const, sdp: "v=0\r\no=harmony-browser-test" };
      }

      async setLocalDescription() {
        if (failAt === "local-description") throw new Error("mock local description failed");
      }

      async setRemoteDescription() {
        if (failAt === "remote-description") throw new Error("mock remote description failed");
        if (autoConnect === false) return;
        queueMicrotask(() => {
          this.connectionState = "connected";
          this.channel?.open();
          this.channel?.emit({
            type: "session.created",
            event_id: "evt-session-created",
            session: { type: "realtime", model: "gpt-realtime-2.1" },
          });
          this.ontrack?.({
            track: remoteTrack,
            streams: [remoteStream],
          } as unknown as RTCTrackEvent);
        });
      }

      async getStats() {
        const stat = {
          id: "mock-inbound-audio",
          type: "inbound-rtp",
          kind: "audio",
          packetsReceived: 7,
        };
        return {
          forEach(callback: (value: typeof stat, key: string) => void) {
            callback(stat, stat.id);
          },
        };
      }

      close() {
        if (this.connectionState === "closed") return;
        this.connectionState = "closed";
        state.peerCloses += 1;
      }
    }
    Object.defineProperty(window, "RTCPeerConnection", {
      configurable: true,
      value: FakePeerConnection,
    });

    const browserMock: BrowserVoiceMock = {
      state,
      emit(event) {
        activeChannel?.emit(event);
      },
      resolveMicrophone() {
        resolveMicrophone?.(microphoneStream);
      },
    };
    Object.defineProperty(window, "__hhVoiceMock", {
      configurable: false,
      value: browserMock,
    });
  }, {
    autoConnect: options.autoConnect ?? true,
    holdMicrophone: options.holdMicrophone ?? false,
    failAt: options.failAt,
  });

  return {
    get clientSecretRequests() {
      return clientSecretRequests;
    },
    get clientSecretBodies() {
      return clientSecretBodies;
    },
    get realtimeCallRequests() {
      return realtimeCallRequests;
    },
    get sawRealtimeAuthorization() {
      return sawRealtimeAuthorization;
    },
    releaseClientSecret() {
      releaseClientSecret?.();
    },
  };
}

export function realtimeVoiceMockState(page: Page): Promise<RealtimeVoiceMockState> {
  return page.evaluate(() => (
    window as Window & { __hhVoiceMock: BrowserVoiceMock }
  ).__hhVoiceMock.state);
}

export function emitRealtimeEvent(
  page: Page,
  event: Record<string, unknown>,
): Promise<void> {
  return page.evaluate((value) => (
    window as Window & { __hhVoiceMock: BrowserVoiceMock }
  ).__hhVoiceMock.emit(value), event);
}

export function resolveMockMicrophone(page: Page): Promise<void> {
  return page.evaluate(() => (
    window as Window & { __hhVoiceMock: BrowserVoiceMock }
  ).__hhVoiceMock.resolveMicrophone());
}

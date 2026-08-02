import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HANZ_FIRST_MESSAGE } from "./hanzSystemPrompt";
import {
  OpenAIRealtimeSession,
  type RealtimeSessionCallbacks,
  type RealtimeSessionDependencies,
} from "./openAIRealtimeSession";
import { HANZ_REALTIME_MODEL } from "./realtimeSessionConfig";

const CLIENT_SECRET_ENDPOINT = "/api/voice/client-secret";
const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const SERVER_NOW = 1_800_000_000;

function domFake<T extends object>(value: Partial<T>): T {
  return value as T;
}

function trackFixture(kind: "audio" | "video", id: string) {
  const stop = vi.fn();
  return {
    value: domFake<MediaStreamTrack>({ kind, id, stop }),
    stop,
  };
}

function streamFixture(tracks: ReturnType<typeof trackFixture>[]) {
  const value = domFake<MediaStream>({
    getAudioTracks: vi.fn(() =>
      tracks.filter(({ value: track }) => track.kind === "audio").map(({ value }) => value),
    ),
    getVideoTracks: vi.fn(() =>
      tracks.filter(({ value: track }) => track.kind === "video").map(({ value }) => value),
    ),
    getTracks: vi.fn(() => tracks.map(({ value }) => value)),
  });
  return { value, tracks };
}

function dataChannelFixture() {
  let readyState: RTCDataChannelState = "connecting";
  const send = vi.fn();
  const close = vi.fn(() => {
    readyState = "closed";
  });
  const raw: Partial<RTCDataChannel> = {
    label: "oai-events",
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    send,
    close,
  };
  Object.defineProperty(raw, "readyState", { get: () => readyState });
  const value = domFake<RTCDataChannel>(raw);

  return {
    value,
    send,
    close,
    open() {
      readyState = "open";
      raw.onopen?.call(value, new Event("open"));
    },
    message(data: string) {
      raw.onmessage?.call(value, domFake<MessageEvent>({ data }));
    },
    emitClose() {
      readyState = "closed";
      raw.onclose?.call(value, new Event("close"));
    },
    emitError() {
      raw.onerror?.call(value, domFake<RTCErrorEvent>({}));
    },
    captureCloseHandler: () => raw.onclose,
  };
}

function statsReport(stats: RTCStats[]): RTCStatsReport {
  const raw: Partial<RTCStatsReport> = {};
  const report = domFake<RTCStatsReport>(raw);
  raw.forEach = (callback) => {
    for (const stat of stats) callback(stat, stat.id, report);
  };
  return report;
}

function peerFixture(channel: ReturnType<typeof dataChannelFixture>) {
  let connectionState: RTCPeerConnectionState = "new";
  const inboundAudioStat = {
    id: "remote-audio",
    type: "inbound-rtp" as const,
    timestamp: 0,
    kind: "audio",
    packetsReceived: 7,
  };
  const report = statsReport([domFake<RTCStats>(inboundAudioStat)]);
  const createOffer = vi.fn(async () => ({
    type: "offer" as const,
    sdp: "v=0\r\no=harmony-offer",
  }));
  const setLocalDescription = vi.fn(async () => undefined);
  const setRemoteDescription = vi.fn(async () => undefined);
  const addTrack = vi.fn();
  const createDataChannel = vi.fn(() => channel.value);
  const getStats = vi.fn(async () => report);
  const raw: Partial<RTCPeerConnection> = {
    ontrack: null,
    onconnectionstatechange: null,
  };
  Object.assign(raw, {
    createOffer,
    setLocalDescription,
    setRemoteDescription,
    addTrack,
    createDataChannel,
    getStats,
  });
  const close = vi.fn(() => {
    connectionState = "closed";
  });
  raw.close = close;
  Object.defineProperty(raw, "connectionState", { get: () => connectionState });
  const value = domFake<RTCPeerConnection>(raw);

  return {
    value,
    createOffer,
    setLocalDescription,
    setRemoteDescription,
    addTrack,
    createDataChannel,
    getStats,
    close,
    emitTrack(track: MediaStreamTrack, streams: MediaStream[]) {
      raw.ontrack?.call(value, domFake<RTCTrackEvent>({ track, streams }));
    },
    emitConnectionState(next: RTCPeerConnectionState) {
      connectionState = next;
      raw.onconnectionstatechange?.call(value, new Event("connectionstatechange"));
    },
    captureConnectionHandler: () => raw.onconnectionstatechange,
  };
}

function audioFixture() {
  const play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const pause = vi.fn();
  const setAttribute = vi.fn();
  let srcObject: MediaProvider | null = null;
  const raw: Partial<HTMLAudioElement> = {
    autoplay: false,
    volume: 1,
    play,
    pause,
    setAttribute,
  };
  Object.defineProperty(raw, "srcObject", {
    get: () => srcObject,
    set: (next) => {
      srcObject = next as MediaProvider | null;
    },
  });
  return {
    value: domFake<HTMLAudioElement>(raw),
    play,
    pause,
    setAttribute,
    get srcObject() {
      return srcObject;
    },
  };
}

function callbacksFixture() {
  const callbacks = {
    onStatus: vi.fn<RealtimeSessionCallbacks["onStatus"]>(),
    onEvent: vi.fn<RealtimeSessionCallbacks["onEvent"]>(),
    onPacketCount: vi.fn<RealtimeSessionCallbacks["onPacketCount"]>(),
    onPlaybackError: vi.fn<RealtimeSessionCallbacks["onPlaybackError"]>(),
    onDisconnected: vi.fn<RealtimeSessionCallbacks["onDisconnected"]>(),
  };
  return callbacks;
}

function sessionFixture() {
  let monotonicMs = 10_000;
  const primaryAudio = trackFixture("audio", "mic-primary");
  const extraAudio = trackFixture("audio", "mic-extra");
  const video = trackFixture("video", "camera");
  const microphone = streamFixture([primaryAudio, extraAudio, video]);
  const remoteAudio = trackFixture("audio", "remote-audio-track");
  const remote = streamFixture([remoteAudio]);
  const channel = dataChannelFixture();
  const peer = peerFixture(channel);
  const audio = audioFixture();
  const callbacks = callbacksFixture();
  const payload = {
    clientSecret: "ek_test_ephemeral_123456",
    expiresAt: SERVER_NOW + 60,
    serverNow: SERVER_NOW,
    sessionEndsAt: SERVER_NOW + 300,
  };
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url === CLIENT_SECRET_ENDPOINT) return Response.json(payload);
    if (url === REALTIME_CALLS_URL) {
      return new Response("v=0\r\no=openai-answer", { status: 200 });
    }
    throw new Error("Unexpected URL");
  });
  const getUserMedia = vi.fn(async () => microphone.value);
  const createPeerConnection = vi.fn(() => peer.value);
  const createAudioElement = vi.fn(() => audio.value);
  const dependencies: Partial<RealtimeSessionDependencies> = {
    fetch: fetchMock,
    getUserMedia,
    createPeerConnection,
    createAudioElement,
    monotonicNow: () => monotonicMs,
  };
  const session = new OpenAIRealtimeSession(callbacks, dependencies);

  return {
    session,
    callbacks,
    fetchMock,
    getUserMedia,
    createPeerConnection,
    createAudioElement,
    channel,
    peer,
    audio,
    microphone,
    primaryAudio,
    extraAudio,
    video,
    remote,
    remoteAudio,
    payload,
    setMonotonicMs(next: number) {
      monotonicMs = next;
    },
  };
}

function sessionCreated(model = HANZ_REALTIME_MODEL): string {
  return JSON.stringify({
    type: "session.created",
    event_id: "event-session",
    session: { type: "realtime", model },
  });
}

async function waitForNegotiation(fixture: ReturnType<typeof sessionFixture>): Promise<void> {
  await vi.waitFor(() => expect(fixture.fetchMock).toHaveBeenCalledTimes(2));
  await vi.waitFor(() => expect(fixture.peer.setRemoteDescription).toHaveBeenCalledOnce());
}

async function connect(
  fixture: ReturnType<typeof sessionFixture>,
  signal?: AbortSignal,
): Promise<void> {
  const start = fixture.session.start(CLIENT_SECRET_ENDPOINT, signal);
  await waitForNegotiation(fixture);
  fixture.channel.open();
  fixture.channel.message(sessionCreated());
  fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
  await start;
}

describe("OpenAIRealtimeSession", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("mints before microphone access, attaches one mic track, negotiates SDP, and greets once", async () => {
    const fixture = sessionFixture();
    const external = new AbortController();
    const addAbort = vi.spyOn(AbortSignal.prototype, "addEventListener");
    const removeAbort = vi.spyOn(AbortSignal.prototype, "removeEventListener");
    let releaseSecret!: (response: Response) => void;
    const secretResponse = new Promise<Response>((resolve) => {
      releaseSecret = resolve;
    });
    fixture.fetchMock.mockReset()
      .mockImplementationOnce(async () => secretResponse)
      .mockResolvedValueOnce(new Response("v=0\r\no=openai-answer", { status: 200 }));

    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT, external.signal);
    await vi.waitFor(() => expect(fixture.fetchMock).toHaveBeenCalledOnce());
    expect(fixture.getUserMedia).not.toHaveBeenCalled();

    releaseSecret(Response.json(fixture.payload));
    await waitForNegotiation(fixture);

    expect(fixture.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(fixture.peer.createDataChannel).toHaveBeenCalledOnce();
    expect(fixture.peer.createDataChannel).toHaveBeenCalledWith("oai-events");
    expect(fixture.peer.addTrack).toHaveBeenCalledOnce();
    expect(fixture.peer.addTrack).toHaveBeenCalledWith(
      fixture.primaryAudio.value,
      fixture.microphone.value,
    );
    expect(fixture.extraAudio.stop).toHaveBeenCalled();
    expect(fixture.video.stop).toHaveBeenCalled();

    const [callsUrl, callsRequest] = fixture.fetchMock.mock.calls[1] ?? [];
    expect(callsUrl).toBe(REALTIME_CALLS_URL);
    expect(callsRequest).toMatchObject({
      method: "POST",
      body: "v=0\r\no=harmony-offer",
    });
    const headers = new Headers(callsRequest?.headers);
    expect(headers.get("Authorization")).toBe(
      `Bearer ${fixture.payload.clientSecret}`,
    );
    expect(headers.get("Content-Type")).toBe("application/sdp");
    expect(fixture.peer.setRemoteDescription).toHaveBeenCalledWith({
      type: "answer",
      sdp: "v=0\r\no=openai-answer",
    });

    fixture.channel.open();
    fixture.channel.message(sessionCreated());
    fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
    await start;

    expect(fixture.session.connectionStatus).toBe("connected");
    const sentEvents = fixture.channel.send.mock.calls.map(([serialized]) =>
      JSON.parse(String(serialized)) as Record<string, unknown>,
    );
    const greetings = sentEvents.filter(({ type }) => type === "response.create");
    expect(greetings).toEqual([
      expect.objectContaining({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions: `Say exactly this greeting and nothing else: ${JSON.stringify(HANZ_FIRST_MESSAGE)}`,
        },
      }),
    ]);

    fixture.channel.message(sessionCreated());
    await fixture.session.start(CLIENT_SECRET_ENDPOINT);
    expect(
      fixture.channel.send.mock.calls.filter(([serialized]) =>
        JSON.parse(String(serialized)).type === "response.create",
      ),
    ).toHaveLength(1);
    expect(addAbort).toHaveBeenCalledTimes(2);
    expect(removeAbort).toHaveBeenCalledTimes(2);

    await fixture.session.stop();
    expect(fixture.primaryAudio.stop).toHaveBeenCalled();
    expect(fixture.remoteAudio.stop).toHaveBeenCalled();
    expect(fixture.audio.pause).toHaveBeenCalledOnce();
    expect(fixture.audio.srcObject).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("requires an open channel, the exact session model, and a remote audio track", async () => {
    const fixture = sessionFixture();
    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT);
    await waitForNegotiation(fixture);

    fixture.channel.open();
    fixture.channel.message(sessionCreated());
    expect(fixture.session.connectionStatus).toBe("connecting");

    const videoTrack = trackFixture("video", "remote-video");
    const videoStream = streamFixture([videoTrack]);
    fixture.peer.emitTrack(videoTrack.value, [videoStream.value]);
    expect(fixture.session.connectionStatus).toBe("connecting");

    fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
    await start;
    expect(fixture.session.connectionStatus).toBe("connected");
  });

  it("rejects an unexpected session model and cleans up the pending start", async () => {
    const fixture = sessionFixture();
    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT);
    await waitForNegotiation(fixture);

    fixture.channel.open();
    fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
    fixture.channel.message(sessionCreated("gpt-realtime-wrong"));

    await expect(start).rejects.toThrow("unexpected session");
    expect(fixture.session.connectionStatus).toBe("error");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.primaryAudio.stop).toHaveBeenCalled();
    expect(fixture.channel.close).toHaveBeenCalledOnce();
    expect(fixture.peer.close).toHaveBeenCalledOnce();
  });

  it("rejects cleanly when transport fails during negotiation", async () => {
    const fixture = sessionFixture();
    fixture.fetchMock.mockReset()
      .mockResolvedValueOnce(Response.json(fixture.payload))
      .mockImplementationOnce(async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) return;
          const abort = () => reject(new DOMException("cancelled", "AbortError"));
          if (signal.aborted) abort();
          else signal.addEventListener("abort", abort, { once: true });
        }),
      );

    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT);
    await vi.waitFor(() => expect(fixture.fetchMock).toHaveBeenCalledTimes(2));
    fixture.channel.emitError();

    await expect(start).rejects.toThrow("voice connection ran into a problem");
    expect(fixture.session.connectionStatus).toBe("error");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onStatus).toHaveBeenLastCalledWith(
      "error",
      "The voice connection ran into a problem.",
    );
  });

  it("stops a pending start without duplicate status or disconnect callbacks", async () => {
    const fixture = sessionFixture();
    const external = new AbortController();
    const removeAbort = vi.spyOn(external.signal, "removeEventListener");
    let releaseMicrophone!: (stream: MediaStream) => void;
    fixture.getUserMedia.mockImplementationOnce(async () =>
      new Promise<MediaStream>((resolve) => {
        releaseMicrophone = resolve;
      }),
    );

    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT, external.signal);
    await vi.waitFor(() => expect(fixture.getUserMedia).toHaveBeenCalledOnce());
    await fixture.session.stop();
    releaseMicrophone(fixture.microphone.value);

    await expect(start).rejects.toMatchObject({ name: "AbortError" });
    expect(fixture.callbacks.onStatus.mock.calls).toEqual([
      ["connecting", null],
      ["disconnected", null],
    ]);
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.createPeerConnection).not.toHaveBeenCalled();
    for (const { stop } of fixture.microphone.tracks) {
      expect(stop).toHaveBeenCalledOnce();
    }
    expect(removeAbort).toHaveBeenCalledOnce();

    await fixture.session.stop();
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onStatus).toHaveBeenCalledTimes(2);
  });

  it("cleans up microphone state when peer construction throws", async () => {
    const fixture = sessionFixture();
    fixture.createPeerConnection.mockImplementationOnce(() => {
      throw new Error("ek_constructor_secret_123456 rtc_constructor_123456");
    });

    await expect(
      fixture.session.start(CLIENT_SECRET_ENDPOINT),
    ).rejects.toThrow("could not create the voice connection");

    expect(fixture.createAudioElement).not.toHaveBeenCalled();
    for (const { stop } of fixture.microphone.tracks) {
      expect(stop).toHaveBeenCalled();
    }
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "ek_constructor_secret_123456",
    );
  });

  it("closes the owned peer when audio construction throws", async () => {
    const fixture = sessionFixture();
    fixture.createAudioElement.mockImplementationOnce(() => {
      throw new Error("v=0\r\no=private-audio-constructor");
    });

    await expect(
      fixture.session.start(CLIENT_SECRET_ENDPOINT),
    ).rejects.toThrow("could not create voice playback");

    expect(fixture.peer.close).toHaveBeenCalledOnce();
    expect(fixture.peer.createDataChannel).not.toHaveBeenCalled();
    expect(fixture.primaryAudio.stop).toHaveBeenCalled();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private-audio-constructor",
    );
  });

  it("closes peer and audio resources when channel construction throws", async () => {
    const fixture = sessionFixture();
    fixture.peer.createDataChannel.mockImplementationOnce(() => {
      throw new Error("rtc_channel_constructor_123456");
    });

    await expect(
      fixture.session.start(CLIENT_SECRET_ENDPOINT),
    ).rejects.toThrow("could not create the voice event channel");

    expect(fixture.peer.close).toHaveBeenCalledOnce();
    expect(fixture.audio.pause).toHaveBeenCalledOnce();
    expect(fixture.audio.srcObject).toBeNull();
    expect(fixture.primaryAudio.stop).toHaveBeenCalled();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "rtc_channel_constructor_123456",
    );
  });

  it("rejects provider expiry deltas outside the serverNow bounds", async () => {
    const invalidPayloads = [
      { expiresAt: SERVER_NOW },
      { expiresAt: SERVER_NOW + 301, sessionEndsAt: SERVER_NOW + 301 },
      { sessionEndsAt: SERVER_NOW + 301 },
      { expiresAt: SERVER_NOW + 200, sessionEndsAt: SERVER_NOW + 100 },
    ];

    for (const overrides of invalidPayloads) {
      const fixture = sessionFixture();
      Object.assign(fixture.payload, overrides);

      await expect(
        fixture.session.start(CLIENT_SECRET_ENDPOINT),
      ).rejects.toThrow("invalid session credential");
      expect(fixture.getUserMedia).not.toHaveBeenCalled();
    }
  });

  it("rejects readiness immediately when the start signal was already aborted", async () => {
    const fixture = sessionFixture();
    const external = new AbortController();
    fixture.peer.addTrack.mockImplementationOnce(() => external.abort());

    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT, external.signal);

    await expect(start).rejects.toMatchObject({ name: "AbortError" });
    expect(fixture.session.connectionStatus).toBe("disconnected");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.peer.close).toHaveBeenCalledOnce();
    expect(fixture.channel.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("subtracts receipt-to-readiness elapsed time from the mirrored deadline", async () => {
    const fixture = sessionFixture();
    fixture.setMonotonicMs(10_000);
    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT);
    await waitForNegotiation(fixture);

    fixture.setMonotonicMs(50_000);
    fixture.channel.open();
    fixture.channel.message(sessionCreated());
    fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
    await start;

    // The provider granted 300s; 40s of setup elapsed after payload receipt.
    await vi.advanceTimersByTimeAsync(259_999);
    expect(fixture.session.connectionStatus).toBe("connected");
    await vi.advanceTimersByTimeAsync(1);
    expect(fixture.session.connectionStatus).toBe("disconnected");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
  });

  it("ignores an ahead or forward-jumping browser clock for validity and deadline", async () => {
    const fixture = sessionFixture();
    vi.spyOn(Date, "now").mockReturnValue((SERVER_NOW + 86_400) * 1_000);
    fixture.setMonotonicMs(10_000);

    await connect(fixture);
    expect(fixture.session.connectionStatus).toBe("connected");

    vi.spyOn(Date, "now").mockReturnValue((SERVER_NOW + 31_536_000) * 1_000);
    fixture.session.checkDeadline();
    expect(fixture.session.connectionStatus).toBe("connected");

    fixture.setMonotonicMs(309_999);
    fixture.session.checkDeadline();
    expect(fixture.session.connectionStatus).toBe("connected");
    fixture.setMonotonicMs(310_000);
    fixture.session.checkDeadline();
    expect(fixture.session.connectionStatus).toBe("disconnected");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
  });

  it("reports remote playback rejection without failing the connected session", async () => {
    const fixture = sessionFixture();
    fixture.audio.play.mockRejectedValueOnce(new Error("autoplay rejected"));

    await connect(fixture);
    await Promise.resolve();

    expect(fixture.session.connectionStatus).toBe("connected");
    expect(fixture.callbacks.onPlaybackError).toHaveBeenLastCalledWith(
      "Hanz audio could not play in this browser. Check your output device and try again.",
    );

    await fixture.session.stop();
    expect(fixture.callbacks.onPlaybackError).toHaveBeenLastCalledWith(null);
  });

  it("clears a stale playback warning when the transport later fails", async () => {
    const fixture = sessionFixture();
    fixture.audio.play.mockRejectedValueOnce(new Error("autoplay rejected"));

    await connect(fixture);
    await Promise.resolve();
    fixture.channel.emitClose();

    expect(fixture.session.connectionStatus).toBe("error");
    expect(fixture.callbacks.onPlaybackError).toHaveBeenLastCalledWith(null);
    expect(fixture.callbacks.onStatus).toHaveBeenLastCalledWith(
      "error",
      "The voice connection closed unexpectedly.",
    );
  });

  it("handles an unexpected close once even when stale transport callbacks repeat", async () => {
    const fixture = sessionFixture();
    await connect(fixture);
    const staleClose = fixture.channel.captureCloseHandler();
    const stalePeerChange = fixture.peer.captureConnectionHandler();

    fixture.channel.emitClose();
    expect(fixture.session.connectionStatus).toBe("error");
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();

    staleClose?.call(fixture.channel.value, new Event("close"));
    stalePeerChange?.call(fixture.peer.value, new Event("connectionstatechange"));
    await fixture.session.stop();
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(
      fixture.callbacks.onStatus.mock.calls.filter(([status]) => status === "error"),
    ).toHaveLength(1);
  });

  it("cleans up unconditionally when data-channel sends race with closure", async () => {
    const fixture = sessionFixture();
    await connect(fixture);
    fixture.channel.send.mockImplementation(() => {
      throw new Error("channel closed during send");
    });

    expect(fixture.session.send({ type: "test.send" })).toBe(false);
    await fixture.session.dispose();

    expect(fixture.channel.close).toHaveBeenCalledOnce();
    expect(fixture.peer.close).toHaveBeenCalledOnce();
    expect(fixture.audio.pause).toHaveBeenCalledOnce();
    expect(fixture.primaryAudio.stop).toHaveBeenCalled();
    expect(fixture.remoteAudio.stop).toHaveBeenCalled();
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
    expect(fixture.session.connectionStatus).toBe("disconnected");

    await fixture.session.dispose();
    expect(fixture.callbacks.onDisconnected).toHaveBeenCalledOnce();
  });

  it("ignores malformed events and sanitizes callback diagnostics", async () => {
    const fixture = sessionFixture();
    fixture.callbacks.onEvent.mockRejectedValueOnce(
      new Error(
        "ek_sensitive_123456 rtc_sensitive_123456 Bearer sk_test_123456789\n" +
        "v=0\r\no=private-sdp",
      ),
    );
    const start = fixture.session.start(CLIENT_SECRET_ENDPOINT);
    await waitForNegotiation(fixture);

    fixture.channel.message("{ek_sensitive_123456");
    fixture.channel.message(JSON.stringify({ secret: "rtc_sensitive_123456" }));
    expect(fixture.callbacks.onEvent).not.toHaveBeenCalled();

    fixture.channel.open();
    fixture.channel.message(sessionCreated());
    fixture.peer.emitTrack(fixture.remoteAudio.value, [fixture.remote.value]);
    await start;
    await Promise.resolve();

    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).not.toContain("ek_sensitive_123456");
    expect(logged).not.toContain("rtc_sensitive_123456");
    expect(logged).not.toContain("sk_test_123456789");
    expect(logged).not.toContain("private-sdp");
    expect(logged).toContain("session description redacted");
  });

  it("counts only valid inbound audio packet statistics", async () => {
    const fixture = sessionFixture();
    await connect(fixture);

    await vi.waitFor(() =>
      expect(fixture.callbacks.onPacketCount).toHaveBeenCalledWith(7),
    );
    expect(fixture.peer.getStats).toHaveBeenCalled();
  });
});

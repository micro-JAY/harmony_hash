import { sanitizeProviderDetail } from "../lib/sanitizeProviderDetail";
import { HANZ_FIRST_MESSAGE } from "./hanzSystemPrompt";
import { HANZ_MAX_SESSION_MS, HANZ_REALTIME_MODEL } from "./realtimeSessionConfig";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const READY_TIMEOUT_MS = 15_000;
const DISCONNECTED_GRACE_MS = 5_000;

export type RealtimeConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type RealtimeServerEvent = Record<string, unknown> & { type: string };

export interface RealtimeSessionCallbacks {
  onStatus: (status: RealtimeConnectionStatus, message: string | null) => void;
  onEvent: (event: RealtimeServerEvent) => void | Promise<void>;
  onPacketCount: (packetCount: number) => void;
  onPlaybackError: (message: string | null) => void;
  onDisconnected: () => void;
}

export interface RealtimeSessionDependencies {
  fetch: typeof fetch;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createPeerConnection: () => RTCPeerConnection;
  createAudioElement: () => HTMLAudioElement;
  monotonicNow: () => number;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
  setInterval: typeof globalThis.setInterval;
  clearInterval: typeof globalThis.clearInterval;
}

interface ClientSecretPayload {
  clientSecret: string;
  expiresAt: number;
  serverNow: number;
  sessionEndsAt: number;
  receivedAtMonotonicMs: number;
}

class SessionStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionStartError";
  }
}

function defaultDependencies(): RealtimeSessionDependencies {
  return {
    fetch: (...args) => globalThis.fetch(...args),
    getUserMedia: (constraints) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new SessionStartError("Microphone access is not available in this browser.");
      }
      return navigator.mediaDevices.getUserMedia(constraints);
    },
    createPeerConnection: () => new RTCPeerConnection(),
    createAudioElement: () => new Audio(),
    monotonicNow: () => performance.now(),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function abortError(): DOMException {
  return new DOMException("The voice session start was cancelled", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function clientSecretPayload(
  value: unknown,
  receivedAtMonotonicMs: number,
): ClientSecretPayload | null {
  if (!isRecord(value)) return null;
  const { clientSecret, expiresAt, serverNow, sessionEndsAt } = value;
  if (
    typeof clientSecret !== "string" ||
    clientSecret.length === 0 ||
    typeof expiresAt !== "number" ||
    !Number.isInteger(expiresAt) ||
    typeof serverNow !== "number" ||
    !Number.isInteger(serverNow) ||
    typeof sessionEndsAt !== "number" ||
    !Number.isInteger(sessionEndsAt) ||
    expiresAt <= serverNow ||
    sessionEndsAt <= serverNow ||
    expiresAt > sessionEndsAt ||
    expiresAt - serverNow > HANZ_MAX_SESSION_MS / 1_000 ||
    sessionEndsAt - serverNow > HANZ_MAX_SESSION_MS / 1_000
  ) {
    return null;
  }
  return {
    clientSecret,
    expiresAt,
    serverNow,
    sessionEndsAt,
    receivedAtMonotonicMs,
  };
}

function realtimeEvent(value: unknown): RealtimeServerEvent | null {
  if (!isRecord(value) || typeof value.type !== "string" || value.type.length === 0) {
    return null;
  }
  return value as RealtimeServerEvent;
}

function sanitizedDiagnostic(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  if (/(^|\r?\n)(?:v=|o=|s=|t=|m=|a=)/m.test(detail)) {
    return "[session description redacted]";
  }
  return sanitizeProviderDetail(detail);
}

function inboundAudioPackets(
  stat: RTCStats,
): { id: string; packetsReceived: number } | null {
  if (!isRecord(stat)) return null;
  const { id, type, kind, mediaType, packetsReceived } = stat;
  if (
    typeof id !== "string"
    || type !== "inbound-rtp"
    || (kind !== "audio" && mediaType !== "audio")
    || typeof packetsReceived !== "number"
    || !Number.isFinite(packetsReceived)
    || packetsReceived < 0
  ) {
    return null;
  }
  return { id, packetsReceived };
}

export class OpenAIRealtimeSession {
  private readonly callbacks: RealtimeSessionCallbacks;
  private readonly dependencies: RealtimeSessionDependencies;
  private status: RealtimeConnectionStatus = "disconnected";
  private statusMessage: string | null = null;
  private generation = 0;
  private eventSequence = 0;
  private attemptController: AbortController | null = null;
  private removeExternalAbort: (() => void) | null = null;
  private removeReadyAbort: (() => void) | null = null;
  private microphoneStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((reason: unknown) => void) | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private packetTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectedTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineMonotonicMs: number | null = null;
  private dataChannelReady = false;
  private sessionCreated = false;
  private remoteTrackReady = false;
  private greetingSent = false;
  private intentionalStop = false;
  private disconnectedNotified = true;
  private pendingStartFailure: SessionStartError | null = null;
  private packetCount = 0;
  private readonly lastPacketsByReport = new Map<string, number>();

  constructor(
    callbacks: RealtimeSessionCallbacks,
    dependencies: Partial<RealtimeSessionDependencies> = {},
  ) {
    this.callbacks = callbacks;
    this.dependencies = { ...defaultDependencies(), ...dependencies };
  }

  get connectionStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  async start(clientSecretEndpoint: string, externalSignal?: AbortSignal): Promise<void> {
    if (this.status === "connecting" || this.status === "connected") return;

    this.cleanupResources();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.attemptController = controller;
    this.intentionalStop = false;
    this.resetSessionState();

    if (externalSignal) {
      const abort = () => controller.abort();
      if (externalSignal.aborted) abort();
      else externalSignal.addEventListener("abort", abort, { once: true });
      this.removeExternalAbort = () => externalSignal.removeEventListener("abort", abort);
    }

    this.setStatus("connecting", null);

    try {
      const secret = await this.mintClientSecret(clientSecretEndpoint, controller.signal);
      this.ensureCurrent(generation, controller.signal);

      let stream: MediaStream;
      try {
        stream = await this.dependencies.getUserMedia({ audio: true, video: false });
      } catch (error) {
        if (controller.signal.aborted) throw abortError();
        const name = error instanceof Error ? error.name : "unknown";
        throw new SessionStartError(
          name === "NotAllowedError"
            ? "Microphone permission was denied. Allow access and try again."
            : "The microphone could not be started. Check it and try again.",
        );
      }
      try {
        this.ensureCurrent(generation, controller.signal);
      } catch (error) {
        for (const track of stream.getTracks()) track.stop();
        throw error;
      }
      this.microphoneStream = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new SessionStartError("The selected microphone did not provide an audio track.");
      }
      for (const extraTrack of audioTracks.slice(1)) extraTrack.stop();
      for (const videoTrack of stream.getVideoTracks()) videoTrack.stop();

      let peer: RTCPeerConnection;
      try {
        peer = this.dependencies.createPeerConnection();
        this.peerConnection = peer;
      } catch {
        throw new SessionStartError(
          "The browser could not create the voice connection. Please try again.",
        );
      }

      let audio: HTMLAudioElement;
      try {
        audio = this.dependencies.createAudioElement();
        this.audioElement = audio;
      } catch {
        throw new SessionStartError(
          "The browser could not create voice playback. Please try again.",
        );
      }

      let channel: RTCDataChannel;
      try {
        channel = peer.createDataChannel("oai-events");
        this.dataChannel = channel;
      } catch {
        throw new SessionStartError(
          "The browser could not create the voice event channel. Please try again.",
        );
      }
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.volume = 1;
      this.installPeerHandlers(peer, audio, generation);
      this.installDataChannelHandlers(channel, generation);
      peer.addTrack(audioTracks[0], stream);

      const ready = this.waitUntilReady(controller.signal);
      // Readiness can fail while offer/answer negotiation is still awaited.
      // Attach a rejection observer immediately, then await the same promise below.
      void ready.catch(() => undefined);
      let offer: RTCSessionDescriptionInit;
      try {
        offer = await peer.createOffer();
        this.ensureCurrent(generation, controller.signal);
        await peer.setLocalDescription(offer);
      } catch {
        if (controller.signal.aborted) throw abortError();
        throw new SessionStartError("The browser could not prepare the voice connection.");
      }
      this.ensureCurrent(generation, controller.signal);
      if (!offer.sdp) {
        throw new SessionStartError("The browser created an empty voice connection offer.");
      }
      if (this.remainingFromReceipt(secret, secret.expiresAt) <= 0) {
        throw new SessionStartError(
          "The voice session credential expired before connection. Please try again.",
        );
      }

      let sdpResponse: Response;
      try {
        sdpResponse = await this.dependencies.fetch(OPENAI_REALTIME_CALLS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret.clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) throw abortError();
        throw new SessionStartError("The voice service could not be reached. Please try again.");
      }
      this.ensureCurrent(generation, controller.signal);
      if (!sdpResponse.ok) {
        throw new SessionStartError("The voice service could not start this session. Please try again.");
      }
      const answerSdp = await sdpResponse.text();
      this.ensureCurrent(generation, controller.signal);
      if (!answerSdp.trim()) {
        throw new SessionStartError("The voice service returned an empty connection answer.");
      }
      try {
        await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch {
        if (controller.signal.aborted) throw abortError();
        throw new SessionStartError("The browser could not finish the voice connection.");
      }
      this.ensureCurrent(generation, controller.signal);

      await ready;
      this.ensureCurrent(generation, controller.signal);
      this.startDeadline(secret);
      this.clearExternalAbort();
      this.setStatus("connected", null);
      this.startPacketPolling(peer, generation);
      this.sendOpeningGreeting();
    } catch (error) {
      // A public stop invalidates the generation and already owns cleanup and
      // callbacks. The superseded start only reports cancellation to its caller.
      if (generation !== this.generation) throw abortError();

      const transportFailure = this.pendingStartFailure;
      const aborted = !transportFailure &&
        (controller.signal.aborted || isAbortError(error));
      this.generation += 1;
      if (!controller.signal.aborted) controller.abort();
      this.cleanupResources();
      this.notifyDisconnected();
      if (aborted) {
        this.setStatus("disconnected", null);
        throw abortError();
      }

      const message = transportFailure?.message ?? (error instanceof SessionStartError
        ? error.message
        : "The voice session ran into a problem. Please try again.");
      console.error(
        "[harmony-hash-voice] Realtime start failed",
        sanitizedDiagnostic(error),
      );
      this.setStatus("error", message);
      throw new SessionStartError(message);
    }
  }

  async stop(): Promise<void> {
    if (this.status === "disconnected" && !this.attemptController) return;
    this.intentionalStop = true;
    this.send({ type: "response.cancel" });
    this.send({ type: "output_audio_buffer.clear" });
    this.generation += 1;
    this.attemptController?.abort();
    this.cleanupResources();
    this.notifyDisconnected();
    this.setStatus("disconnected", null);
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return;
    if (this.audioElement) this.audioElement.volume = Math.min(1, Math.max(0, volume));
  }

  checkDeadline(): void {
    if (this.status !== "connected") return;
    const monotonicExpired = this.deadlineMonotonicMs !== null &&
      this.dependencies.monotonicNow() >= this.deadlineMonotonicMs;
    if (monotonicExpired) void this.stop();
  }

  send(event: Record<string, unknown>): boolean {
    const channel = this.dataChannel;
    if (!channel || channel.readyState !== "open") return false;
    const payload = "event_id" in event
      ? event
      : { ...event, event_id: `hh_voice_${++this.eventSequence}` };
    try {
      channel.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  private async mintClientSecret(
    endpoint: string,
    signal: AbortSignal,
  ): Promise<ClientSecretPayload> {
    let response: Response;
    try {
      response = await this.dependencies.fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        signal,
      });
    } catch {
      if (signal.aborted) throw abortError();
      throw new SessionStartError("Could not start the voice session. Please try again.");
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new SessionStartError("The voice service returned an invalid response.");
    }
    if (!response.ok) {
      const message = isRecord(body) && typeof body.error === "string" && body.error.length <= 200
        ? sanitizeProviderDetail(body.error)
        : "Could not start the voice session. Please try again.";
      throw new SessionStartError(message);
    }
    const receivedAtMonotonicMs = this.dependencies.monotonicNow();
    const payload = clientSecretPayload(
      body,
      receivedAtMonotonicMs,
    );
    if (!payload) {
      throw new SessionStartError("The voice service returned an invalid session credential.");
    }
    return payload;
  }

  private installPeerHandlers(
    peer: RTCPeerConnection,
    audio: HTMLAudioElement,
    generation: number,
  ): void {
    peer.ontrack = (event) => {
      if (generation !== this.generation || event.track.kind !== "audio") return;
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.remoteStream = stream;
      audio.srcObject = stream;
      this.remoteTrackReady = true;
      this.maybeResolveReady();
      void audio.play().then(
        () => {
          if (generation === this.generation) this.callbacks.onPlaybackError(null);
        },
        () => {
          if (generation === this.generation) {
            this.callbacks.onPlaybackError(
              "Harmony audio could not play in this browser. Check your output device and try again.",
            );
          }
        },
      );
    };
    peer.onconnectionstatechange = () => {
      if (generation !== this.generation || this.intentionalStop) return;
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        this.handleTransportFailure("The voice connection closed unexpectedly.");
        return;
      }
      if (peer.connectionState === "disconnected") {
        if (this.disconnectedTimer !== null) return;
        this.disconnectedTimer = this.dependencies.setTimeout(() => {
          this.disconnectedTimer = null;
          if (
            generation === this.generation
            && !this.intentionalStop
            && peer.connectionState === "disconnected"
          ) {
            this.handleTransportFailure("The voice connection was lost.");
          }
        }, DISCONNECTED_GRACE_MS);
        return;
      }
      if (this.disconnectedTimer !== null) {
        this.dependencies.clearTimeout(this.disconnectedTimer);
        this.disconnectedTimer = null;
      }
    };
  }

  private installDataChannelHandlers(channel: RTCDataChannel, generation: number): void {
    channel.onopen = () => {
      if (generation !== this.generation) return;
      this.dataChannelReady = true;
      this.maybeResolveReady();
    };
    channel.onmessage = (message) => {
      if (generation !== this.generation || typeof message.data !== "string") return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        console.error("[harmony-hash-voice] Ignored malformed Realtime event");
        return;
      }
      const event = realtimeEvent(parsed);
      if (!event) {
        console.error("[harmony-hash-voice] Ignored incomplete Realtime event");
        return;
      }
      if (event.type === "session.created") {
        const session = isRecord(event.session) ? event.session : null;
        if (session?.type !== "realtime" || session.model !== HANZ_REALTIME_MODEL) {
          this.handleTransportFailure("The voice service returned an unexpected session.");
          return;
        }
        this.sessionCreated = true;
        this.maybeResolveReady();
      }
      void Promise.resolve(this.callbacks.onEvent(event)).catch((error: unknown) => {
        console.error(
          "[harmony-hash-voice] Realtime event handler failed",
          sanitizedDiagnostic(error),
        );
      });
    };
    channel.onclose = () => {
      if (generation !== this.generation || this.intentionalStop) return;
      this.handleTransportFailure("The voice connection closed unexpectedly.");
    };
    channel.onerror = () => {
      if (generation !== this.generation || this.intentionalStop) return;
      this.handleTransportFailure("The voice connection ran into a problem.");
    };
  }

  private waitUntilReady(signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      const abort = () => this.rejectReady(abortError());
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
      this.removeReadyAbort = () => signal.removeEventListener("abort", abort);
      if (signal.aborted) {
        abort();
        return;
      }
      this.readyTimer = this.dependencies.setTimeout(() => {
        this.readyTimer = null;
        this.failPendingStart(
          new SessionStartError("The voice connection did not become ready in time."),
        );
      }, READY_TIMEOUT_MS);
      this.maybeResolveReady();
    });
  }

  private maybeResolveReady(): void {
    if (!this.dataChannelReady || !this.sessionCreated || !this.remoteTrackReady) return;
    const resolve = this.readyResolve;
    this.clearReadyWait();
    resolve?.();
  }

  private rejectReady(reason: unknown): void {
    const reject = this.readyReject;
    this.clearReadyWait();
    reject?.(reason);
  }

  private clearReadyWait(): void {
    this.removeReadyAbort?.();
    this.removeReadyAbort = null;
    if (this.readyTimer !== null) {
      this.dependencies.clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    this.readyResolve = null;
    this.readyReject = null;
  }

  private startDeadline(secret: ClientSecretPayload): void {
    const initialRemainingMs = Math.min(
      HANZ_MAX_SESSION_MS,
      (secret.sessionEndsAt - secret.serverNow) * 1_000,
    );
    this.deadlineMonotonicMs = secret.receivedAtMonotonicMs + initialRemainingMs;
    const remainingMs = this.deadlineMonotonicMs - this.dependencies.monotonicNow();
    if (remainingMs <= 0) {
      throw new SessionStartError(
        "The voice session expired before the connection became ready. Please try again.",
      );
    }
    this.deadlineTimer = this.dependencies.setTimeout(() => {
      this.deadlineTimer = null;
      void this.stop();
    }, remainingMs);
  }

  private startPacketPolling(peer: RTCPeerConnection, generation: number): void {
    const poll = async () => {
      if (generation !== this.generation || this.status !== "connected") return;
      try {
        const report = await peer.getStats();
        if (generation !== this.generation || this.status !== "connected") return;
        report.forEach((stat) => {
          const audioPackets = inboundAudioPackets(stat);
          if (!audioPackets) return;
          const previous = this.lastPacketsByReport.get(audioPackets.id) ?? 0;
          if (audioPackets.packetsReceived > previous) {
            this.packetCount += audioPackets.packetsReceived - previous;
            this.lastPacketsByReport.set(
              audioPackets.id,
              audioPackets.packetsReceived,
            );
          }
        });
        this.callbacks.onPacketCount(this.packetCount);
      } catch {
        console.error("[harmony-hash-voice] Could not read remote audio statistics");
      }
    };
    void poll();
    this.packetTimer = this.dependencies.setInterval(() => void poll(), 1_000);
  }

  private sendOpeningGreeting(): void {
    if (this.greetingSent) return;
    this.greetingSent = this.send({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions: `Say exactly this greeting and nothing else: ${JSON.stringify(HANZ_FIRST_MESSAGE)}`,
      },
    });
  }

  private handleTransportFailure(message: string): void {
    if (this.intentionalStop || this.status === "disconnected" || this.status === "error") return;
    if (this.status === "connecting") {
      this.failPendingStart(new SessionStartError(message));
      return;
    }
    this.generation += 1;
    this.attemptController?.abort();
    this.cleanupResources();
    this.notifyDisconnected();
    this.setStatus("error", message);
  }

  private failPendingStart(failure: SessionStartError): void {
    if (this.pendingStartFailure) return;
    this.pendingStartFailure = failure;
    this.rejectReady(failure);
    this.attemptController?.abort();
  }

  private remainingFromReceipt(
    secret: ClientSecretPayload,
    targetEpochSeconds: number,
  ): number {
    const initialRemainingMs = (targetEpochSeconds - secret.serverNow) * 1_000;
    const elapsedMs = Math.max(
      0,
      this.dependencies.monotonicNow() - secret.receivedAtMonotonicMs,
    );
    return initialRemainingMs - elapsedMs;
  }

  private ensureCurrent(generation: number, signal: AbortSignal): void {
    if (signal.aborted || generation !== this.generation) throw abortError();
  }

  private setStatus(status: RealtimeConnectionStatus, message: string | null): void {
    if (this.status === status && this.statusMessage === message) return;
    this.status = status;
    this.statusMessage = message;
    this.callbacks.onStatus(status, message);
  }

  private notifyDisconnected(): void {
    if (this.disconnectedNotified) return;
    this.disconnectedNotified = true;
    this.callbacks.onDisconnected();
  }

  private resetSessionState(): void {
    this.dataChannelReady = false;
    this.sessionCreated = false;
    this.remoteTrackReady = false;
    this.greetingSent = false;
    this.disconnectedNotified = false;
    this.pendingStartFailure = null;
    this.packetCount = 0;
    this.lastPacketsByReport.clear();
    this.deadlineMonotonicMs = null;
    this.callbacks.onPacketCount(0);
    this.callbacks.onPlaybackError(null);
  }

  private cleanupResources(): void {
    this.clearExternalAbort();
    this.clearReadyWait();
    if (this.deadlineTimer !== null) this.dependencies.clearTimeout(this.deadlineTimer);
    if (this.packetTimer !== null) this.dependencies.clearInterval(this.packetTimer);
    if (this.disconnectedTimer !== null) {
      this.dependencies.clearTimeout(this.disconnectedTimer);
    }
    this.deadlineTimer = null;
    this.packetTimer = null;
    this.disconnectedTimer = null;

    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.onclose = null;
      this.dataChannel.onerror = null;
      if (this.dataChannel.readyState !== "closed") this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      if (this.peerConnection.connectionState !== "closed") this.peerConnection.close();
    }
    for (const track of this.microphoneStream?.getTracks() ?? []) track.stop();
    for (const track of this.remoteStream?.getTracks() ?? []) track.stop();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
    }
    this.attemptController = null;
    this.microphoneStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    this.deadlineMonotonicMs = null;
    this.pendingStartFailure = null;
    this.callbacks.onPlaybackError(null);
  }

  private clearExternalAbort(): void {
    this.removeExternalAbort?.();
    this.removeExternalAbort = null;
  }
}

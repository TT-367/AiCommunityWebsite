import type { TelemetryEvent, TelemetryLevel, TelemetryTransport, TelemetryUser } from "./types";
import { createRequestId, getSessionId } from "./ids";
import { sanitizeMessage, sanitizeStack } from "./sanitize";

type TelemetryConfig = {
  enabled: boolean;
  release?: string;
  environment?: string;
  transports: TelemetryTransport[];
  maxQueueSize?: number;
  flushIntervalMs?: number;
  maxEventsPerMinute?: number;
};

export class TelemetryClient {
  private enabled: boolean;
  private release?: string;
  private environment?: string;
  private transports: TelemetryTransport[];
  private queue: TelemetryEvent[] = [];
  private timer: number | null = null;
  private maxQueueSize: number;
  private flushIntervalMs: number;
  private maxEventsPerMinute: number;
  private user: TelemetryUser | null = null;
  private sessionId: string;
  private minuteBucketTs: number = 0;
  private minuteCount: number = 0;

  constructor(config: TelemetryConfig) {
    this.enabled = config.enabled;
    this.release = config.release;
    this.environment = config.environment;
    this.transports = config.transports;
    this.maxQueueSize = config.maxQueueSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 1500;
    this.maxEventsPerMinute = config.maxEventsPerMinute ?? 60;
    this.sessionId = getSessionId();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setUser(user: TelemetryUser | null) {
    this.user = user;
  }

  private extractRequestId(meta: Record<string, unknown> | undefined) {
    const v = meta?.requestId;
    return typeof v === "string" ? v : undefined;
  }

  track(kind: string, message: string | undefined, level: TelemetryLevel, meta?: Record<string, unknown>) {
    const event: TelemetryEvent = {
      level,
      kind,
      message: sanitizeMessage(message),
      timestamp: Date.now(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      release: this.release,
      environment: this.environment,
      userId: this.user?.id ?? null,
      sessionId: this.sessionId,
      requestId: this.extractRequestId(meta),
      meta,
    };
    this.enqueue(event);
  }

  private toError(input: unknown) {
    if (input instanceof Error) return input;
    if (typeof input === "string") return new Error(input);
    if (input && typeof input === "object") {
      const anyObj = input as Record<string, unknown>;
      const msg = typeof anyObj.message === "string" ? anyObj.message : undefined;
      const name = typeof anyObj.name === "string" ? anyObj.name : undefined;
      const stack = typeof anyObj.stack === "string" ? anyObj.stack : undefined;
      if (msg) {
        const e = new Error(msg);
        if (name) e.name = name;
        if (stack) e.stack = stack;
        return e;
      }
    }
    return new Error("Unknown error");
  }

  captureError(error: unknown, meta?: Record<string, unknown>) {
    const e = this.toError(error);
    const event: TelemetryEvent = {
      level: "error",
      kind: "error",
      name: sanitizeMessage(e.name),
      message: sanitizeMessage(e.message),
      stack: sanitizeStack(e.stack),
      timestamp: Date.now(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      release: this.release,
      environment: this.environment,
      userId: this.user?.id ?? null,
      sessionId: this.sessionId,
      requestId: this.extractRequestId(meta),
      meta,
    };
    this.enqueue(event);
  }

  wrapFetch(fetchImpl: typeof fetch) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestId = createRequestId();
      const started = performance.now();
      const headers = new Headers(init?.headers ?? {});
      headers.set("x-request-id", requestId);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input instanceof Request
              ? input.url
              : String(input);

      try {
        const res = await fetchImpl(input, { ...(init ?? {}), headers });
        const durationMs = Math.round(performance.now() - started);
        if (!res.ok) {
          this.track(
            "http_error",
            `HTTP ${res.status}`,
            "warn",
            { requestId, url, method: init?.method ?? "GET", durationMs }
          );
        }
        return res;
      } catch (err) {
        const durationMs = Math.round(performance.now() - started);
        this.captureError(err, {
          requestId,
          url,
          method: init?.method ?? "GET",
          durationMs,
        });
        throw err;
      }
    };
  }

  private shouldDrop() {
    const now = Date.now();
    const bucket = Math.floor(now / 60000);
    if (bucket !== this.minuteBucketTs) {
      this.minuteBucketTs = bucket;
      this.minuteCount = 0;
    }
    if (this.minuteCount >= this.maxEventsPerMinute) return true;
    this.minuteCount += 1;
    return false;
  }

  private enqueue(event: TelemetryEvent) {
    if (!this.enabled) return;
    if (this.shouldDrop()) return;
    this.queue.push(event);
    if (this.queue.length > this.maxQueueSize) this.queue.splice(0, this.queue.length - this.maxQueueSize);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer != null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.flushIntervalMs);
  }

  async flush() {
    if (!this.enabled) return false;
    const batch = this.queue.splice(0, this.queue.length);
    if (batch.length === 0) return true;
    const results = await Promise.allSettled(this.transports.map((t) => t.send(batch)));
    return results.every((r) => r.status === "fulfilled");
  }
}

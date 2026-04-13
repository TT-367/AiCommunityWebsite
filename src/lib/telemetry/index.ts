import { TelemetryClient } from "./client";
import { ConsoleTransport, SupabaseRestTransport } from "./transports";
import type { TelemetryUser } from "./types";

type InitOptions = {
  enabled: boolean;
  release?: string;
  environment?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseUseBeacon?: boolean;
};

const telemetryRef: { client: TelemetryClient } = {
  client: new TelemetryClient({ enabled: false, transports: [new ConsoleTransport()] }),
};

let handlersInstalled = false;

export function initTelemetry(opts: InitOptions) {
  const transports = [new ConsoleTransport()];
  if (opts.supabaseUrl && opts.supabaseAnonKey) {
    transports.push(
      new SupabaseRestTransport({
        url: opts.supabaseUrl,
        anonKey: opts.supabaseAnonKey,
        useBeacon: opts.supabaseUseBeacon,
      })
    );
  }

  telemetryRef.client = new TelemetryClient({
    enabled: opts.enabled,
    release: opts.release,
    environment: opts.environment,
    transports,
  });

  if (!handlersInstalled && typeof window !== "undefined") {
    handlersInstalled = true;
    window.addEventListener("error", (e) => {
      telemetryRef.client.captureError(e.error ?? e.message, {
        source: "window.onerror",
        filename: (e as ErrorEvent).filename,
        lineno: (e as ErrorEvent).lineno,
        colno: (e as ErrorEvent).colno,
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      telemetryRef.client.captureError(e.reason, { source: "unhandledrejection" });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void telemetryRef.client.flush();
    });

    window.addEventListener("pagehide", () => {
      void telemetryRef.client.flush();
    });
  }

  return telemetryRef.client;
}

export function getTelemetry() {
  return telemetryRef.client;
}

export function setTelemetryUser(user: TelemetryUser | null) {
  getTelemetry().setUser(user);
}

export function captureError(error: unknown, meta?: Record<string, unknown>) {
  getTelemetry().captureError(error, meta);
}

export function track(kind: string, message?: string, meta?: Record<string, unknown>) {
  getTelemetry().track(kind, message, "info", meta);
}

export function wrapFetch(fetchImpl: typeof fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const client = getTelemetry();
    return client.wrapFetch(fetchImpl)(input, init);
  };
}

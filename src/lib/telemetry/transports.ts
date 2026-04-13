import type { TelemetryEvent, TelemetryTransport } from "./types";

type SupabaseRestConfig = {
  url: string;
  anonKey: string;
  useBeacon?: boolean;
};

export class ConsoleTransport implements TelemetryTransport {
  async send(events: TelemetryEvent[]) {
    for (const e of events) {
      const level = e.level;
      const payload = { ...e };
      if (level === "error") {
        console.error("[telemetry]", payload);
      } else if (level === "warn") {
        console.warn("[telemetry]", payload);
      } else if (level === "info") {
        console.info("[telemetry]", payload);
      } else {
        console.debug("[telemetry]", payload);
      }
    }
  }
}

export class SupabaseRestTransport implements TelemetryTransport {
  private endpoint: string;
  private anonKey: string;
  private useBeacon: boolean;

  constructor(config: SupabaseRestConfig) {
    const base = config.url.replace(/\/+$/, "");
    this.endpoint = `${base}/rest/v1/client_events`;
    this.anonKey = config.anonKey;
    this.useBeacon = config.useBeacon ?? true;
  }

  async send(events: TelemetryEvent[]) {
    if (events.length === 0) return;

    const body = events.map((e) => ({
      level: e.level,
      kind: e.kind,
      message: e.message ?? null,
      name: "name" in e ? e.name ?? null : null,
      stack: "stack" in e ? e.stack ?? null : null,
      url: e.url ?? null,
      release: e.release ?? null,
      environment: e.environment ?? null,
      user_id: e.userId ?? null,
      session_id: e.sessionId ?? null,
      request_id: e.requestId ?? null,
      meta: e.meta ?? {},
      occurred_at: new Date(e.timestamp).toISOString(),
    }));

    const headers: Record<string, string> = {
      "content-type": "application/json",
      apikey: this.anonKey,
      authorization: `Bearer ${this.anonKey}`,
      prefer: "return=minimal",
    };

    if (this.useBeacon && navigator.sendBeacon) {
      let ok = false;
      try {
        ok = navigator.sendBeacon(this.endpoint, new Blob([JSON.stringify(body)], { type: "application/json" }));
      } catch {
        ok = false;
      }
      if (ok) return;
    }

    const res = await fetch(this.endpoint, { method: "POST", headers, body: JSON.stringify(body), keepalive: true });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`telemetry_supabase_insert_failed:${res.status}:${text}`);
    }
  }
}

export type TelemetryLevel = "debug" | "info" | "warn" | "error";

export type TelemetryEventBase = {
  level: TelemetryLevel;
  kind: string;
  message?: string;
  timestamp: number;
  url?: string;
  release?: string;
  environment?: string;
  userId?: string | null;
  sessionId?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
};

export type TelemetryErrorEvent = TelemetryEventBase & {
  kind: "error";
  name?: string;
  stack?: string;
};

export type TelemetryEvent = TelemetryEventBase | TelemetryErrorEvent;

export type TelemetryUser = {
  id: string;
  email?: string | null;
};

export interface TelemetryTransport {
  send: (events: TelemetryEvent[]) => Promise<void>;
}


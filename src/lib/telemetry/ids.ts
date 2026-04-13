export function createRequestId() {
  const rand = Math.random().toString(16).slice(2);
  return `${Date.now().toString(16)}_${rand}`;
}

export function getSessionId(storageKey = "telemetry_session_id") {
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = createRequestId();
    sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return createRequestId();
  }
}


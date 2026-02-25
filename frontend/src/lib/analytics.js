import { getApiBaseUrl } from "./api";

const SESSION_STORAGE_KEY = "pickfast_session_id";

function generateSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `pf-${Date.now()}-${randomPart}`;
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = generateSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export async function trackBehaviorEvent({
  eventType,
  productId,
  category,
  price,
  region,
  metadata
}) {
  if (!eventType) {
    return;
  }

  const sessionId = getOrCreateSessionId();

  try {
    await fetch(`${getApiBaseUrl()}/api/behavior/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId,
        eventType,
        productId: productId || null,
        category: category || null,
        price: typeof price === "number" ? price : null,
        region: region || null,
        metadata: metadata || {}
      }),
      keepalive: true
    });
  } catch (_error) {
  }
}

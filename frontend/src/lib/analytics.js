import { getApiBaseUrl } from "./api";

const SESSION_KEY = "pickfast_session_id";

function generateSessionId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `pf-${Date.now()}-${random}`;
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return "server-session";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const sid = generateSessionId();
  window.localStorage.setItem(SESSION_KEY, sid);
  return sid;
}

async function postEvent(path, payload) {
  try {
    await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (_err) {
    // swallow analytics errors
  }
}

export async function trackBehaviorEvent(event) {
  if (!event || !event.eventType) return;
  const sessionId = getOrCreateSessionId();
  await postEvent("/api/behavior/track", { sessionId, ...event });
}

export async function trackClickEvent(event) {
  const sessionId = getOrCreateSessionId();
  await postEvent("/api/track/click", { sessionId, ...event });
}

export const AnalyticsEvents = {
  productClick: "product_click",
  affiliateClick: "affiliate_click",
  compareAdd: "compare_add",
  shortlistAdd: "shortlist_add",
  shortlistRemove: "shortlist_remove",
  filterApply: "filter_apply",
  recommendationRequest: "recommendation_request"
};

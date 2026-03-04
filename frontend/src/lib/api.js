const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getApiBaseUrl() {
  if (apiBaseUrl) {
    return apiBaseUrl;
  }
  // If running in the browser, imply the backend is on port 4000 of the same host
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}

export async function fetchJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

export function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function fromSlug(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .trim();
}

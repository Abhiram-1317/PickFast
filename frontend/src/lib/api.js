const DEFAULT_TIMEOUT = 8000;
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getApiBaseUrl() {
  if (BASE_URL) return BASE_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}

function withTimeout(signal, timeout) {
  if (!timeout) return { signal };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const linked = signal;
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
    linked
  };
}

async function fetchWithTimeout(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = options;
  const base = getApiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const { signal, cleanup } = withTimeout(rest.signal, timeout);

  try {
    const response = await fetch(url, { ...rest, signal });
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
      const error = new Error(payload.error || payload.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return isJson ? payload : { ok: true };
  } finally {
    if (cleanup) cleanup();
  }
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

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    search.set(key, String(val));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Public API helpers
export const api = {
  fetchProducts: (params = {}) => fetchWithTimeout(`/api/products${buildQuery(params)}`),
  fetchProduct: (id) => fetchWithTimeout(`/api/products/${encodeURIComponent(id)}`),
  fetchSimilarProducts: (id) => fetchWithTimeout(`/api/products/${encodeURIComponent(id)}/similar`),
  fetchHigherCommissionProducts: (id) => fetchWithTimeout(`/api/products/${encodeURIComponent(id)}/higher-commission`),
  fetchAffiliateLink: (slug, params = {}) => fetchWithTimeout(`/api/buy/${encodeURIComponent(slug)}${buildQuery(params)}`),
  fetchCategories: () => fetchWithTimeout(`/api/categories`),
  fetchHotDeals: (limit = 8) => fetchWithTimeout(`/api/products/hot-deals${buildQuery({ limit })}`),
  fetchSeoIntents: (limit = 8) => fetchWithTimeout(`/api/seo/intents${buildQuery({ limit })}`),
  fetchIntentDetail: (slug) => fetchWithTimeout(`/api/seo/intents/${encodeURIComponent(slug)}`),
  fetchRecommendations: (params = {}) => fetchWithTimeout(`/api/recommendations${buildQuery(params)}`),
  fetchCompare: (products = []) =>
    fetchWithTimeout(`/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products })
    }),
  fetchShortlist: (slug) => fetchWithTimeout(`/api/shortlists/${encodeURIComponent(slug)}`),
  createShortlist: (slug, products) =>
    fetchWithTimeout(`/api/shortlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, products })
    }),
  updateShortlist: (slug, products) =>
    fetchWithTimeout(`/api/shortlists/${encodeURIComponent(slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products })
    }),
  // Admin
  fetchHealth: () => fetchWithTimeout(`/api/health`),
  fetchSyncLogs: (headers = {}) => fetchWithTimeout(`/api/admin/sync/logs`, { headers }),
  fetchPriceChanges: (headers = {}) => fetchWithTimeout(`/api/admin/price-changes`, { headers }),
  fetchDuplicateEvents: (headers = {}) => fetchWithTimeout(`/api/admin/duplicates`, { headers }),
  fetchClickSummary: (headers = {}) => fetchWithTimeout(`/api/admin/clicks/summary`, { headers }),
  fetchExperimentsSummary: (key, headers = {}) => fetchWithTimeout(`/api/admin/experiments/${encodeURIComponent(key)}/summary`, { headers })
};

export async function safeFetch(promiseFn, fallback = null) {
  try {
    return await promiseFn();
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

export default api;

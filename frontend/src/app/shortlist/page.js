"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "../../lib/api";
import { trackBehaviorEvent, AnalyticsEvents } from "../../lib/analytics";
import { EmptyState, ErrorState } from "../../components/StatusStates";
import { CardSkeleton } from "../../components/Skeletons";
import ProductCard from "../../components/ProductCard";

const STORAGE_KEY = "pickfast_shortlist";

function getSavedList() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveList(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function ShortlistPage() {
  const [slug, setSlug] = useState("");
  const [shortlist, setShortlist] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("view"); // view | create

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [productIds, setProductIds] = useState("");
  const [region, setRegion] = useState("IN");

  // All products for selection
  const [catalog, setCatalog] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadShortlist = useCallback(async (s) => {
    if (!s) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.fetchShortlist(s);
      setShortlist(data.shortlist || data);
      setProducts(data.products || data.shortlist?.products || []);
      saveList({ slug: s });

      trackBehaviorEvent({
        eventType: AnalyticsEvents.shortlistView,
        metadata: { slug: s },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .fetchProducts({ limit: 40, sortBy: "score", order: "desc" })
      .then((d) => setCatalog(d.products || []))
      .catch(() => {});

    // Restore from localStorage
    const saved = getSavedList();
    if (saved?.slug) {
      setSlug(saved.slug);
      loadShortlist(saved.slug);
    }
  }, [loadShortlist]);

  async function handleCreate(e) {
    e.preventDefault();
    const ids =
      selectedIds.length > 0
        ? selectedIds
        : productIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

    if (ids.length === 0) {
      setError("Select at least one product");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await api.createShortlist({
        name: name || "My Shortlist",
        contactEmail: email || undefined,
        productIds: ids,
        region,
      });

      const sl = data.shortlist || data;
      setShortlist(sl);
      setProducts(sl.products || []);
      setSlug(sl.slug || "");
      saveList({ slug: sl.slug });
      setMode("view");

      trackBehaviorEvent({
        eventType: AnalyticsEvents.shortlistSave,
        metadata: { slug: sl.slug, count: ids.length },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Shortlist</h1>
          <p className="mt-1 text-sm text-slate-500">
            Save and share your favorite products.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === "view"
                ? "bg-emerald-500 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
            }`}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === "create"
                ? "bg-emerald-500 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
            }`}
          >
            + New Shortlist
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorState message={error} onRetry={() => setError("")} />
        </div>
      )}

      {/* Create mode */}
      {mode === "create" && (
        <form onSubmit={handleCreate} className="mt-6 card rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-800">
            Create a Shortlist
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Top Picks"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">
                Email (optional)
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Region</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="DE">Germany</option>
            </select>
          </label>

          {/* Quick picker */}
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Select Products
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalog.slice(0, 20).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedIds.includes(p.id)
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              Or enter IDs manually
            </span>
            <input
              value={productIds}
              onChange={(e) => setProductIds(e.target.value)}
              placeholder="head-001, head-002, head-003"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Shortlist"}
          </button>
        </form>
      )}

      {/* View mode */}
      {mode === "view" && (
        <>
          {/* Load by slug */}
          <div className="mt-6 card rounded-2xl p-5 flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="text-xs font-semibold text-slate-500">
                Shortlist slug
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Enter shortlist slug to load"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </label>
            <button
              type="button"
              onClick={() => loadShortlist(slug)}
              disabled={!slug || loading}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load"}
            </button>
          </div>

          {loading && (
            <div className="mt-6">
              <CardSkeleton count={3} />
            </div>
          )}

          {shortlist && !loading && (
            <div className="mt-6 space-y-6">
              {/* Info */}
              <div className="card rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {shortlist.name || "Shortlist"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {shortlist.slug} &middot; {shortlist.region || "US"} &middot;{" "}
                      {products.length} products
                    </p>
                  </div>
                  <Link
                    href={`/compare?ids=${products.map((p) => p.id).join(",")}`}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Compare All
                  </Link>
                </div>
              </div>

              {/* Product grid */}
              {products.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      pageType="shortlist"
                      region={shortlist.region}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="📋"
                  title="No products in this shortlist"
                  message="Add products to your shortlist to see them here."
                />
              )}
            </div>
          )}

          {!shortlist && !loading && !error && (
            <div className="mt-8">
              <EmptyState
                icon="📋"
                title="No shortlist loaded"
                message="Enter a slug above or create a new shortlist."
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

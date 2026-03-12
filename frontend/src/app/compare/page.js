"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { trackBehaviorEvent, AnalyticsEvents } from "../../lib/analytics";
import { ErrorState, EmptyState } from "../../components/StatusStates";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-slate-400">Loading...</div>}>
      <CompareInner />
    </Suspense>
  );
}

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [idsInput, setIdsInput] = useState(searchParams.get("ids") || "");
  const [comparison, setComparison] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load product catalog for picker
  useEffect(() => {
    api
      .fetchProducts({ limit: 50, sortBy: "score", order: "desc" })
      .then((d) => setAllProducts(d.products || []))
      .catch(() => {});
  }, []);

  // Auto-compare if URL has ids
  useEffect(() => {
    const urlIds = searchParams.get("ids");
    if (urlIds) {
      const ids = urlIds.split(",").filter(Boolean);
      if (ids.length >= 2) {
        setIdsInput(urlIds);
        setSelectedIds(ids);
        doCompare(ids);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleProduct(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setError("");
  }

  async function doCompare(productIds) {
    if (productIds.length < 2) {
      setError("Select at least 2 products to compare");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.fetchCompare(productIds);

      trackBehaviorEvent({
        eventType: AnalyticsEvents.compareAdd,
        metadata: { comparedIds: productIds, count: productIds.length },
      });

      setComparison(data);
      router.replace(`/compare?ids=${productIds.join(",")}`, { scroll: false });
    } catch (err) {
      setError(err.message);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCompareClick() {
    const ids = idsInput
      ? idsInput.split(",").map((s) => s.trim()).filter(Boolean)
      : selectedIds;
    doCompare(ids);
  }

  const winners = comparison?.summary?.winners || {};

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Compare Products</h1>
        <p className="text-sm text-slate-500">
          Select products to see a side-by-side comparison with winners highlighted.
        </p>
      </div>

      {/* Product picker */}
      <div className="mt-6 card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-700">Quick Select</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {allProducts.slice(0, 20).map((p) => (
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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            value={idsInput}
            onChange={(e) => setIdsInput(e.target.value)}
            placeholder="Or enter IDs: head-001, head-002"
            className="min-w-70 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="button"
            onClick={handleCompareClick}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Comparing..." : `Compare (${idsInput ? "IDs" : selectedIds.length})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => setError("")} />
        </div>
      )}

      {/* Results */}
      {comparison && (
        <div className="mt-8 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Best Overall", winner: winners.overall },
              { label: "Best Value", winner: winners.budget },
              { label: "Top Performance", winner: winners.performance },
            ].map((w) => (
              <div key={w.label} className="card rounded-xl p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {w.label}
                </p>
                <p className="mt-2 text-base font-bold text-slate-900">
                  {w.winner?.name || "—"}
                </p>
                {w.winner?.price != null && (
                  <p className="text-sm text-emerald-600">
                    ₹{Number(w.winner.price).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Rating</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Reviews</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Commission</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Score</th>
                    <th className="px-4 py-3 font-semibold text-slate-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {(comparison.products || []).map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image || "/file.svg"}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <span className="max-w-50 truncate font-medium text-slate-900">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        ₹{Number(p.price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{Number(p.rating || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        {Number(p.reviewCount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {(Number(p.commissionRate || 0) * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">{Number(p.score || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/product/${encodeURIComponent(p.id)}`}
                          className="text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!comparison && !loading && !error && (
        <div className="mt-8">
          <EmptyState
            icon="⚖️"
            title="Ready to compare"
            message="Select at least 2 products above or enter product IDs to see a side-by-side comparison."
          />
        </div>
      )}
    </main>
  );
}

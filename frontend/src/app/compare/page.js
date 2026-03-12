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
      <div className="mt-6 glass-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-700">Quick Select</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {allProducts.slice(0, 20).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProduct(p.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedIds.includes(p.id)
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                  : "border border-white/40 bg-white/60 text-slate-600 backdrop-blur-sm hover:border-emerald-300 hover:shadow-sm"
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
            className="min-w-70 flex-1 rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
          <button
            type="button"
            onClick={handleCompareClick}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
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
        <div className="mt-8 space-y-8">
          {/* Winner badges */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "🏆 Best Overall", winner: winners.overall, color: "from-amber-400 to-orange-500" },
              { label: "💰 Best Value", winner: winners.budget, color: "from-emerald-400 to-teal-500" },
              { label: "⚡ Top Performance", winner: winners.performance, color: "from-violet-400 to-purple-500" },
            ].map((w) => (
              <div key={w.label} className="glass-card group rounded-2xl p-5 text-center transition-all hover:shadow-xl hover:-translate-y-0.5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {w.label}
                </p>
                <p className="mt-2 text-lg font-extrabold text-slate-900">
                  {w.winner?.name || "—"}
                </p>
                {w.winner?.price != null && (
                  <span className={`mt-2 inline-block rounded-full bg-gradient-to-r ${w.color} px-3 py-1 text-xs font-bold text-white shadow-md`}>
                    ₹{Number(w.winner.price).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Side-by-side product cards */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Side-by-Side Comparison</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(comparison.products || []).map((p) => {
                const isOverallWinner = winners.overall?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`glass-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isOverallWinner ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
                  >
                    {isOverallWinner && (
                      <div className="absolute left-3 top-3 z-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-lg">
                        Winner
                      </div>
                    )}
                    <div className="aspect-video overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                      <img
                        src={p.image || "/file.svg"}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-3 p-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-2">{p.name}</h3>
                        <p className="mt-1 text-xs text-slate-400">{p.category || "General"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-emerald-50/80 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Price</p>
                          <p className="mt-0.5 text-lg font-extrabold text-emerald-700">₹{Number(p.price || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-xl bg-amber-50/80 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Rating</p>
                          <p className="mt-0.5 text-lg font-extrabold text-amber-700">⭐ {Number(p.rating || 0).toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl bg-blue-50/80 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Reviews</p>
                          <p className="mt-0.5 text-lg font-extrabold text-blue-700">{Number(p.reviewCount || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-violet-50/80 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Score</p>
                          <p className="mt-0.5 text-lg font-extrabold text-violet-700">{Number(p.score || 0).toFixed(1)}</p>
                        </div>
                      </div>
                      {p.commissionRate != null && (
                        <p className="text-center text-xs text-slate-400">Commission: {(Number(p.commissionRate || 0) * 100).toFixed(1)}%</p>
                      )}
                      <Link
                        href={`/product/${encodeURIComponent(p.id)}`}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
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

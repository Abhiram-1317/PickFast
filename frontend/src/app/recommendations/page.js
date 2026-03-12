"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import ProductCard from "../../components/ProductCard";
import { CardSkeleton } from "../../components/Skeletons";
import { EmptyState, ErrorState } from "../../components/StatusStates";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [hotDeals, setHotDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [region, setRegion] = useState("IN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .fetchCategories()
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    const params = { limit: 12, region };
    if (category) params.category = category;
    if (budgetInput) params.budget = budgetInput;

    Promise.all([
      api.fetchRecommendations(params),
      api.fetchHotDeals(6),
    ])
      .then(([recData, dealsData]) => {
        if (active) {
          setRecommendations(recData.recommendations || []);
          setHotDeals(dealsData.deals || []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [category, budgetInput, region]);

  const inputClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400";

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
        <p className="text-sm text-slate-500">
          Personalized product picks and hot deals curated for you.
        </p>
      </div>

      <div className="mt-6 card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder="Max budget"
            className={`w-32 ${inputClass}`}
            min="0"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputClass}
          >
            <option value="IN">🇮🇳 IN</option>
            <option value="US">🇺🇸 US</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="CA">🇨🇦 CA</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {/* Hot Deals */}
      {hotDeals.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">
            <span className="mr-2">🔥</span>Hot Deals
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotDeals.map((deal) => (
              <Link
                key={deal.id || deal.productId}
                href={`/product/${encodeURIComponent(deal.id || deal.productId)}`}
                className="card group overflow-hidden rounded-xl transition hover:shadow-md"
              >
                <div className="aspect-5/3 overflow-hidden bg-slate-100">
                  <img
                    src={deal.image || "/file.svg"}
                    alt={deal.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {deal.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {deal.dropPercent && (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                        ▼ {Number(deal.dropPercent).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-xs text-slate-400 line-through">
                      ₹{Number(deal.lastPrice || 0).toFixed(2)}
                    </span>
                    <span className="font-bold text-emerald-600">
                      ₹{Number(deal.currentPrice || deal.price || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Top Recommendations</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <CardSkeleton count={6} />
          ) : recommendations.length > 0 ? (
            recommendations.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                placement="recommendation"
                pageType="recommendations"
                region={region}
                showScore
              />
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                icon="💡"
                title="No recommendations yet"
                message="Adjust your category or budget filters, or add more products to get personalized picks."
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

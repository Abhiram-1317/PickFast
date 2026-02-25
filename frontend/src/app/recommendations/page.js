"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, getApiBaseUrl, toSlug } from "../../lib/api";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [hotDeals, setHotDeals] = useState([]);
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchJson(`/api/recommendations?limit=12&region=${region}`),
      fetchJson(`/api/products/hot-deals?limit=6&region=${region}`)
    ])
      .then(([recPayload, dealsPayload]) => {
        if (active) {
          setRecommendations(recPayload.recommendations || []);
          setHotDeals(dealsPayload.deals || []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [region]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Recommendation Sections</h1>
          <select
            value={region}
            onChange={(event) => {
              setError("");
              setLoading(true);
              setRegion(event.target.value);
            }}
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <option value="US">US</option>
            <option value="UK">UK</option>
            <option value="IN">IN</option>
            <option value="CA">CA</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Curated recommendations and hot deals powered by your backend APIs.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hot Deals</h2>
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading deals and recommendations...</p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotDeals.map((product) => (
            <article key={`deal-${product.id}`} className="glass relative rounded-xl p-4">
              <img
                src={product.image || "/file.svg"}
                alt={product.name}
                className="h-40 w-full rounded-xl object-cover"
              />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-200">
                ▼ {Number(product.dropPercent || 0).toFixed(1)}%
              </p>
              <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                {product.name}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Was ${Number(product.lastPrice || 0).toFixed(2)} → Now ${Number(product.currentPrice || 0).toFixed(2)}
              </p>
              <a
                href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=recommendation_hotdeal_buy&pageType=recommendations`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-micro relative z-20 mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                Claim Deal
              </a>
              <Link
                href={`/product/${encodeURIComponent(product.id)}`}
                aria-label={`View details for ${product.name}`}
                className="absolute inset-0 z-10 rounded-xl"
              />
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Recommendations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((product) => (
            <article key={product.id} className="glass relative rounded-xl p-4">
              <img
                src={product.image || "/file.svg"}
                alt={product.name}
                className="h-40 w-full rounded-xl object-cover"
              />
              <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                {product.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {product.category} • {(Number(product.commissionRate || 0) * 100).toFixed(1)}% commission
              </p>
              <p className="mt-2 text-lg font-bold text-emerald-400">
                ${Number(product.price || 0).toFixed(2)}
              </p>
              <a
                href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=recommendation_buy&pageType=recommendations`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-micro relative z-20 mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                Buy on Amazon
              </a>
              <Link
                href={`/product/${encodeURIComponent(product.id)}`}
                aria-label={`View details for ${product.name}`}
                className="absolute inset-0 z-10 rounded-xl"
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

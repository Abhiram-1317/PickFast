"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchJson, getApiBaseUrl, toSlug } from "../../lib/api";
import { getOrCreateSessionId, trackBehaviorEvent } from "../../lib/analytics";

export default function DiscoverPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    let active = true;

    fetchJson("/api/categories")
      .then((payload) => {
        if (active) {
          setCategories(payload.categories || []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({
      region,
      sortBy: "epcScore",
      order: "desc",
      limit: "18"
    });

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }
    if (budget) {
      params.set("maxPrice", budget);
    }

    const hasFilters = Boolean(selectedCategory || budget);
    trackBehaviorEvent({
      eventType: hasFilters ? "intent_apply" : "catalog_load",
      category: selectedCategory || null,
      price: budget ? Number(budget) : null,
      region,
      metadata: {
        page: "discover"
      }
    });

    fetchJson(`/api/products?${params.toString()}`)
      .then((payload) => {
        if (active) {
          setProducts(payload.products || []);
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
  }, [selectedCategory, budget, region]);

  const title = useMemo(() => {
    if (selectedCategory) {
      return `Discover ${selectedCategory}`;
    }
    return "Discover Products";
  }, [selectedCategory]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Product discovery page with category navigation and conversion-focused ranking.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(event) => {
              setError("");
              setLoading(true);
              setSelectedCategory(event.target.value);
            }}
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={budget}
            onChange={(event) => {
              setError("");
              setLoading(true);
              setBudget(event.target.value);
            }}
            placeholder="Max budget"
            className="w-40 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
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
        {categories.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={`cat-link-${category}`}
                href={`/category/${toSlug(category)}`}
                className="btn-micro rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200"
              >
                {category}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {loading ? "Loading..." : `${products.length} Results`}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="glass card-micro relative overflow-hidden rounded-2xl"
            >
              <img
                src={product.image || "/file.svg"}
                alt={product.name}
                className="h-44 w-full object-cover"
              />
              <div className="space-y-2 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">{product.category}</p>
                <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                  {product.name}
                </h3>
                <p className="text-sm font-bold text-emerald-400">
                  ${Number(product.price || 0).toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Commission {(Number(product.commissionRate || 0) * 100).toFixed(1)}%
                </p>
                <a
                  href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=discover_buy&pageType=discover&sid=${encodeURIComponent(getOrCreateSessionId())}`}
                  onClick={() => {
                    trackBehaviorEvent({
                      eventType: "affiliate_click",
                      productId: product.id,
                      category: product.category,
                      price: Number(product.price || 0),
                      region,
                      metadata: {
                        placement: "discover_buy",
                        page: "discover"
                      }
                    });
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-micro relative z-20 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                >
                  Buy on Amazon
                </a>
              </div>
              <Link
                href={`/product/${encodeURIComponent(product.id)}`}
                aria-label={`View details for ${product.name}`}
                className="absolute inset-0 z-10 rounded-2xl"
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

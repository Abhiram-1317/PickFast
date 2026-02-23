"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, fromSlug, getApiBaseUrl, toSlug } from "../../../lib/api";

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useParams();

  const baseUrl = getApiBaseUrl();
  const selectedSlug = decodeURIComponent(params?.slug || "");

  const selectedCategory = useMemo(() => {
    if (!categories.length) {
      return fromSlug(selectedSlug);
    }

    const match = categories.find((category) => toSlug(category) === selectedSlug);
    return match || fromSlug(selectedSlug);
  }, [categories, selectedSlug]);

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
    if (!selectedCategory) {
      return;
    }

    let active = true;

    const query = new URLSearchParams({
      category: selectedCategory,
      region,
      sortBy: "score",
      order: "desc",
      limit: "24"
    });

    fetchJson(`/api/products?${query.toString()}`)
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
  }, [selectedCategory, region]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Category: {selectedCategory || "Unknown"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Category navigation page for focused product exploration.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={`nav-${category}`}
              href={`/category/${toSlug(category)}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                category === selectedCategory
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-cyan-400/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
              }`}
            >
              {category}
            </Link>
          ))}
        </div>
        <div className="mt-3">
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
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="sm:col-span-2 xl:col-span-3 text-sm text-slate-600 dark:text-slate-300">
            Loading products...
          </p>
        ) : null}
        {products.map((product) => (
          <article key={product.id} className="glass rounded-2xl p-4">
            <h2 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
              {product.name}
            </h2>
            <p className="mt-1 text-sm font-bold text-emerald-400">
              ${Number(product.price || 0).toFixed(2)}
            </p>
            <a
              href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=category_buy&pageType=category`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-micro mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
            >
              Buy
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}

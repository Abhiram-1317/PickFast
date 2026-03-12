"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api, { fromSlug } from "../../../lib/api";
import { trackBehaviorEvent, AnalyticsEvents } from "../../../lib/analytics";
import ProductCard from "../../../components/ProductCard";
import { CardSkeleton } from "../../../components/Skeletons";
import { EmptyState, ErrorState } from "../../../components/StatusStates";

export default function CategoryPage() {
  const { slug } = useParams();
  return <CategoryInner key={slug} />;
}

function CategoryInner() {
  const { slug } = useParams();
  const categoryName = fromSlug(slug);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("score");

  useEffect(() => {
    api
      .fetchCategories()
      .then((d) => setCategories(d.categories || d || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    api
      .fetchProducts({ category: categoryName, limit: 50, sortBy, order: "desc" })
      .then((data) => {
        if (active) {
          setProducts(data.products || []);
          setError("");

          trackBehaviorEvent({
            eventType: AnalyticsEvents.pageView,
            metadata: { page: "category", category: categoryName },
          });
        }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [slug, categoryName, sortBy]);

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-600">
          Home
        </Link>
        <span>/</span>
        <Link href="/discover" className="hover:text-emerald-600">
          Discover
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-600">{categoryName}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{categoryName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading products..."
              : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <option value="score">Top Rated</option>
          <option value="price">Price</option>
          <option value="rating">Rating</option>
          <option value="reviewCount">Most Reviewed</option>
        </select>
      </div>

      {/* Category sibling chips */}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const name = typeof cat === "string" ? cat : cat.name || cat.category;
            const catSlug = name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            const isActive = catSlug === slug;
            return (
              <Link
                key={name}
                href={`/category/${catSlug}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="mt-8">
        {loading && <CardSkeleton count={6} />}

        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon="📦"
            title="No products found"
            message={`We don\u2019t have any products in "${categoryName}" yet.`}
            action={{ label: "Browse All", href: "/discover" }}
          />
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} pageType="category" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api, { toSlug } from "../../lib/api";
import { trackBehaviorEvent, AnalyticsEvents } from "../../lib/analytics";
import ProductCard from "../../components/ProductCard";
import FilterBar from "../../components/FilterBar";
import { CardSkeleton } from "../../components/Skeletons";
import { EmptyState, ErrorState } from "../../components/StatusStates";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-slate-400">Loading...</div>}>
      <DiscoverInner />
    </Suspense>
  );
}

function DiscoverInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || ""
  );
  const [budget, setBudget] = useState(searchParams.get("maxPrice") || "");
  const [minRating, setMinRating] = useState(
    searchParams.get("minRating") || ""
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "epcScore"
  );
  const [region, setRegion] = useState(searchParams.get("region") || "IN");

  // Sync filters to URL
  const syncUrl = useCallback(
    (params) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const str = qs.toString();
      router.replace(`/discover${str ? `?${str}` : ""}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    api
      .fetchCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    const params = {
      sortBy,
      order: sortBy === "price" ? "asc" : "desc",
      limit: 24,
      region,
    };
    if (selectedCategory) params.category = selectedCategory;
    if (budget) params.maxPrice = budget;
    if (minRating) params.minRating = minRating;

    syncUrl({ category: selectedCategory, maxPrice: budget, minRating, sortBy, region });

    trackBehaviorEvent({
      eventType: AnalyticsEvents.filterApply,
      metadata: { page: "discover", ...params },
    });

    api
      .fetchProducts(params)
      .then((data) => {
        if (active) {
          setProducts(data.products || []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, budget, minRating, sortBy, region, syncUrl]);

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">
          {selectedCategory ? `Discover ${selectedCategory}` : "Discover Products"}
        </h1>
        <p className="text-sm text-slate-500">
          Browse and filter products ranked by performance and value.
        </p>
      </div>

      <div className="mt-6 card rounded-2xl p-4">
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          budget={budget}
          onBudgetChange={setBudget}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          sortBy={sortBy}
          onSortChange={setSortBy}
          region={region}
          onRegionChange={setRegion}
        />

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/category/${toSlug(cat)}`}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {cat}
              </Link>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {loading ? "Loading..." : `${products.length} results`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <CardSkeleton count={6} />
        ) : products.length > 0 ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              placement="discover"
              pageType="discover"
              region={region}
              showScore
            />
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              icon="🔍"
              title="No products found"
              message="Try adjusting your filters or check back soon for new products."
            />
          </div>
        )}
      </div>
    </main>
  );
}

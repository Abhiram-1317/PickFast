"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api, { fromSlug } from "../../../lib/api";
import { trackBehaviorEvent, AnalyticsEvents } from "../../../lib/analytics";
import ProductCard from "../../../components/ProductCard";
import { CardSkeleton } from "../../../components/Skeletons";
import { EmptyState, ErrorState } from "../../../components/StatusStates";

export default function IntentPage() {
  const { slug } = useParams();
  return <IntentInner key={slug} />;
}

function IntentInner() {
  const { slug } = useParams();

  const [intent, setIntent] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let active = true;

    api
      .fetchIntentDetail(slug)
      .then((data) => {
        if (active) {
          setIntent(data.intent || data);
          setProducts(data.products || data.intent?.products || []);

          trackBehaviorEvent({
            eventType: AnalyticsEvents.pageView,
            metadata: { page: "intent", slug },
          });
        }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [slug]);

  const title = intent?.title || intent?.name || fromSlug(slug);
  const description = intent?.description || intent?.metaDescription || "";

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
        <span className="font-medium text-slate-600">{title}</span>
      </nav>

      {/* Hero */}
      <div className="rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 px-6 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="text-2xl font-bold sm:text-3xl">{loading ? "Loading..." : title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            {description}
          </p>
        )}
        {intent?.keyword && (
          <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
            {intent.keyword}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading && <CardSkeleton count={6} />}

        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon="🎯"
            title="No products found"
            message="No matching products for this shopping intent yet."
            action={{ label: "Browse All", href: "/discover" }}
          />
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Recommended Products{" "}
              <span className="text-sm font-normal text-slate-400">
                ({products.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} pageType="intent" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* SEO content section */}
      {intent?.content && (
        <section className="mt-12 card rounded-2xl p-6 sm:p-8">
          <div
            className="prose prose-slate prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: intent.content }}
          />
        </section>
      )}
    </main>
  );
}

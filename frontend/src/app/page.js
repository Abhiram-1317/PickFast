import Link from "next/link";
import HomeEngagementPanel from "../components/HomeEngagementPanel";
import WeeklyPmCard from "../components/WeeklyPmCard";
import { getApiBaseUrl, toSlug } from "../lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PickFast | Discover, Compare, and Track Deals",
  description:
    "Server-rendered affiliate discovery homepage with product feed, comparison tools, recommendations, email signup, and price alerts."
};

async function getServerData() {
  const apiBaseUrl = getApiBaseUrl();

  const [productsResponse, categoriesResponse, intentsResponse] = await Promise.allSettled([
    fetch(`${apiBaseUrl}/api/products?sortBy=epcScore&order=desc&limit=12&region=US`, {
      cache: "no-store"
    }),
    fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
    fetch(`${apiBaseUrl}/api/seo/intents?region=US&limit=6`, { cache: "no-store" })
  ]);

  const products =
    productsResponse.status === "fulfilled" && productsResponse.value.ok
      ? (await productsResponse.value.json()).products || []
      : [];
  const categories =
    categoriesResponse.status === "fulfilled" && categoriesResponse.value.ok
      ? (await categoriesResponse.value.json()).categories || []
      : [];
  const intents =
    intentsResponse.status === "fulfilled" && intentsResponse.value.ok
      ? (await intentsResponse.value.json()).intents || []
      : [];

  return { products, categories, intents };
}

export default async function HomePage() {
  const apiBaseUrl = getApiBaseUrl();
  const { products, categories, intents } = await getServerData();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          SEO Optimized Homepage
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-5xl">
          Discover High-Converting Affiliate Products
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Server-rendered product feed with category navigation, recommendation paths, comparison tools,
          and email-first retention loops.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/discover" className="btn-micro rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
            Explore Products
          </Link>
          <Link href="/compare" className="btn-micro rounded-lg border border-violet-400/35 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-200">
            Compare Picks
          </Link>
          <Link href="/recommendations" className="btn-micro rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            View Recommendations
          </Link>
        </div>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Category Navigation</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={`home-cat-${category}`}
              href={`/category/${toSlug(category)}`}
              className="btn-micro rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-200"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">SEO Content Pages</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Intent-driven landing pages designed for organic search traffic.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {intents.map((intent) => (
            <Link
              key={`intent-link-${intent.slug}`}
              href={`/intent/${intent.slug}`}
              className="btn-micro rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-200"
            >
              {intent.title}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Product Feed</h2>
          <span className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            {products.length} products
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="glass rounded-2xl overflow-hidden">
              <div className="space-y-2 p-4">
                <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                  {product.category}
                </span>
                <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {product.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Rating {product.rating} • {product.reviewCount} reviews
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${Number(product.price || 0).toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  EPC {Number(product.expectedRevenuePerClick || 0).toFixed(4)} • Score {Number(product.score || 0).toFixed(2)}
                </p>
                <a
                  href={`${apiBaseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=US&placement=home_feed_buy&pageType=home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-micro inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                >
                  Buy on Amazon
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <WeeklyPmCard />

      <HomeEngagementPanel initialProducts={products} />
    </main>
  );
}

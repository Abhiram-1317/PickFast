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
  const spotlight = products[0] || null;
  const topPicks = products.slice(0, 8);
  const bestSellers = products.slice(0, 12);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
      <section className="glass rounded-2xl px-4 py-2 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-700 dark:text-slate-200">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">Today’s Affiliate Deals</span>
          <span>{products.length} curated products</span>
          <span>Fast comparison and shortlist flow</span>
          <span>Price-drop alerts and newsletter signup</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <article className="glass rounded-2xl p-5 sm:p-6 lg:col-span-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            PickFast Storefront
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-5xl">
            Shop Smart, Compare Fast, Buy Better
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Amazon-style discovery flow with ranked picks, quick category jumps, and conversion-optimized deal paths.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/discover"
              className="btn-micro rounded-lg bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
            >
              Shop All Deals
            </Link>
            <Link
              href="/recommendations"
              className="btn-micro rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-200"
            >
              See Recommended For You
            </Link>
            <Link
              href="/compare"
              className="btn-micro rounded-lg border border-violet-400/35 bg-violet-500/10 px-4 py-2 text-center text-sm font-semibold text-violet-700 dark:text-violet-200"
            >
              Compare Top Products
            </Link>
            <Link
              href="/shortlist"
              className="btn-micro rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-2 text-center text-sm font-semibold text-amber-700 dark:text-amber-200"
            >
              Build Your Wishlist
            </Link>
          </div>
        </article>

        <article className="glass rounded-2xl p-5 sm:p-6 lg:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Spotlight Deal</h2>
          {spotlight ? (
            <>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Top-ranked by EPC and score</p>
              <img
                src={spotlight.image || "/file.svg"}
                alt={spotlight.name}
                className="mt-3 h-40 w-full rounded-xl object-cover"
              />
              <span className="mt-3 inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                {spotlight.category}
              </span>
              <h3 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                {spotlight.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Rating {spotlight.rating} • {spotlight.reviewCount} reviews
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-500 dark:text-emerald-400">
                ${Number(spotlight.price || 0).toFixed(2)}
              </p>
              <a
                href={`${apiBaseUrl}/buy/${toSlug(spotlight.name)}?pid=${encodeURIComponent(spotlight.id)}&region=US&placement=home_spotlight_buy&pageType=home`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-micro mt-3 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                Buy on Amazon
              </a>
              <Link
                href={`/product/${encodeURIComponent(spotlight.id)}`}
                className="inline-flex text-xs font-semibold text-cyan-700 underline dark:text-cyan-200"
              >
                View full details
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No spotlight products available yet.</p>
          )}
        </article>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Shop by Category</h2>
          <span className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            {categories.length} categories
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={`home-cat-${category}`}
              href={`/category/${toSlug(category)}`}
              className="btn-micro rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-center text-xs font-semibold text-cyan-700 dark:text-cyan-200"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Today&apos;s Top Picks</h2>
          <Link href="/discover" className="text-xs font-semibold text-cyan-700 underline dark:text-cyan-200">
            See all deals
          </Link>
        </div>
        <div className="soft-scroll -mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max gap-3 pb-1">
            {topPicks.map((product) => (
              <article key={`top-${product.id}`} className="glass relative w-[230px] rounded-xl p-3">
                <img
                  src={product.image || "/file.svg"}
                  alt={product.name}
                  className="h-28 w-full rounded-lg object-cover"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{product.category}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {product.name}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Rating {product.rating} • {product.reviewCount} reviews
                </p>
                <p className="mt-2 text-lg font-bold text-emerald-500 dark:text-emerald-400">
                  ${Number(product.price || 0).toFixed(2)}
                </p>
                <a
                  href={`${apiBaseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=US&placement=home_top_picks_buy&pageType=home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-micro relative z-20 mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                >
                  Buy
                </a>
                <Link
                  href={`/product/${encodeURIComponent(product.id)}`}
                  aria-label={`View details for ${product.name}`}
                  className="absolute inset-0 z-10 rounded-xl"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Best Sellers in PickFast</h2>
          <span className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            {bestSellers.length} products
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bestSellers.map((product) => (
            <article key={product.id} className="glass card-micro relative overflow-hidden rounded-2xl">
              <img
                src={product.image || "/file.svg"}
                alt={product.name}
                className="h-44 w-full object-cover"
              />
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
                  href={`${apiBaseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=US&placement=home_best_seller_buy&pageType=home`}
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

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Trending Shopping Guides</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Intent-driven landing pages designed for organic traffic and high-conversion buyer journeys.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {intents.map((intent) => (
            <Link
              key={`intent-link-${intent.slug}`}
              href={`/intent/${intent.slug}`}
              className="btn-micro rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 dark:text-violet-200"
            >
              {intent.title}
            </Link>
          ))}
        </div>
      </section>

      <WeeklyPmCard />

      <HomeEngagementPanel initialProducts={products} />
    </main>
  );
}

import Link from "next/link";
import api, { getApiBaseUrl, toSlug, safeFetch } from "../lib/api";
import HomeEngagementPanel from "../components/HomeEngagementPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PickFast | Smart Product Discovery",
  description:
    "Discover, compare, and buy the best products with data-driven recommendations.",
};

async function getServerData() {
  const [productsData, categoriesData, intentsData, hotDealsData] =
    await Promise.all([
      safeFetch(
        () =>
          api.fetchProducts({
            sortBy: "epcScore",
            order: "desc",
            limit: 12,
            region: "IN",
          }),
        { products: [] }
      ),
      safeFetch(() => api.fetchCategories(), { categories: [] }),
      safeFetch(() => api.fetchSeoIntents(6), { intents: [] }),
      safeFetch(() => api.fetchHotDeals(4), { deals: [] }),
    ]);

  return {
    products: productsData?.products || [],
    categories: categoriesData?.categories || [],
    intents: intentsData?.intents || [],
    hotDeals: hotDealsData?.deals || [],
  };
}

export default async function HomePage() {
  const baseUrl = getApiBaseUrl();
  const { products, categories, intents, hotDeals } = await getServerData();
  const spotlight = products[0] || null;
  const topPicks = products.slice(0, 8);

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 py-16 text-white sm:px-12 sm:py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-40" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
            {products.length} curated products
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Find the best products,{" "}
            <span className="text-emerald-400">faster</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Data-driven product discovery with real-time scoring, price tracking,
            and side-by-side comparison tools.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
            >
              Browse Products
            </Link>
            <Link
              href="/recommendations"
              className="rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Get Recommendations
            </Link>
          </div>
        </div>
      </section>

      {/* Category shortcuts */}
      {categories.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Shop by Category
            </h2>
            <span className="text-sm text-slate-500">
              {categories.length} categories
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/category/${toSlug(category)}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 hover:shadow"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Spotlight + Hot Deals */}
      <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Spotlight */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Spotlight Deal
            </span>
            {spotlight ? (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={spotlight.image || "/file.svg"}
                    alt={spotlight.name}
                    className="h-64 w-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-3">
                  <span className="inline-block w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {spotlight.category}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {spotlight.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {Number(spotlight.rating || 0).toFixed(1)} stars &middot;{" "}
                    {Number(spotlight.reviewCount || 0).toLocaleString()} reviews
                  </p>
                  <p className="text-3xl font-bold text-emerald-600">
                    ₹{Number(spotlight.price || 0).toFixed(2)}
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={`${baseUrl}/api/buy/${toSlug(spotlight.name)}?pid=${encodeURIComponent(spotlight.id)}&region=IN&placement=home_spotlight_buy&pageType=home`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      Buy on Amazon
                    </a>
                    <Link
                      href={`/product/${encodeURIComponent(spotlight.id)}`}
                      className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No spotlight product available yet.
              </p>
            )}
          </div>
        </div>

        {/* Hot Deals */}
        <div className="card p-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
            Hot Deals
          </span>
          <div className="mt-4 space-y-4">
            {hotDeals.length > 0 ? (
              hotDeals.map((deal) => (
                <Link
                  key={deal.id || deal.productId}
                  href={`/product/${encodeURIComponent(deal.id || deal.productId)}`}
                  className="block rounded-lg border border-slate-100 p-3 transition hover:border-slate-200 hover:shadow-sm"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                    {deal.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {deal.dropPercent && (
                      <span className="font-semibold text-rose-500">
                        ▼ {Number(deal.dropPercent).toFixed(1)}% off
                      </span>
                    )}
                    <span className="text-emerald-600 font-semibold">
                      ₹{Number(deal.currentPrice || deal.price || 0).toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No hot deals right now. Check back later!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Top picks */}
      {topPicks.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-900">Top Picks</h2>
            <Link
              href="/discover"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topPicks.map((product) => (
              <article
                key={product.id}
                className="card group relative overflow-hidden rounded-2xl transition-shadow hover:shadow-lg"
              >
                <div className="aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={product.image || "/file.svg"}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1.5 p-4">
                  <span className="text-[11px] font-medium text-slate-500">
                    {product.category}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{Number(product.rating || 0).toFixed(1)} ★</span>
                    <span>&middot;</span>
                    <span>
                      {Number(product.reviewCount || 0).toLocaleString()} reviews
                    </span>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">
                    ₹{Number(product.price || 0).toFixed(2)}
                  </p>
                  <a
                    href={`${baseUrl}/api/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=IN&placement=home_top_buy&pageType=home`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-20 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Buy on Amazon
                  </a>
                </div>
                <Link
                  href={`/product/${encodeURIComponent(product.id)}`}
                  aria-label={`View ${product.name}`}
                  className="absolute inset-0 z-10"
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SEO Intent Links */}
      {intents.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Shopping Guides</h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse curated guides for specific buying needs.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {intents.map((intent) => (
              <Link
                key={intent.slug}
                href={`/intent/${intent.slug}`}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-violet-300 hover:shadow"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-violet-700">
                  {intent.title}
                </h3>
                {intent.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {intent.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Engagement Panel */}
      <section className="mt-12">
        <HomeEngagementPanel />
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-2xl bg-linear-to-r from-emerald-50 to-teal-50 px-6 py-10 text-center sm:px-12">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to find your next great product?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Use our comparison tools and personalized recommendations to make
          confident buying decisions.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/discover"
            className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
          >
            Start Browsing
          </Link>
          <Link
            href="/compare"
            className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Compare Products
          </Link>
          <Link
            href="/shortlist"
            className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Build a Shortlist
          </Link>
        </div>
      </section>
    </main>
  );
}

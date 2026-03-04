import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiBaseUrl, toSlug } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function getProductData(id) {
  const response = await fetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(id)}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load product");
  }

  return response.json();
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const payload = await getProductData(id);

  if (!payload?.product) {
    notFound();
  }

  const product = payload.product;
  const similarProducts = payload.similarProducts || [];
  const higherCommissionProducts = payload.higherCommissionProducts || [];
  const buyUrl = `${getApiBaseUrl()}/api/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=US&placement=product_detail_buy&pageType=product`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-300/80 dark:border-white/10">
            <img src={product.image || "/file.svg"} alt={product.name} className="h-full min-h-[320px] w-full object-cover" />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
              Product Details
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{product.name}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {product.brand || "Unknown brand"} • {product.category || "General"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Rating {Number(product.rating || 0).toFixed(1)} • {Number(product.reviewCount || 0).toLocaleString()} reviews
            </p>
            <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
              ${Number(product.price || 0).toFixed(2)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Commission {(Number(product.commissionRate || 0) * 100).toFixed(1)}% • EPC {Number(product.expectedRevenuePerClick || 0).toFixed(4)}
            </p>

            <div className="flex flex-wrap gap-2">
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-micro inline-flex rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"
              >
                Buy on Amazon
              </a>
              <Link
                href="/discover"
                className="btn-micro inline-flex rounded-lg border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              >
                Back to Discover
              </Link>
            </div>

            {Array.isArray(product.useCases) && product.useCases.length ? (
              <div className="pt-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Use cases</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.useCases.map((useCase) => (
                    <span
                      key={useCase}
                      className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Similar products</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {similarProducts.map((item) => (
            <article key={`similar-${item.id}`} className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <img src={item.image || "/file.svg"} alt={item.name} className="h-32 w-full rounded-lg object-cover" />
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{item.name}</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">${Number(item.price || 0).toFixed(2)}</p>
              <Link href={`/product/${encodeURIComponent(item.id)}`} className="mt-2 inline-flex text-xs font-semibold text-cyan-700 underline dark:text-cyan-200">
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Higher commission alternatives</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {higherCommissionProducts.map((item) => (
            <article key={`hc-${item.id}`} className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <img src={item.image || "/file.svg"} alt={item.name} className="h-36 w-full rounded-lg object-cover" />
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{item.name}</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                ${(Number(item.price || 0)).toFixed(2)} • {(Number(item.commissionRate || 0) * 100).toFixed(1)}%
              </p>
              <Link href={`/product/${encodeURIComponent(item.id)}`} className="mt-2 inline-flex text-xs font-semibold text-cyan-700 underline dark:text-cyan-200">
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

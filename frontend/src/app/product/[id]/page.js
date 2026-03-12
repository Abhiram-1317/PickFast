import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiBaseUrl, toSlug } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function getProductData(id) {
  const res = await fetch(
    `${getApiBaseUrl()}/api/products/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const data = await getProductData(id);
  if (!data?.product) notFound();

  const product = data.product;
  const similarProducts = data.similarProducts || [];
  const higherCommission = data.higherCommissionProducts || [];
  const baseUrl = getApiBaseUrl();
  const buyUrl = `${baseUrl}/api/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=IN&placement=product_detail_buy&pageType=product`;

  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);
  const price = Number(product.price || 0);

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-700">Home</Link>
        <span>/</span>
        <Link href="/discover" className="hover:text-slate-700">Discover</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/category/${toSlug(product.category)}`} className="hover:text-slate-700">
              {product.category}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="truncate text-slate-700">{product.name}</span>
      </nav>

      {/* Product detail */}
      <div className="mt-6 card rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={product.image || "/file.svg"}
              alt={product.name}
              className="h-full min-h-80 w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div>
              <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {product.category || "General"}
              </span>
              {product.brand && (
                <span className="ml-2 text-xs text-slate-400">{product.brand}</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating.toFixed(1)}
              </span>
              <span>{reviewCount.toLocaleString()} reviews</span>
            </div>

            <p className="text-3xl font-bold text-emerald-600">
              ₹{price.toFixed(2)}
            </p>

            {product.description && (
              <p className="text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Commission {(Number(product.commissionRate || 0) * 100).toFixed(1)}%</span>
              <span>&middot;</span>
              <span>EPC {Number(product.expectedRevenuePerClick || 0).toFixed(4)}</span>
              <span>&middot;</span>
              <span>Score {Number(product.score || 0).toFixed(1)}</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
              >
                Buy on Amazon
              </a>
              <Link
                href="/discover"
                className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Discover
              </Link>
            </div>

            {/* Use Cases */}
            {Array.isArray(product.useCases) && product.useCases.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-semibold text-slate-700">Use Cases</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.useCases.map((uc) => (
                    <span
                      key={uc}
                      className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                    >
                      {uc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-semibold text-slate-700">Specifications</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key}>
                      <dt className="text-xs text-slate-400">{key}</dt>
                      <dd className="font-medium text-slate-700">{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar products */}
      {similarProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">Similar Products</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarProducts.map((item) => (
              <Link
                key={item.id}
                href={`/product/${encodeURIComponent(item.id)}`}
                className="card group overflow-hidden rounded-xl transition hover:shadow-md"
              >
                <div className="aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={item.image || "/file.svg"}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-emerald-600">
                    ₹{Number(item.price || 0).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Higher commission */}
      {higherCommission.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">
            Higher Commission Alternatives
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {higherCommission.map((item) => (
              <Link
                key={item.id}
                href={`/product/${encodeURIComponent(item.id)}`}
                className="card group overflow-hidden rounded-xl transition hover:shadow-md"
              >
                <div className="aspect-4/3 overflow-hidden bg-slate-100">
                  <img
                    src={item.image || "/file.svg"}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    ₹{Number(item.price || 0).toFixed(2)} &middot;{" "}
                    {(Number(item.commissionRate || 0) * 100).toFixed(1)}% commission
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

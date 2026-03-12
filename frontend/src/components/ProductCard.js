import Link from "next/link";
import { getApiBaseUrl, toSlug } from "../lib/api";

export default function ProductCard({
  product,
  placement = "grid",
  pageType = "discover",
  region = "IN",
  showScore = false,
  className = "",
}) {
  const baseUrl = getApiBaseUrl();
  const price = Number(product.price || 0);
  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);

  return (
    <article
      className={`glass-card group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <div className="aspect-4/3 w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        <img
          src={product.image || "/file.svg"}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          loading="lazy"
        />
      </div>
      <div className="space-y-2.5 p-4">
        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {product.category || "General"}
        </span>
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-amber-600 ring-1 ring-inset ring-amber-200">
            <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {rating.toFixed(1)}
          </span>
          <span className="text-slate-300">·</span>
          <span>{reviewCount.toLocaleString()} reviews</span>
        </div>
        <div className="flex items-end justify-between pt-1">
          <p className="text-xl font-extrabold text-emerald-600">₹{price.toFixed(2)}</p>
          {showScore && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
              Score {Number(product.score || 0).toFixed(1)}
            </span>
          )}
        </div>
        <a
          href={`${baseUrl}/api/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=${placement}_buy&pageType=${pageType}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-20 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
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
  );
}

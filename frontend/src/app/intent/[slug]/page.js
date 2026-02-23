"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchJson, getApiBaseUrl, toSlug } from "../../../lib/api";

export default function IntentPage() {
  const [intentPayload, setIntentPayload] = useState(null);
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = useParams();
  const slug = decodeURIComponent(params?.slug || "");
  const baseUrl = getApiBaseUrl();

  useEffect(() => {
    let active = true;

    fetchJson(`/api/seo/intents/${slug}?region=${region}`)
      .then((payload) => {
        if (active) {
          setIntentPayload(payload);
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
  }, [slug, region]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {intentPayload?.intent?.title || "SEO Intent"}
          </h1>
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
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {intentPayload?.intent?.description || "High-intent SEO landing page template."}
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommended Picks</h2>
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading intent recommendations...</p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(intentPayload?.products || []).map((product) => (
            <article key={product.id} className="glass rounded-xl p-4">
              <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
                {product.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {product.category} • {(Number(product.commissionRate || 0) * 100).toFixed(1)}% commission
              </p>
              <p className="mt-2 text-lg font-bold text-emerald-400">
                ${Number(product.price || 0).toFixed(2)}
              </p>
              <a
                href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=${region}&placement=intent_buy&pageType=intent`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-micro mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                Buy on Amazon
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

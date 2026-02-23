"use client";

import { useState } from "react";
import { fetchJson } from "../../lib/api";

export default function ShortlistPage() {
  const [name, setName] = useState("My shortlist");
  const [email, setEmail] = useState("");
  const [productIds, setProductIds] = useState("");
  const [slug, setSlug] = useState("");
  const [saved, setSaved] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState("");

  async function createShortlist() {
    const ids = productIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      setError("Enter at least one product ID");
      return;
    }

    setError("");
    try {
      const payload = await fetchJson("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail: email || null,
          productIds: ids,
          region: "US"
        })
      });
      setSaved(payload.shortlist);
      setSlug(payload.shortlist.slug);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadShortlist() {
    if (!slug) {
      setError("Enter a shortlist slug");
      return;
    }

    setError("");
    try {
      const payload = await fetchJson(`/api/shortlists/${slug}`);
      setLoaded(payload);
    } catch (requestError) {
      setError(requestError.message);
      setLoaded(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Wishlist / Shortlist</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Save or load shortlists using product IDs and shareable slugs.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Shortlist name"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email (optional)"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
        </div>
        <textarea
          value={productIds}
          onChange={(event) => setProductIds(event.target.value)}
          placeholder="product-ids comma separated, e.g. head-001,head-002"
          rows={3}
          className="mt-3 w-full rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={createShortlist}
          className="btn-micro mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          Save Shortlist
        </button>
      </section>

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Load Existing Shortlist</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="shortlist slug"
            className="min-w-[220px] flex-1 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={loadShortlist}
            className="btn-micro rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Load
          </button>
        </div>
      </section>

      {saved ? (
        <p className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200">
          Saved shortlist: {saved.slug}
        </p>
      ) : null}

      {loaded ? (
        <section className="glass rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Loaded Shortlist</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {loaded.shortlist?.name} • {loaded.shortlist?.productIds?.length || 0} products
          </p>
          <ul className="mt-3 space-y-2">
            {(loaded.products || []).map((product) => (
              <li
                key={`short-${product.id}`}
                className="rounded-lg border border-slate-300/70 bg-white/70 px-3 py-2 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                {product.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </main>
  );
}

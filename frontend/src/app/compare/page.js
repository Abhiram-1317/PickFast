"use client";

import { useState } from "react";
import { fetchJson } from "../../lib/api";
import { trackBehaviorEvent } from "../../lib/analytics";

export default function ComparePage() {
  const [idsInput, setIdsInput] = useState("");
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runComparison() {
    const productIds = idsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (productIds.length < 2) {
      setError("Enter at least two product IDs separated by commas");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await fetchJson("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds })
      });

      trackBehaviorEvent({
        eventType: "compare_run",
        metadata: {
          comparedProductIds: productIds,
          comparedCount: productIds.length,
          page: "compare"
        }
      });

      setComparison(payload);
    } catch (requestError) {
      setError(requestError.message);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Comparison Template</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter product IDs to render a side-by-side comparison UI.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={idsInput}
            onChange={(event) => setIdsInput(event.target.value)}
            placeholder="head-001,head-002"
            className="min-w-[280px] flex-1 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={runComparison}
            disabled={loading}
            className="btn-micro rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {comparison ? (
        <section className="glass rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comparison Results</h2>
          <p className="mt-1 text-xs text-cyan-700 dark:text-cyan-300">
            Winners → Budget: {comparison.summary?.winners?.budget?.name} • Performance:{" "}
            {comparison.summary?.winners?.performance?.name} • Overall:{" "}
            {comparison.summary?.winners?.overall?.name}
          </p>
          <div className="soft-scroll mt-4 overflow-x-auto rounded-xl border border-slate-300/70 dark:border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100/60 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Commission</th>
                  <th className="px-3 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {(comparison.products || []).map((product) => (
                  <tr key={product.id} className="border-t border-slate-200/80 dark:border-white/10">
                    <td className="px-3 py-2">{product.name}</td>
                    <td className="px-3 py-2">${Number(product.price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{product.rating}</td>
                    <td className="px-3 py-2">{(Number(product.commissionRate || 0) * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{product.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

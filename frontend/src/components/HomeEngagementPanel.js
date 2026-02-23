"use client";

import { useMemo, useState } from "react";
import { fetchJson, getApiBaseUrl, toSlug } from "../lib/api";

export default function HomeEngagementPanel({ initialProducts = [] }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationCategory, setRecommendationCategory] = useState("");
  const [recommendationBudget, setRecommendationBudget] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertProductId, setAlertProductId] = useState(initialProducts[0]?.id || "");
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const baseUrl = getApiBaseUrl();

  const categories = useMemo(
    () => [...new Set(initialProducts.map((product) => product.category).filter(Boolean))],
    [initialProducts]
  );

  function toggleSelection(productId) {
    setSelectedIds((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId]
    );
  }

  async function runComparison() {
    if (selectedIds.length < 2) {
      setError("Select at least two products for comparison");
      return;
    }

    setError("");
    setStatusMessage("");

    try {
      const payload = await fetchJson("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds })
      });

      setComparison(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadRecommendations() {
    setError("");
    setStatusMessage("");

    try {
      const params = new URLSearchParams({ limit: "6" });
      if (recommendationCategory) {
        params.set("category", recommendationCategory);
      }
      if (recommendationBudget) {
        params.set("budget", recommendationBudget);
      }

      const payload = await fetchJson(`/api/recommendations?${params.toString()}`);
      setRecommendations(payload.recommendations || []);
      if (!(payload.recommendations || []).length) {
        setStatusMessage("No recommendations for current filters yet.");
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitNewsletterSignup(event) {
    event.preventDefault();
    setError("");
    setStatusMessage("");

    try {
      await fetchJson("/api/newsletter/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newsletterEmail,
          source: "homepage",
          metadata: { placement: "email_signup_block" }
        })
      });
      setNewsletterEmail("");
      setStatusMessage("Thanks — you’re subscribed for product updates.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitPriceAlert(event) {
    event.preventDefault();
    setError("");
    setStatusMessage("");

    if (!alertEmail || !alertProductId || !alertTargetPrice) {
      setError("Email, product, and target price are required.");
      return;
    }

    try {
      await fetchJson("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: alertEmail,
          productId: alertProductId,
          targetPrice: Number(alertTargetPrice),
          region: "US"
        })
      });
      setStatusMessage("Price alert created successfully.");
      setAlertTargetPrice("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <article className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Comparison UI</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Select products from the feed and compare top winners by budget and performance.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {initialProducts.slice(0, 8).map((product) => (
            <label
              key={`pick-${product.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300/80 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-200"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(product.id)}
                onChange={() => toggleSelection(product.id)}
              />
              {product.name}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={runComparison}
          className="btn-micro mt-3 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
        >
          Compare Selected ({selectedIds.length})
        </button>

        {comparison ? (
          <div className="mt-3 rounded-lg border border-cyan-400/35 bg-cyan-500/10 p-3 text-xs text-cyan-800 dark:text-cyan-100">
            <p>
              Winner (Overall): {comparison.summary?.winners?.overall?.name || "-"}
            </p>
            <p>
              Winner (Performance): {comparison.summary?.winners?.performance?.name || "-"}
            </p>
            <p>
              Winner (Budget): {comparison.summary?.winners?.budget?.name || "-"}
            </p>
          </div>
        ) : null}
      </article>

      <article className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recommendation UI</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Load category and budget-specific recommendations optimized for affiliate revenue.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={recommendationCategory}
            onChange={(event) => setRecommendationCategory(event.target.value)}
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={`category-opt-${category}`} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={recommendationBudget}
            onChange={(event) => setRecommendationBudget(event.target.value)}
            placeholder="Budget"
            className="w-28 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-xs text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={loadRecommendations}
            className="btn-micro rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
          >
            Get Recommendations
          </button>
        </div>

        {recommendations.length ? (
          <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200">
            {recommendations.map((product) => (
              <li key={`rec-${product.id}`} className="rounded-lg border border-slate-300/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5">
                <div className="font-semibold">{product.name}</div>
                <div>
                  ${Number(product.price || 0).toFixed(2)} • {(Number(product.commissionRate || 0) * 100).toFixed(1)}% commission
                </div>
                <a
                  href={`${baseUrl}/buy/${toSlug(product.name)}?pid=${encodeURIComponent(product.id)}&region=US&placement=home_recommendation_buy&pageType=home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex text-cyan-700 underline dark:text-cyan-200"
                >
                  View offer
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <article className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Email Signup</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Join updates for new high-EPC products and deal alerts.
        </p>
        <form onSubmit={submitNewsletterSignup} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            value={newsletterEmail}
            onChange={(event) => setNewsletterEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="min-w-[220px] flex-1 rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="submit"
            className="btn-micro rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Sign Up
          </button>
        </form>
      </article>

      <article className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Price Alerts</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Set target prices and get notified when products drop.
        </p>
        <form onSubmit={submitPriceAlert} className="mt-3 grid grid-cols-1 gap-2">
          <input
            type="email"
            value={alertEmail}
            onChange={(event) => setAlertEmail(event.target.value)}
            required
            placeholder="alert email"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <select
            value={alertProductId}
            onChange={(event) => setAlertProductId(event.target.value)}
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          >
            {initialProducts.map((product) => (
              <option key={`alert-${product.id}`} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={alertTargetPrice}
            onChange={(event) => setAlertTargetPrice(event.target.value)}
            required
            min="1"
            step="0.01"
            placeholder="Target price"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="submit"
            className="btn-micro rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Create Alert
          </button>
        </form>
      </article>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 lg:col-span-2">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200 lg:col-span-2">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

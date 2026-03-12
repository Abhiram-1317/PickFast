"use client";

import { useState } from "react";
import Link from "next/link";
import { trackBehaviorEvent, AnalyticsEvents } from "../lib/analytics";

export default function HomeEngagementPanel() {
  // Compare quick-pick
  const [compareIds, setCompareIds] = useState("");

  // Newsletter
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleCompare() {
    const ids = compareIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length >= 2) {
      trackBehaviorEvent({
        eventType: AnalyticsEvents.compareAdd,
        metadata: { ids, source: "home_panel" },
      });
      window.location.href = `/compare?ids=${ids.join(",")}`;
    }
  }

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    trackBehaviorEvent({
      eventType: AnalyticsEvents.behavior,
      metadata: { action: "newsletter_signup", email: "redacted" },
    });
    setSubscribed(true);
    setEmail("");
  }

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Quick Compare */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h3 className="text-sm font-bold text-slate-800">Quick Compare</h3>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Enter product IDs to see a side-by-side comparison.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={compareIds}
            onChange={(e) => setCompareIds(e.target.value)}
            placeholder="head-001, head-002"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="button"
            onClick={handleCompare}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            Go
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-sm font-bold text-slate-800">Personalized Picks</h3>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Get AI-powered recommendations based on your preferences.
        </p>
        <Link
          href="/recommendations"
          className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          View Recommendations
        </Link>
      </div>

      {/* Newsletter */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📬</span>
          <h3 className="text-sm font-bold text-slate-800">Stay Updated</h3>
        </div>
        {subscribed ? (
          <p className="mt-3 text-xs font-medium text-emerald-600">
            Thanks for subscribing! We&apos;ll keep you posted.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-500">
              Get price alerts and weekly curated picks.
            </p>
            <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                Subscribe
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

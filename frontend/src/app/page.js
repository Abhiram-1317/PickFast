"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("dark");
  const [region, setRegion] = useState("US");
  const [sortBy, setSortBy] = useState("epcScore");
  const [seoIntents, setSeoIntents] = useState([]);
  const [shortlistName, setShortlistName] = useState("My shortlist");
  const [shortlistEmail, setShortlistEmail] = useState("");
  const [shortlistShareUrl, setShortlistShareUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [ctaAssignment, setCtaAssignment] = useState(null);
  const [funnelSummary, setFunnelSummary] = useState(null);
  const [experimentSummary, setExperimentSummary] = useState(null);
  const [experimentConfig, setExperimentConfig] = useState(null);
  const [lifecycleActionLoading, setLifecycleActionLoading] = useState(false);
  const [lifecycleActionError, setLifecycleActionError] = useState("");
  const [guardrailForm, setGuardrailForm] = useState({
    minSampleSize: "",
    minRuntimeDays: "",
    maxRuntimeDays: ""
  });
  const [guardrailSaving, setGuardrailSaving] = useState(false);
  const [guardrailError, setGuardrailError] = useState("");
  const [revenueSimulation, setRevenueSimulation] = useState(null);
  const [simulationInputs, setSimulationInputs] = useState({
    lookbackDays: "30",
    horizonDays: "30",
    clickGrowthRate: "0.08"
  });
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  async function fetchJson(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, options);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }

    return payload;
  }

  async function loadCategories() {
    const payload = await fetchJson("/api/categories");
    setCategories(payload.categories || []);
  }

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        sortBy,
        order: "desc",
        limit: "12",
        region
      });

      if (selectedCategory) {
        params.set("category", selectedCategory);
      }
      if (budget) {
        params.set("maxPrice", budget);
      }

      const payload = await fetchJson(`/api/products?${params.toString()}`);
      setProducts(payload.products || []);
      setSelectedIds([]);
      setComparison(null);
      setSimilarProducts([]);
      if (sessionId) {
        await trackBehaviorEvent({
          eventType: "catalog_load",
          category: selectedCategory || null,
          price: budget ? Number(budget) : null,
          metadata: {
            sortBy,
            resultCount: payload.products?.length || 0
          }
        });
        await loadPersonalizedRecommendations();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSeoIntents() {
    try {
      const payload = await fetchJson(`/api/seo/intents?region=${region}&limit=8`);
      setSeoIntents(payload.intents || []);
    } catch (intentError) {
      console.error("Intent load failed", intentError);
    }
  }

  async function trackBehaviorEvent({ eventType, product, category, price, metadata }) {
    if (!sessionId) {
      return;
    }

    try {
      await fetchJson("/api/behavior/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          eventType,
          productId: product?.id || null,
          category: category || product?.category || null,
          price: price !== undefined && price !== null ? price : product?.price,
          region,
          metadata: metadata || {}
        })
      });
    } catch (behaviorError) {
      console.error("Behavior tracking failed", behaviorError);
    }
  }

  async function loadPersonalizedRecommendations() {
    if (!sessionId) {
      return;
    }

    try {
      const payload = await fetchJson(
        `/api/recommendations/personalized?sessionId=${sessionId}&limit=6&region=${region}`
      );
      setProfileSummary(payload.profile || null);
      setPersonalizedRecommendations(payload.recommendations || []);
    } catch (personalizationError) {
      console.error("Personalized recommendations failed", personalizationError);
    }
  }

  async function loadCtaAssignment(activeSessionId) {
    if (!activeSessionId) {
      return;
    }

    try {
      const payload = await fetchJson(
        `/api/experiments/hero_cta_v1/assignment?sessionId=${encodeURIComponent(activeSessionId)}`
      );
      setCtaAssignment(payload.assignment || null);
    } catch (assignmentError) {
      console.error("Experiment assignment failed", assignmentError);
    }
  }

  async function trackExperimentEvent(eventType, metadata = {}) {
    if (!sessionId || !ctaAssignment?.variantKey) {
      return;
    }

    try {
      await fetchJson("/api/experiments/hero_cta_v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          variantKey: ctaAssignment.variantKey,
          eventType,
          metadata
        })
      });
    } catch (eventError) {
      console.error("Experiment event tracking failed", eventError);
    }
  }

  async function loadFunnelDashboard() {
    try {
      const [funnel, experiment] = await Promise.all([
        fetchJson("/api/admin/funnel/summary?days=30"),
        fetchJson("/api/admin/experiments/hero_cta_v1/summary?days=30")
      ]);

      setFunnelSummary(funnel || null);
      setExperimentSummary(experiment || null);
    } catch (dashboardError) {
      console.error("Funnel dashboard load failed", dashboardError);
    }
  }

  async function loadExperimentConfig() {
    try {
      const payload = await fetchJson("/api/admin/experiments/hero_cta_v1/config");
      setExperimentConfig(payload.experiment || null);
      setGuardrailForm({
        minSampleSize: String(payload.experiment?.minSampleSize ?? ""),
        minRuntimeDays: String(payload.experiment?.minRuntimeDays ?? ""),
        maxRuntimeDays: String(payload.experiment?.maxRuntimeDays ?? "")
      });
      setLifecycleActionError("");
      setGuardrailError("");
    } catch (configError) {
      console.error("Experiment config load failed", configError);
      setLifecycleActionError(configError.message);
    }
  }

  async function setLifecycleState(nextState) {
    setLifecycleActionLoading(true);
    setLifecycleActionError("");

    try {
      await fetchJson("/api/admin/experiments/hero_cta_v1/lifecycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lifecycleState: nextState,
          reason: `UI lifecycle action -> ${nextState}`
        })
      });

      await Promise.all([loadExperimentConfig(), loadFunnelDashboard()]);
    } catch (lifecycleError) {
      setLifecycleActionError(lifecycleError.message);
    } finally {
      setLifecycleActionLoading(false);
    }
  }

  async function saveGuardrails() {
    const minSampleSize = Number(guardrailForm.minSampleSize);
    const minRuntimeDays = Number(guardrailForm.minRuntimeDays);
    const maxRuntimeDays = Number(guardrailForm.maxRuntimeDays);

    if (
      [minSampleSize, minRuntimeDays, maxRuntimeDays].some(
        (value) => Number.isNaN(value) || value < 0
      )
    ) {
      setGuardrailError("Guardrail values must be valid non-negative numbers");
      return;
    }

    if (maxRuntimeDays < minRuntimeDays) {
      setGuardrailError("maxRuntimeDays must be greater than or equal to minRuntimeDays");
      return;
    }

    setGuardrailSaving(true);
    setGuardrailError("");

    try {
      await fetchJson("/api/admin/experiments/hero_cta_v1/guardrails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minSampleSize,
          minRuntimeDays,
          maxRuntimeDays
        })
      });

      await Promise.all([loadExperimentConfig(), loadFunnelDashboard()]);
    } catch (saveError) {
      setGuardrailError(saveError.message);
    } finally {
      setGuardrailSaving(false);
    }
  }

  async function loadRevenueSimulation(overrides = null) {
    const params = {
      lookbackDays: overrides?.lookbackDays ?? simulationInputs.lookbackDays,
      horizonDays: overrides?.horizonDays ?? simulationInputs.horizonDays,
      clickGrowthRate: overrides?.clickGrowthRate ?? simulationInputs.clickGrowthRate
    };

    const lookbackDays = Number(params.lookbackDays);
    const horizonDays = Number(params.horizonDays);
    const clickGrowthRate = Number(params.clickGrowthRate);

    if (
      Number.isNaN(lookbackDays) ||
      Number.isNaN(horizonDays) ||
      Number.isNaN(clickGrowthRate) ||
      lookbackDays <= 0 ||
      horizonDays <= 0
    ) {
      setSimulationError("Use valid numbers (lookback/horizon > 0)");
      return;
    }

    setSimulationLoading(true);
    setSimulationError("");

    try {
      const query = new URLSearchParams({
        lookbackDays: String(lookbackDays),
        horizonDays: String(horizonDays),
        clickGrowthRate: String(clickGrowthRate)
      });

      const payload = await fetchJson(`/api/admin/revenue/simulation?${query.toString()}`);
      setRevenueSimulation(payload || null);
    } catch (simError) {
      setSimulationError(simError.message);
    } finally {
      setSimulationLoading(false);
    }
  }

  async function handleHeroCtaClick() {
    await trackExperimentEvent("cta_click", { placement: "hero_cta" });
    await loadProducts();
  }

  async function runComparison() {
    if (selectedIds.length < 2) {
      setError("Select at least 2 products to compare");
      return;
    }

    setError("");
    const payload = await fetchJson("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: selectedIds })
    });

    setComparison(payload);
    await trackBehaviorEvent({
      eventType: "compare_run",
      metadata: { productIds: selectedIds }
    });
  }

  async function loadSimilar(productId) {
    setError("");
    const payload = await fetchJson(`/api/products/${productId}/similar?limit=4&region=${region}`);
    setSimilarProducts(payload.similarProducts || []);
    const product = products.find((item) => item.id === productId);
    await trackBehaviorEvent({
      eventType: "similar_open",
      product,
      metadata: { similarCount: payload.similarProducts?.length || 0 }
    });
  }

  async function trackAffiliateClick({ productId, placement, affiliateUrl, pageType }) {
    try {
      await fetch(`${apiBaseUrl}/api/track/click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        keepalive: true,
        body: JSON.stringify({
          productId,
          pageType,
          placement,
          region,
          sourceUrl: window.location.href,
          referrer: document.referrer || null,
          deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
          affiliateUrl
        })
      });
    } catch (trackingError) {
      console.error("Click tracking failed", trackingError);
    }
  }

  async function handleAffiliateClick({ product, placement, pageType }) {
    const finalUrl = product.affiliateUrl || product.amazonUrl;
    await trackAffiliateClick({
      productId: product.id,
      placement,
      pageType,
      affiliateUrl: finalUrl
    });
    await trackBehaviorEvent({
      eventType: "affiliate_click",
      product,
      metadata: { placement, pageType }
    });
    await trackExperimentEvent("affiliate_click", {
      placement,
      pageType,
      productId: product.id
    });
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }

  async function saveShortlist() {
    if (selectedIds.length === 0) {
      setError("Select products first to save a shortlist");
      return;
    }

    setError("");
    const payload = await fetchJson("/api/shortlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: shortlistName,
        contactEmail: shortlistEmail || null,
        productIds: selectedIds,
        region
      })
    });

    const shareUrl = `${window.location.origin}?shortlist=${payload.shortlist.slug}`;
    setShortlistShareUrl(shareUrl);
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    await trackBehaviorEvent({
      eventType: "shortlist_save",
      metadata: { shortlistSlug: payload.shortlist.slug, count: selectedIds.length }
    });
  }

  async function loadShortlistFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const shortlistSlug = params.get("shortlist");
    if (!shortlistSlug) {
      return;
    }

    try {
      const payload = await fetchJson(`/api/shortlists/${shortlistSlug}?region=${region}`);
      setShortlistName(payload.shortlist.name || "Shared shortlist");
      setSelectedIds(payload.shortlist.productIds || []);
      setProducts(payload.products || []);
      setShortlistShareUrl(`${window.location.origin}?shortlist=${payload.shortlist.slug}`);
    } catch (shortlistError) {
      setError(shortlistError.message);
    }
  }

  async function subscribePriceAlert(product) {
    const email = window.prompt("Enter your email for price drop alert:");
    if (!email) {
      return;
    }

    const targetInput = window.prompt(
      `Target price for ${product.name} (current $${Number(product.price).toFixed(2)}):`,
      String(product.price)
    );
    if (!targetInput) {
      return;
    }

    const targetPrice = Number(targetInput);
    if (Number.isNaN(targetPrice) || targetPrice <= 0) {
      setError("Invalid target price");
      return;
    }

    await fetchJson("/api/alerts/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        productId: product.id,
        targetPrice,
        region
      })
    });

    setError(`Alert set for ${product.name} at $${targetPrice.toFixed(2)}`);
  }

  function applyIntent(intent) {
    setSelectedCategory(intent.filters?.category || "");
    setBudget(intent.filters?.maxPrice ? String(intent.filters.maxPrice) : "");
    setSortBy(intent.filters?.sortBy || "epcScore");
    setTimeout(() => {
      loadProducts();
    }, 0);
    trackBehaviorEvent({
      eventType: "intent_apply",
      category: intent.category,
      metadata: { slug: intent.slug }
    });
  }

  function toggleSelection(productId) {
    setSelectedIds((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId]
    );
  }

  function applyTheme(nextTheme) {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
    localStorage.setItem("pickfast-theme", nextTheme);
    setTheme(nextTheme);
  }

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadSeoIntents();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("pickfast-session-id");
    if (stored) {
      setSessionId(stored);
      return;
    }

    const created = `sess-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem("pickfast-session-id", created);
    setSessionId(created);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    loadCtaAssignment(sessionId);
    loadFunnelDashboard();
    loadExperimentConfig();
    loadRevenueSimulation();
  }, [sessionId]);

  useEffect(() => {
    if (!ctaAssignment?.variantKey) {
      return;
    }

    trackExperimentEvent("impression", { placement: "hero_cta" });
  }, [ctaAssignment?.variantKey]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("pickfast-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      applyTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const savedRegion = localStorage.getItem("pickfast-region");
    if (savedRegion) {
      setRegion(savedRegion);
      return;
    }

    const locale = (navigator.language || "en-US").toUpperCase();
    if (locale.includes("-IN")) {
      setRegion("IN");
      return;
    }
    if (locale.includes("-GB")) {
      setRegion("UK");
      return;
    }
    if (locale.includes("-CA")) {
      setRegion("CA");
      return;
    }
    setRegion("US");
  }, []);

  useEffect(() => {
    localStorage.setItem("pickfast-region", region);
    loadProducts();
    loadSeoIntents();
    loadPersonalizedRecommendations();
  }, [region, sortBy]);

  useEffect(() => {
    loadShortlistFromUrl();
  }, [region]);

  useEffect(() => {
    const revealElements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealElements.forEach((element) => {
      element.classList.add("reveal-on-scroll");
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [products, comparison, similarProducts]);

  const winnerText = comparison
    ? `Budget: ${comparison.summary.winners.budget.name} • Performance: ${comparison.summary.winners.performance.name} • Overall: ${comparison.summary.winners.overall.name}`
    : "";

  const revenueBase = Number(revenueSimulation?.totals?.projectedRevenue?.base || 0);
  const revenueConservative = Number(
    revenueSimulation?.totals?.projectedRevenue?.conservative || 0
  );
  const revenueAggressive = Number(revenueSimulation?.totals?.projectedRevenue?.aggressive || 0);
  const revenueBarMax = Math.max(revenueConservative, revenueBase, revenueAggressive, 1);

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const lifecycleState = experimentConfig?.lifecycleState || "unknown";
  const lifecycleBadgeClass =
    {
      draft: "border-slate-400/40 bg-slate-500/15 text-slate-700 dark:text-slate-200",
      running: "border-cyan-400/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
      learning: "border-violet-400/40 bg-violet-500/15 text-violet-700 dark:text-violet-200",
      winner: "border-emerald-400/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
      archived: "border-amber-400/45 bg-amber-500/15 text-amber-700 dark:text-amber-200"
    }[lifecycleState] || "border-slate-300/60 bg-white/10 text-slate-700 dark:text-slate-200";

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute -left-24 top-8 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="animate-float-slow delay-300 absolute right-0 top-40 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="animate-float-slow delay-200 absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section data-reveal className="glass glow-ring animate-fade-in-up overflow-hidden rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600/90 dark:text-cyan-300/90">
                Affiliate Intelligence Platform
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                PickFast Growth Engine
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Modern product discovery with automatic ranking, conversion-focused comparison, and
                smart similar recommendations.
              </p>
              <button
                type="button"
                onClick={handleHeroCtaClick}
                className="btn-micro hover-lift mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"
              >
                {ctaAssignment?.variantConfig?.ctaText || "Load Products"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-slate-100"
              >
                <option value="US">🇺🇸 US</option>
                <option value="UK">🇬🇧 UK</option>
                <option value="IN">🇮🇳 IN</option>
                <option value="CA">🇨🇦 CA</option>
              </select>
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-micro rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-slate-100"
              >
                {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>
              <div className="animate-glow-pulse rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-100">
                <p className="font-semibold">Realtime API Driven</p>
                <p className="text-cyan-700/80 dark:text-cyan-200/80">Next.js + Express + SQLite</p>
              </div>
            </div>
          </div>
        </section>

        <section data-reveal className="glass animate-fade-in-up delay-100 rounded-2xl p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Find Products</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Filter your catalog and compare top opportunities instantly.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Budget (e.g. 300)"
              className="w-44 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-cyan-300/60 transition placeholder:text-slate-400 focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
            />
            <button
              className="btn-micro hover-lift rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={loadProducts}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load Products"}
            </button>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="epcScore">Sort: EPC Score</option>
              <option value="expectedRevenuePerClick">Sort: Revenue/Click</option>
              <option value="score">Sort: Overall Score</option>
              <option value="estimatedCommissionValue">Sort: Commission Potential</option>
            </select>
            <button
              className="btn-micro hover-lift rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-700 dark:text-violet-100"
              onClick={runComparison}
            >
              Compare Selected ({selectedCount})
            </button>
            <input
              value={shortlistName}
              onChange={(event) => setShortlistName(event.target.value)}
              placeholder="Shortlist name"
              className="w-44 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-cyan-300/60 transition placeholder:text-slate-400 focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
            />
            <input
              value={shortlistEmail}
              onChange={(event) => setShortlistEmail(event.target.value)}
              placeholder="Email (for reminder)"
              className="w-52 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-cyan-300/60 transition placeholder:text-slate-400 focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
            />
            <button
              className="btn-micro hover-lift rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-200"
              onClick={saveShortlist}
            >
              Save Shortlist
            </button>
          </div>
          {shortlistShareUrl ? (
            <p className="mt-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
              Shareable shortlist link (copied): {shortlistShareUrl}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </section>

        {seoIntents.length ? (
          <section data-reveal className="glass animate-fade-in-up delay-150 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">SEO Intent Pages</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              High-intent presets for ranking and landing page targeting.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {seoIntents.map((intent) => (
                <button
                  key={intent.slug}
                  type="button"
                  onClick={() => applyIntent(intent)}
                  className="btn-micro rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-200"
                >
                  {intent.title}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {personalizedRecommendations.length ? (
          <section data-reveal className="glass animate-fade-in-up delay-175 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Personalized For This Session
            </h2>
            {profileSummary ? (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Confidence: {(Number(profileSummary.confidenceScore || 0) * 100).toFixed(0)}% • Top
                categories: {(profileSummary.topCategories || []).map((item) => item.name).join(", ") || "N/A"}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personalizedRecommendations.map((product) => (
                <article
                  key={`personalized-${product.id}`}
                  className="card-micro rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Personalized score: {Number(product.personalizedScore || 0).toFixed(2)}
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-500 dark:text-emerald-300">
                    ${Number(product.price).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleAffiliateClick({
                        product,
                        placement: "personalized_card_buy",
                        pageType: "personalized"
                      })
                    }
                    className="btn-micro mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                  >
                    Buy from Personalized
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {funnelSummary ? (
          <section data-reveal className="glass animate-fade-in-up delay-190 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Conversion Funnel Dashboard (30d)
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-600 dark:text-slate-300">Discovery</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {funnelSummary.stages?.discoverySessions || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-600 dark:text-slate-300">Engaged</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {funnelSummary.stages?.engagedSessions || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-600 dark:text-slate-300">Shortlist</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {funnelSummary.stages?.shortlistSessions || 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-600 dark:text-slate-300">Affiliate Click</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {funnelSummary.stages?.affiliateClickSessions || 0}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              Discovery→Click: {((Number(funnelSummary.rates?.discoveryToAffiliateClick || 0)) * 100).toFixed(1)}%
              {" • "}
              Engaged→Shortlist: {((Number(funnelSummary.rates?.engagedToShortlist || 0)) * 100).toFixed(1)}%
              {" • "}
              Total affiliate clicks: {funnelSummary.totals?.affiliateClicks || 0}
            </p>
            {experimentSummary?.variants?.length ? (
              <div className="mt-4 soft-scroll overflow-x-auto rounded-xl border border-slate-300/70 dark:border-white/10">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-100/60 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2">Impressions</th>
                      <th className="px-3 py-2">CTA Clicks</th>
                      <th className="px-3 py-2">Conversions</th>
                      <th className="px-3 py-2">CTR</th>
                      <th className="px-3 py-2">Conv/Impr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 text-slate-700 dark:divide-white/10 dark:text-slate-200">
                    {experimentSummary.variants.map((variant) => (
                      <tr key={variant.variantKey}>
                        <td className="px-3 py-2">{variant.variantName}</td>
                        <td className="px-3 py-2">{variant.impressions}</td>
                        <td className="px-3 py-2">{variant.ctaClicks}</td>
                        <td className="px-3 py-2">{variant.conversions}</td>
                        <td className="px-3 py-2">{(Number(variant.ctr || 0) * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2">{(Number(variant.conversionRate || 0) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-300/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Admin Lifecycle Controls
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Current lifecycle state for hero_cta_v1
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${lifecycleBadgeClass}`}
                >
                  {lifecycleState}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["draft", "running", "learning", "winner", "archived"].map((state) => (
                  <button
                    key={state}
                    type="button"
                    disabled={lifecycleActionLoading || lifecycleState === state}
                    onClick={() => setLifecycleState(state)}
                    className="btn-micro rounded-lg border border-slate-300/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
                  >
                    Set {state}
                  </button>
                ))}
              </div>

              {lifecycleActionError ? (
                <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
                  {lifecycleActionError}
                </p>
              ) : null}

              <div className="mt-4 border-t border-slate-300/70 pt-3 dark:border-white/10">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Guardrails
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                    Min Sample
                    <input
                      type="number"
                      min="0"
                      value={guardrailForm.minSampleSize}
                      onChange={(event) =>
                        setGuardrailForm((prev) => ({ ...prev, minSampleSize: event.target.value }))
                      }
                      className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                    Min Runtime (d)
                    <input
                      type="number"
                      min="0"
                      value={guardrailForm.minRuntimeDays}
                      onChange={(event) =>
                        setGuardrailForm((prev) => ({ ...prev, minRuntimeDays: event.target.value }))
                      }
                      className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                    Max Runtime (d)
                    <input
                      type="number"
                      min="0"
                      value={guardrailForm.maxRuntimeDays}
                      onChange={(event) =>
                        setGuardrailForm((prev) => ({ ...prev, maxRuntimeDays: event.target.value }))
                      }
                      className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveGuardrails}
                    disabled={guardrailSaving}
                    className="btn-micro rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-200"
                  >
                    {guardrailSaving ? "Saving..." : "Save Guardrails"}
                  </button>
                </div>
                {guardrailError ? (
                  <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
                    {guardrailError}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section data-reveal className="glass animate-fade-in-up delay-195 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Revenue Simulation
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Forecast affiliate revenue using clicks + EPC model.
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Source: {revenueSimulation?.model?.source || "-"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              Lookback (d)
              <input
                type="number"
                min="1"
                value={simulationInputs.lookbackDays}
                onChange={(event) =>
                  setSimulationInputs((prev) => ({ ...prev, lookbackDays: event.target.value }))
                }
                className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              Horizon (d)
              <input
                type="number"
                min="1"
                value={simulationInputs.horizonDays}
                onChange={(event) =>
                  setSimulationInputs((prev) => ({ ...prev, horizonDays: event.target.value }))
                }
                className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              Click Growth
              <input
                type="number"
                step="0.01"
                value={simulationInputs.clickGrowthRate}
                onChange={(event) =>
                  setSimulationInputs((prev) => ({ ...prev, clickGrowthRate: event.target.value }))
                }
                className="w-28 rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none ring-cyan-300/60 transition focus:ring dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={() => loadRevenueSimulation()}
              disabled={simulationLoading}
              className="btn-micro rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-200"
            >
              {simulationLoading ? "Running..." : "Run Simulation"}
            </button>
          </div>

          {simulationError ? (
            <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
              {simulationError}
            </p>
          ) : null}

          {revenueSimulation ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[{ label: "Conservative", value: revenueConservative, tone: "bg-amber-400" }, { label: "Base", value: revenueBase, tone: "bg-cyan-400" }, { label: "Aggressive", value: revenueAggressive, tone: "bg-emerald-400" }].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-300">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.value)}
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200/80 dark:bg-white/10">
                      <div
                        className={`h-2 rounded-full ${item.tone}`}
                        style={{ width: `${Math.max((item.value / revenueBarMax) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Top segments by projected base revenue
                </p>
                <div className="mt-2 space-y-1">
                  {(revenueSimulation.topCategories || []).slice(0, 3).map((item) => (
                    <p
                      key={`${item.region}-${item.category}`}
                      className="text-xs text-slate-700 dark:text-slate-200"
                    >
                      {item.category} ({item.region}) • {formatCurrency(item.projectedRevenueBase)} •
                      {" "}
                      {Number(item.projectedClicks || 0).toFixed(1)} projected clicks
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section data-reveal className="animate-fade-in-up delay-200 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Top Opportunities</h2>
            <span className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
              {products.length} products
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="glass h-80 animate-pulse rounded-2xl border border-white/10"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => (
                <article
                  key={product.id}
                  data-reveal
                  className="glass card-micro hover-lift animate-fade-in-up overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-44 w-full object-cover transition duration-500 hover:scale-105"
                    />
                  ) : null}
                  <div className="space-y-3 p-4">
                    <span className="inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                      {product.category}
                    </span>
                    <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {product.brand} • Rating {product.rating} ({product.reviewCount} reviews)
                    </div>
                    <p className="text-2xl font-bold text-emerald-300">
                      ${Number(product.price).toFixed(2)}
                      <span className="ml-2 text-sm font-medium text-amber-200">
                        Score {product.score}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Commission: {(Number(product.commissionRate) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-cyan-700 dark:text-cyan-300">
                      EPC: {Number(product.expectedRevenuePerClick || 0).toFixed(4)} • EPC Score {" "}
                      {Number(product.epcScore || 0).toFixed(2)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300/80 bg-white/70 px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                          className="h-3.5 w-3.5 rounded border-slate-400 bg-slate-900"
                        />
                        Compare
                      </label>
                      <button
                        onClick={() => loadSimilar(product.id)}
                        className="btn-micro hover-lift rounded-lg border border-violet-400/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-100"
                      >
                        Similar
                      </button>
                      <button
                        type="button"
                        onClick={() => subscribePriceAlert(product)}
                        className="btn-micro hover-lift rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-200"
                      >
                        Price Alert
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleAffiliateClick({
                            product,
                            placement: "product_card_buy",
                            pageType: "catalog"
                          })
                        }
                        className="btn-micro hover-lift rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                      >
                        Buy on Amazon
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {comparison ? (
          <section data-reveal className="glass animate-fade-in-up delay-300 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Comparison Engine</h2>
            <p className="mt-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-700 dark:text-cyan-100">
              {winnerText}
            </p>
            <div className="soft-scroll mt-4 overflow-x-auto rounded-xl border border-slate-300/70 dark:border-white/10">
              <table className="min-w-full text-left">
                <thead className="bg-slate-100/60 text-xs uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Commission %</th>
                    <th className="px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm text-slate-700 dark:divide-white/10 dark:text-slate-200">
                  {comparison.products.map((product) => (
                    <tr key={product.id} className="row-micro transition-colors hover:bg-slate-100/70 dark:hover:bg-white/5">
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">${Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-3">{product.rating}</td>
                      <td className="px-4 py-3">{(Number(product.commissionRate) * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3">{product.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {similarProducts.length ? (
          <section data-reveal className="glass animate-fade-in-up delay-400 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Similar Recommendations</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similarProducts.map((product, index) => (
                <article
                  key={product.id}
                  data-reveal
                  className="card-micro hover-lift rounded-xl border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                  style={{ animationDelay: `${Math.min(index * 80, 320)}ms` }}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Similarity score: {product.similarityScore}</p>
                  <p className="mt-2 text-lg font-bold text-emerald-300">${Number(product.price).toFixed(2)}</p>
                  <button
                    type="button"
                    onClick={() =>
                      handleAffiliateClick({
                        product,
                        placement: "similar_card_view",
                        pageType: "similar"
                      })
                    }
                    className="btn-micro mt-2 inline-flex rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950"
                  >
                    View on Amazon
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

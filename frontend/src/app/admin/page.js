"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../../lib/api";

const ADMIN_TOKEN_STORAGE = "pickfast_admin_token";
const ADMIN_USERNAME_STORAGE = "pickfast_admin_username";

async function fetchAdminJson(path, authToken) {
  const headers = {};
  if (authToken) {
    headers["x-admin-token"] = authToken;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

const EMPTY_DASHBOARD = {
  dbOverview: null,
  weeklyPm: null,
  funnel: null,
  revenue: null,
  syncLogs: null,
  newsletter: null,
  alerts: null,
  reminders: null
};

export default function AdminDashboardPage() {
  const mountedRef = useRef(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(EMPTY_DASHBOARD);

  const stats = useMemo(
    () => ({
      syncLogCount: data.syncLogs?.logs?.length || 0,
      newsletterCount: data.newsletter?.signups?.length || 0,
      alertsCount: data.alerts?.alerts?.length || 0,
      remindersCount: data.reminders?.notifications?.length || 0,
      topCategoryRevenue: data.revenue?.topCategories?.slice(0, 5) || [],
      topPlacements: data.clickSummary?.topPlacements?.slice(0, 6) || []
    }),
    [data]
  );

  const loadDashboard = useCallback(async (token) => {
    try {
      const [
        dbOverview,
        weeklyPm,
        funnel,
        revenue,
        clickSummary,
        syncLogs,
        newsletter,
        alerts,
        reminders
      ] = await Promise.all([
          fetchAdminJson("/api/admin/db-overview", token),
          fetchAdminJson(
            "/api/admin/weekly-pm-report?windowDays=7&experimentKey=hero_cta_v1",
            token
          ),
          fetchAdminJson("/api/admin/funnel/summary?days=30", token),
          fetchAdminJson(
            "/api/admin/revenue/simulation?lookbackDays=30&horizonDays=30",
            token
          ),
          fetchAdminJson("/api/admin/clicks/summary?days=30", token),
          fetchAdminJson("/api/admin/sync/logs?limit=5", token),
          fetchAdminJson("/api/admin/newsletter/signups?limit=10", token),
          fetchAdminJson("/api/admin/alerts/subscriptions?limit=10", token),
          fetchAdminJson("/api/admin/reminders/notifications?limit=10", token)
        ]);

      if (!mountedRef.current) {
        return;
      }

      setData({
        dbOverview,
        weeklyPm,
        funnel,
        revenue,
        clickSummary,
        syncLogs,
        newsletter,
        alerts,
        reminders
      });
      setError("");
    } catch (requestError) {
      if (!mountedRef.current) {
        return;
      }
      setError(requestError.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  function refreshDashboard() {
    if (!isUnlocked) {
      return;
    }

    setError("");
    setLoading(true);
    loadDashboard(authToken);
  }

  async function handleLogin(event) {
    event.preventDefault();

    const normalizedUsername = String(username || "").trim();
    const normalizedPassword = String(password || "");

    if (!normalizedUsername || !normalizedPassword) {
      setError("Username and password are required.");
      return;
    }

    setError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          password: normalizedPassword
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Login failed");
      }

      if (!mountedRef.current) {
        return;
      }

      const token = String(payload.token || "");
      if (!token) {
        throw new Error("Missing session token from login response");
      }

      localStorage.setItem(ADMIN_TOKEN_STORAGE, token);
      localStorage.setItem(ADMIN_USERNAME_STORAGE, normalizedUsername);

      setAuthToken(token);
      setIsUnlocked(true);
      setLoading(true);
      setPassword("");
      await loadDashboard(token);
    } catch (requestError) {
      if (!mountedRef.current) {
        return;
      }
      setError(requestError.message);
      setIsUnlocked(false);
      setAuthToken("");
      setData(EMPTY_DASHBOARD);
    } finally {
      if (mountedRef.current) {
        setIsLoggingIn(false);
      }
    }
  }

  async function lockDashboard() {
    if (authToken) {
      try {
        await fetch(`${getApiBaseUrl()}/api/admin/auth/logout`, {
          method: "POST",
          headers: {
            "x-admin-token": authToken
          }
        });
      } catch (_error) {
      }
    }

    localStorage.removeItem(ADMIN_TOKEN_STORAGE);
    localStorage.removeItem(ADMIN_USERNAME_STORAGE);

    setIsUnlocked(false);
    setLoading(false);
    setError("");
    setAuthToken("");
    setPassword("");
    setData(EMPTY_DASHBOARD);
  }

  useEffect(() => {
    const storedUsername = localStorage.getItem(ADMIN_USERNAME_STORAGE) || "";
    const storedToken = localStorage.getItem(ADMIN_TOKEN_STORAGE) || "";

    if (storedUsername) {
      setUsername(storedUsername);
    }

    if (storedToken) {
      setAuthToken(storedToken);
      setIsUnlocked(true);
      setLoading(true);
      loadDashboard(storedToken);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [loadDashboard]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          Admin Console
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          PickFast Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          View sync activity, funnel health, PM report, revenue simulation, and subscriptions in one
          place.
        </p>

        <form onSubmit={handleLogin} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            suppressHydrationWarning
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Admin username"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <input
            suppressHydrationWarning
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            suppressHydrationWarning
            type="submit"
            disabled={isLoggingIn}
            className="btn-micro rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn ? "Signing in..." : isUnlocked ? "Re-Login" : "Login"}
          </button>
          <button
            suppressHydrationWarning
            type="button"
            onClick={lockDashboard}
            disabled={!isUnlocked}
            className="btn-micro rounded-lg border border-slate-300/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            Logout
          </button>
        </form>

        {!isUnlocked ? (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Admin dashboard is locked. Login with username and password to load data.
          </p>
        ) : (
          <button
            type="button"
            onClick={refreshDashboard}
            className="btn-micro mt-3 rounded-lg border border-slate-300/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
          >
            Refresh Data
          </button>
        )}

        {loading ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading admin dashboard...</p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error.includes("Unauthorized")
              ? "Unauthorized. Enter ADMIN_API_KEY in the field above and click Admin Login."
              : error}
          </p>
        ) : null}

        {!loading && !error && isUnlocked ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Sync Logs</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.syncLogCount}</p>
            </article>
            <article className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Newsletter Signups</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.newsletterCount}</p>
            </article>
            <article className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Price Alerts</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.alertsCount}</p>
            </article>
            <article className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Reminder Notifications</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.remindersCount}</p>
            </article>
          </div>
        ) : null}
      </section>

      {isUnlocked ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <GraphCard title="Funnel Stages (30d)">
            <HorizontalBars
              items={[
                { label: "Discovery", value: Number(data.funnel?.stages?.discoverySessions || 0) },
                { label: "Engaged", value: Number(data.funnel?.stages?.engagedSessions || 0) },
                { label: "Shortlist", value: Number(data.funnel?.stages?.shortlistSessions || 0) },
                {
                  label: "Affiliate Click",
                  value: Number(data.funnel?.stages?.affiliateClickSessions || 0)
                }
              ]}
              valueFormatter={(value) => value.toLocaleString()}
              barClassName="bg-cyan-500"
            />
          </GraphCard>

          <GraphCard title="Revenue Scenarios (30d)">
            <HorizontalBars
              items={[
                {
                  label: "Conservative",
                  value: Number(data.revenue?.totals?.projectedRevenue?.conservative || 0)
                },
                {
                  label: "Base",
                  value: Number(data.revenue?.totals?.projectedRevenue?.base || 0)
                },
                {
                  label: "Aggressive",
                  value: Number(data.revenue?.totals?.projectedRevenue?.aggressive || 0)
                }
              ]}
              valueFormatter={(value) => `$${value.toFixed(2)}`}
              barClassName="bg-emerald-500"
            />
          </GraphCard>

          <GraphCard title="Top Category Revenue">
            <HorizontalBars
              items={stats.topCategoryRevenue.map((item) => ({
                label: `${item.category} (${item.region})`,
                value: Number(item.projectedRevenueBase || 0)
              }))}
              valueFormatter={(value) => `$${value.toFixed(2)}`}
              barClassName="bg-violet-500"
            />
          </GraphCard>

          <GraphCard title="Top Placements by Clicks">
            <HorizontalBars
              items={stats.topPlacements.map((item) => ({
                label: item.placement || "unknown",
                value: Number(item.clicks || 0)
              }))}
              valueFormatter={(value) => value.toLocaleString()}
              barClassName="bg-amber-500"
            />
          </GraphCard>

          <OverviewCard overview={data.dbOverview} />
          <WeeklyPmCard report={data.weeklyPm} />
          <FunnelCard funnel={data.funnel} />
          <RevenueCard revenue={data.revenue} />
          <ClickSummaryCard summary={data.clickSummary} />
          <ActivityCard title="Sync Logs (latest 5)" items={data.syncLogs?.logs || []} />
          <ActivityCard title="Newsletter Signups (latest 10)" items={data.newsletter?.signups || []} />
          <ActivityCard title="Price Alert Subscriptions (latest 10)" items={data.alerts?.alerts || []} />
          <ActivityCard title="Reminder Notifications (latest 10)" items={data.reminders?.notifications || []} />
        </section>
      ) : null}
    </main>
  );
}

function GraphCard({ title, children }) {
  return (
    <article className="glass rounded-2xl p-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function HorizontalBars({ items, valueFormatter, barClassName }) {
  const validItems = Array.isArray(items) ? items.filter((item) => Number(item.value || 0) >= 0) : [];
  const maxValue = validItems.length
    ? Math.max(...validItems.map((item) => Number(item.value || 0)), 1)
    : 1;

  if (!validItems.length) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">No data available.</p>;
  }

  return (
    <div className="space-y-2">
      {validItems.map((item) => {
        const value = Number(item.value || 0);
        const widthPercent = Math.max((value / maxValue) * 100, 3);

        return (
          <div key={`${item.label}-${value}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200">
              <span className="truncate">{item.label}</span>
              <span className="font-semibold">{valueFormatter(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
              <div className={`h-2 rounded-full ${barClassName}`} style={{ width: `${widthPercent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataCard({ title, children, rawPayload }) {
  return (
    <article className="glass rounded-2xl p-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
      <details className="mt-3 rounded-lg border border-slate-300/70 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">Raw JSON</summary>
        <pre className="soft-scroll mt-2 max-h-56 overflow-auto text-xs text-slate-700 dark:text-slate-200">
          {JSON.stringify(rawPayload || {}, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function OverviewCard({ overview }) {
  const tables = overview?.tables || [];
  return (
    <DataCard title="DB Overview" rawPayload={overview}>
      <StatLine label="Generated" value={overview?.generatedAt || "-"} />
      <StatLine label="Total Tables" value={Number(overview?.tableCount || 0).toLocaleString()} />
      <StatLine label="Total Rows" value={Number(overview?.totalRows || 0).toLocaleString()} />
      <div className="soft-scroll max-h-56 overflow-auto rounded-lg border border-slate-300/70 dark:border-white/10">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100/60 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            <tr>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Rows</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((item) => (
              <tr key={item.table} className="border-t border-slate-200/80 dark:border-white/10">
                <td className="px-3 py-2">{item.table}</td>
                <td className="px-3 py-2">{Number(item.rowCount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataCard>
  );
}

function WeeklyPmCard({ report }) {
  const kpis = report?.kpis || {};
  const rollout = report?.rolloutRule || {};
  return (
    <DataCard title="Weekly PM Report (7d)" rawPayload={report}>
      <StatLine label="Window Days" value={Number(report?.windowDays || 0)} />
      <StatLine label="Experiment" value={report?.experimentKey || "-"} />
      <StatLine label="Action" value={rollout?.recommendedAction || "-"} />
      <StatLine label="Candidate Variant" value={rollout?.candidateVariantKey || "-"} />
      <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <p className="font-semibold text-slate-800 dark:text-slate-100">KPI Performance</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Discovery: {kpis.discoverySessions?.current || 0} / {kpis.discoverySessions?.target || 0}
        </p>
        <p className="text-slate-600 dark:text-slate-300">
          Discovery → Click: {formatPercent(kpis.discoveryToAffiliateClickRate?.current)} / target {formatPercent(kpis.discoveryToAffiliateClickRate?.target)}
        </p>
        <p className="text-slate-600 dark:text-slate-300">
          Email Capture: {formatPercent(kpis.emailCaptureRate?.current)} / target {formatPercent(kpis.emailCaptureRate?.target)}
        </p>
      </div>
    </DataCard>
  );
}

function FunnelCard({ funnel }) {
  const stages = funnel?.stages || {};
  const rates = funnel?.rates || {};
  return (
    <DataCard title="Funnel Summary (30d)" rawPayload={funnel}>
      <StatLine label="Discovery Sessions" value={Number(stages.discoverySessions || 0).toLocaleString()} />
      <StatLine label="Engaged Sessions" value={Number(stages.engagedSessions || 0).toLocaleString()} />
      <StatLine label="Shortlist Sessions" value={Number(stages.shortlistSessions || 0).toLocaleString()} />
      <StatLine label="Affiliate Click Sessions" value={Number(stages.affiliateClickSessions || 0).toLocaleString()} />
      <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <p className="font-semibold text-slate-800 dark:text-slate-100">Rates</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Discovery → Engaged: {formatPercent(rates.discoveryToEngaged)}</p>
        <p className="text-slate-600 dark:text-slate-300">Engaged → Shortlist: {formatPercent(rates.engagedToShortlist)}</p>
        <p className="text-slate-600 dark:text-slate-300">Shortlist → Click: {formatPercent(rates.shortlistToAffiliateClick)}</p>
      </div>
    </DataCard>
  );
}

function RevenueCard({ revenue }) {
  return (
    <DataCard title="Revenue Simulation" rawPayload={revenue}>
      <StatLine label="Projected Clicks" value={Number(revenue?.totals?.projectedClicks || 0).toLocaleString()} />
      <StatLine label="Conservative" value={formatMoney(revenue?.totals?.projectedRevenue?.conservative)} />
      <StatLine label="Base" value={formatMoney(revenue?.totals?.projectedRevenue?.base)} />
      <StatLine label="Aggressive" value={formatMoney(revenue?.totals?.projectedRevenue?.aggressive)} />
    </DataCard>
  );
}

function ClickSummaryCard({ summary }) {
  const totals = summary?.totals || {};
  const placements = summary?.topPlacements || [];
  return (
    <DataCard title="Click Summary (30d)" rawPayload={summary}>
      <StatLine label="Total Clicks" value={Number(totals.total_clicks || 0).toLocaleString()} />
      <StatLine label="Unique Products" value={Number(totals.unique_products || 0).toLocaleString()} />
      <StatLine label="Active Regions" value={Number(totals.active_regions || 0).toLocaleString()} />
      <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <p className="font-semibold text-slate-800 dark:text-slate-100">Top Placements</p>
        <ul className="mt-2 space-y-1">
          {placements.slice(0, 5).map((item) => (
            <li key={`${item.placement}-${item.clicks}`} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>{item.placement || "unknown"}</span>
              <span>{Number(item.clicks || 0).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </DataCard>
  );
}

function ActivityCard({ title, items }) {
  return (
    <DataCard title={title} rawPayload={items}>
      {!items.length ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">No records found.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {items.slice(0, 8).map((item, index) => (
            <li key={item.id || `${title}-${index}`} className="rounded-lg border border-slate-300/70 bg-white/70 p-2 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {Object.entries(item)
                .slice(0, 4)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(" • ")}
            </li>
          ))}
        </ul>
      )}
    </DataCard>
  );
}

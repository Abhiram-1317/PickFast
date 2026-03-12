"use client";

import { useState, useEffect } from "react";
import { ErrorState } from "../../components/StatusStates";
import { TableSkeleton } from "../../components/Skeletons";

const STORAGE_KEY = "pickfast_admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function Badge({ color = "green", children }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    yellow: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${colors[color] || colors.gray}`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card rounded-xl p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Dashboard data
  const [health, setHealth] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [priceChanges, setPriceChanges] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [clicks, setClicks] = useState(null);
  const [experiments, setExperiments] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const saved = getToken();
    if (saved) {
      setToken(saved);
    }
  }, []);

  // Load dashboard data when token is available
  useEffect(() => {
    if (!token) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadDashboard() {
    setDashLoading(true);
    setDashError("");

    const headers = { Authorization: `Bearer ${token}` };
    const opts = { headers };

    try {
      const base =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:4000`
          : "http://localhost:4000";

      const [hRes, sRes, pRes, dRes, cRes, eRes, wRes] = await Promise.allSettled([
        fetch(`${base}/api/health`).then((r) => r.json()),
        fetch(`${base}/api/admin/sync-logs`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/price-changes`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/duplicates`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/clicks/summary`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/experiments/summary`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/weekly-pm-report`, opts).then((r) => r.json()),
      ]);

      if (hRes.status === "fulfilled") setHealth(hRes.value);
      if (sRes.status === "fulfilled") setSyncLogs(sRes.value?.logs || sRes.value || []);
      if (pRes.status === "fulfilled") setPriceChanges(pRes.value?.changes || pRes.value || []);
      if (dRes.status === "fulfilled") setDuplicates(dRes.value?.events || dRes.value || []);
      if (cRes.status === "fulfilled") setClicks(cRes.value);
      if (eRes.status === "fulfilled") setExperiments(eRes.value);
      if (wRes.status === "fulfilled") setWeeklyReport(wRes.value);
    } catch (err) {
      setDashError(err.message);
    } finally {
      setDashLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const base =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:4000`
          : "http://localhost:4000";

      const res = await fetch(`${base}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Invalid credentials");
      }

      const data = await res.json();
      const t = data.token || data.apiKey;
      if (!t) throw new Error("No token received");

      localStorage.setItem(STORAGE_KEY, t);
      setToken(t);
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setHealth(null);
    setSyncLogs([]);
    setPriceChanges([]);
    setDuplicates([]);
    setClicks(null);
    setExperiments(null);
    setWeeklyReport(null);
  }

  // --- LOGIN VIEW ---
  if (!token) {
    return (
      <main className="fade-in flex min-h-[60vh] items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="card w-full max-w-sm rounded-2xl p-8 space-y-5"
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl">
              🔐
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to the PickFast dashboard
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </label>

          {loginError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {loginLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </main>
    );
  }

  // --- DASHBOARD VIEW ---
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "sync", label: "Sync Logs" },
    { key: "prices", label: "Price Changes" },
    { key: "duplicates", label: "Duplicates" },
    { key: "clicks", label: "Clicks" },
    { key: "experiments", label: "Experiments" },
    { key: "weekly", label: "Weekly Report" },
  ];

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor, manage, and optimize your catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={dashLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-300 disabled:opacity-50"
          >
            {dashLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-400"
          >
            Logout
          </button>
        </div>
      </div>

      {dashError && (
        <div className="mt-4">
          <ErrorState message={dashError} onRetry={loadDashboard} />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === t.key
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {dashLoading && <TableSkeleton rows={4} cols={5} />}

        {/* OVERVIEW */}
        {!dashLoading && activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Status"
                value={
                  health?.status === "ok" ? (
                    <Badge color="green">Healthy</Badge>
                  ) : (
                    <Badge color="red">Down</Badge>
                  )
                }
              />
              <StatCard
                label="Products"
                value={health?.totalProducts ?? "—"}
              />
              <StatCard
                label="Sync Logs"
                value={Array.isArray(syncLogs) ? syncLogs.length : 0}
              />
              <StatCard
                label="Price Changes"
                value={Array.isArray(priceChanges) ? priceChanges.length : 0}
              />
            </div>

            {weeklyReport && (
              <div className="card rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-700">
                  Weekly PM Summary
                </h3>
                <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                  {JSON.stringify(weeklyReport, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SYNC LOGS */}
        {!dashLoading && activeTab === "sync" && (
          <div className="card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Items</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(syncLogs) ? syncLogs : []).map((log, i) => (
                    <tr
                      key={log.id || i}
                      className="border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">{log.syncType || log.type || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge color={log.status === "success" ? "green" : "red"}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{log.itemsProcessed ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="max-w-50 truncate px-4 py-2 text-slate-500">
                        {log.message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!Array.isArray(syncLogs) || syncLogs.length === 0) && (
              <p className="p-6 text-center text-sm text-slate-400">No sync logs found.</p>
            )}
          </div>
        )}

        {/* PRICE CHANGES */}
        {!dashLoading && activeTab === "prices" && (
          <div className="card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Old Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">New Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Change</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(priceChanges) ? priceChanges : []).map((pc, i) => {
                    const diff = (Number(pc.newPrice) - Number(pc.oldPrice)).toFixed(2);
                    const isUp = diff > 0;
                    return (
                      <tr
                        key={pc.id || i}
                        className="border-b border-slate-50 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-2 font-medium text-slate-800">
                          {pc.productId || pc.name || "—"}
                        </td>
                        <td className="px-4 py-2">₹{Number(pc.oldPrice || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 font-semibold">
                          ₹{Number(pc.newPrice || 0).toFixed(2)}
                        </td>
                        <td className={`px-4 py-2 font-semibold ${isUp ? "text-red-600" : "text-emerald-600"}`}>
                          {isUp ? "+" : ""}
                          {diff}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {pc.createdAt
                            ? new Date(pc.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!Array.isArray(priceChanges) || priceChanges.length === 0) && (
              <p className="p-6 text-center text-sm text-slate-400">No price changes recorded.</p>
            )}
          </div>
        )}

        {/* DUPLICATES */}
        {!dashLoading && activeTab === "duplicates" && (
          <div className="card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-600">Original</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Duplicate</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(duplicates) ? duplicates : []).map((d, i) => (
                    <tr
                      key={d.id || i}
                      className="border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {d.originalId || "—"}
                      </td>
                      <td className="px-4 py-2">{d.duplicateId || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge color={d.status === "resolved" ? "green" : "yellow"}>
                          {d.status || "pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {d.createdAt
                          ? new Date(d.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!Array.isArray(duplicates) || duplicates.length === 0) && (
              <p className="p-6 text-center text-sm text-slate-400">No duplicate events found.</p>
            )}
          </div>
        )}

        {/* CLICKS */}
        {!dashLoading && activeTab === "clicks" && (
          <div className="card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-700">Click Summary</h3>
            {clicks ? (
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                {JSON.stringify(clicks, null, 2)}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No click data available.</p>
            )}
          </div>
        )}

        {/* EXPERIMENTS */}
        {!dashLoading && activeTab === "experiments" && (
          <div className="card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              Experiments Summary
            </h3>
            {experiments ? (
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                {JSON.stringify(experiments, null, 2)}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No experiment data available.
              </p>
            )}
          </div>
        )}

        {/* WEEKLY REPORT */}
        {!dashLoading && activeTab === "weekly" && (
          <div className="card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-700">
              Weekly PM Report
            </h3>
            {weeklyReport ? (
              <pre className="mt-3 max-h-125 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                {JSON.stringify(weeklyReport, null, 2)}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No weekly report available.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

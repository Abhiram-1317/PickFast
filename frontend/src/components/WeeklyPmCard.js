"use client";

import { useState, useEffect } from "react";

export default function WeeklyPmCard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : "http://localhost:4000";

    fetch(`${base}/api/admin/weekly-pm-report`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setReport(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse rounded-2xl p-5">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!report) return null;

  const kpis = report.kpis || report.summary || {};
  const highlights = report.highlights || report.topActions || [];

  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-bold text-slate-800">Weekly PM Report</h3>
      </div>

      {/* KPI grid */}
      {Object.keys(kpis).length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(kpis).slice(0, 6).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {typeof value === "number" ? value.toLocaleString() : String(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Highlights */}
      {Array.isArray(highlights) && highlights.length > 0 && (
        <ul className="mt-4 space-y-1">
          {highlights.slice(0, 5).map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-0.5 text-emerald-500">•</span>
              <span>{typeof h === "string" ? h : h.text || h.message || JSON.stringify(h)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Fallback: raw JSON preview */}
      {Object.keys(kpis).length === 0 && (!Array.isArray(highlights) || highlights.length === 0) && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}

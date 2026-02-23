"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export default function WeeklyPmCard() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(7);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/admin/weekly-pm-report?windowDays=${windowDays}&experimentKey=hero_cta_v1`
        );

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load weekly PM report");
        }

        if (active) {
          setReport(payload);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [windowDays]);

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Weekly PM Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-300/80 bg-white/70 px-2.5 py-1 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            Monday Review
          </span>
          <select
            value={windowDays}
            onChange={(event) => {
              setError("");
              setLoading(true);
              setWindowDays(Number(event.target.value));
            }}
            className="rounded-lg border border-slate-300/80 bg-white/80 px-2 py-1 text-xs text-slate-700 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-200"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading weekly KPI report...</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error.includes("Unauthorized")
            ? "Admin key required for weekly PM report endpoint."
            : error}
        </p>
      ) : null}

      {!loading && !error && report ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Discovery Sessions</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {report.kpis?.discoverySessions?.current || 0}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Target {report.kpis?.discoverySessions?.target || 0}
              </p>
            </div>

            <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Discovery → Click</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatPercent(report.kpis?.discoveryToAffiliateClickRate?.current)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Target {formatPercent(report.kpis?.discoveryToAffiliateClickRate?.target)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-600 dark:text-slate-300">Email Capture</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatPercent(report.kpis?.emailCaptureRate?.current)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Target {formatPercent(report.kpis?.emailCaptureRate?.target)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-cyan-400/35 bg-cyan-500/10 p-3 text-xs text-cyan-800 dark:text-cyan-100">
            <p className="font-semibold">
              Rollout Action: {report.rolloutRule?.recommendedAction || "continue_learning"}
            </p>
            <p className="mt-1">
              Candidate: {report.rolloutRule?.candidateVariantKey || "n/a"} • Lift {formatPercent(report.rolloutRule?.observed?.liftVsControl || 0)}
            </p>
            <p className="mt-1">
              p-value {Number(report.rolloutRule?.observed?.pValueOneTailed || 1).toFixed(3)} • Bayesian {formatPercent(report.rolloutRule?.observed?.bayesianBeatProbability || 0)}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}

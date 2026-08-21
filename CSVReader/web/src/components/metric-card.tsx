"use client";

import { useState } from "react";
import type { KpiMetric } from "@/lib/kpi";
import type { MetricBreakdown } from "@/lib/raw-data";

const formatPercent = (value: number | null) =>
  value === null ? "No data" : `${value.toFixed(2)}%`;

export function MetricCard({ metric }: { metric: KpiMetric }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MetricBreakdown | null>(null);

  const progress = Math.min(
    100,
    Math.max(0, ((metric.currentPercent ?? 0) / metric.targetPercent) * 100),
  );
  const achieved = (metric.currentPercent ?? 0) >= metric.targetPercent;

  async function openDetail() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/kpi-detail?metric=${encodeURIComponent(metric.name)}`,
      );
      const payload = (await response.json()) as {
        data?: MetricBreakdown;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Unable to load tracking detail");
      }
      setDetail(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load detail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="glass w-full rounded-2xl p-5 text-left transition hover:border-cyan-300/40 hover:bg-white/[0.09]"
        onClick={openDetail}
        type="button"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-white">{metric.name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Target {metric.targetPercent}% • tap to inspect leftover parcels
            </p>
          </div>
          <p
            className={`text-2xl font-black ${achieved ? "text-emerald-300" : "text-cyan-300"}`}
          >
            {formatPercent(metric.currentPercent)}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${achieved ? "bg-emerald-300" : "bg-gradient-to-r from-indigo-500 to-cyan-300"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between text-xs">
          <span className="text-slate-500">{metric.total} attempts</span>
          <span className={achieved ? "text-emerald-300" : "text-amber-300"}>
            {achieved ? "Target reached" : `${metric.leftToTarget} left`}
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <section className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-cyan-300">
                  {metric.name}
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {detail?.title ?? "Pending breakdown"}
                </h2>
              </div>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            {loading && <p className="text-sm text-slate-400">Loading leftover parcels…</p>}
            {error && <p className="text-sm text-amber-300">{error}</p>}

            {detail && !loading && (
              <div className="space-y-5">
                <p className="text-sm text-slate-400">
                  {detail.totalPending} leftover parcels at {detail.stationCode}
                  {detail.sourceUpdatedAt
                    ? ` • sheet ${detail.sourceUpdatedAt}`
                    : ""}
                </p>
                {detail.statuses.length ? (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs tracking-wider text-slate-500">
                      <tr>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.statuses.map((item) => (
                        <tr
                          className="border-t border-white/10 text-slate-200"
                          key={item.status}
                        >
                          <td className="py-3">{item.status}</td>
                          <td className="py-3 text-right font-bold text-cyan-300">
                            {item.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-slate-400">
                    No leftover status rows were published for this metric.
                  </p>
                )}
                <p className="rounded-2xl bg-amber-300/10 p-4 text-sm leading-6 text-amber-200">
                  {detail.note}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

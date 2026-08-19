import type { AlertFinding, KpiMetric, KpiSnapshot } from "@/lib/types";
import { formatMetricValue } from "@/lib/sheets";

function toneClass(tone: KpiMetric["tone"]): string {
  if (tone === "good") return "text-[var(--good)]";
  if (tone === "warn") return "text-[var(--warn)]";
  if (tone === "bad") return "text-[var(--bad)]";
  return "text-[var(--text)]";
}

function severityClass(severity: AlertFinding["severity"]): string {
  if (severity === "critical") return "border-[var(--bad)]/40 bg-[var(--bad)]/10";
  if (severity === "warning") return "border-[var(--warn)]/40 bg-[var(--warn)]/10";
  return "border-[var(--good)]/40 bg-[var(--good)]/10";
}

function MetricCard({ metric, index }: { metric: KpiMetric; index: number }) {
  return (
    <article
      className={`glass rise rise-delay-${Math.min(index + 1, 3)} rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-white/25`}
    >
      <p className="text-sm uppercase tracking-[0.14em] text-[var(--muted)]">
        {metric.label}
      </p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass(metric.tone)}`}>
        {formatMetricValue(metric)}
      </p>
      {metric.percent !== null && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"
            style={{ width: `${Math.max(0, Math.min(metric.percent, 100))}%` }}
          />
        </div>
      )}
    </article>
  );
}

export function Dashboard({ snapshot }: { snapshot: KpiSnapshot }) {
  const metrics = snapshot.latest?.metrics ?? [];
  const primary = metrics.filter((m) =>
    ["volume", "successRate", "attemptRate", "sla", "fulfillment", "pending", "failed", "delivered"].includes(
      m.key,
    ),
  );
  const displayMetrics = primary.length > 0 ? primary : metrics.slice(0, 8);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <header className="rise mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
            Pearl Abyss Operations
          </p>
          <h1 className="glow-text mt-2 text-4xl font-semibold md:text-5xl">
            Station KPI
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Live performance board for{" "}
            <span className="font-medium text-white">{snapshot.station}</span>
            . Automated alert fires every day at 10:00 PM.
          </p>
        </div>
        <div className="glass rounded-2xl px-4 py-3 text-sm text-[var(--muted)]">
          <div>
            Source:{" "}
            <span className="text-white">
              {snapshot.sheetAccessible ? "Google Sheet" : "Demo fallback"}
            </span>
          </div>
          <div>
            Synced: {new Date(snapshot.fetchedAt).toLocaleString()}
          </div>
          <div>Rows: {snapshot.rowCount}</div>
        </div>
      </header>

      {!snapshot.sheetAccessible && (
        <section className="glass rise rise-delay-1 mb-8 rounded-2xl border-[var(--warn)]/30 bg-[var(--warn)]/10 p-5">
          <h2 className="text-lg font-semibold text-[var(--warn)]">
            Connect the live KPI sheet
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {snapshot.error ??
              "Share the Google Sheet as Anyone with the link (Viewer) or Publish to web so this dashboard can sync real KPIs."}
          </p>
        </section>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayMetrics.map((metric, index) => (
          <MetricCard key={metric.key} metric={metric} index={index} />
        ))}
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rise rise-delay-2 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Recent history</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Latest dated rows for {snapshot.station}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Success</th>
                  <th className="pb-3 font-medium">Attempt</th>
                  <th className="pb-3 font-medium">SLA</th>
                  <th className="pb-3 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-[var(--muted)]">
                      No history rows yet for this station.
                    </td>
                  </tr>
                )}
                {snapshot.history.map((row) => {
                  const get = (key: string) =>
                    row.metrics.find((m) => m.key === key);
                  return (
                    <tr key={`${row.date}-${row.station}`} className="border-t border-white/10">
                      <td className="py-3">{row.date ?? "—"}</td>
                      <td className="py-3">
                        {get("successRate")
                          ? formatMetricValue(get("successRate")!)
                          : "—"}
                      </td>
                      <td className="py-3">
                        {get("attemptRate")
                          ? formatMetricValue(get("attemptRate")!)
                          : "—"}
                      </td>
                      <td className="py-3">
                        {get("sla") ? formatMetricValue(get("sla")!) : "—"}
                      </td>
                      <td className="py-3">
                        {get("volume") ? formatMetricValue(get("volume")!) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rise rise-delay-3 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Alert panel</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Evaluated against operational thresholds · daily push at 22:00
          </p>
          <ul className="mt-4 space-y-3">
            {snapshot.alerts.map((finding) => (
              <li
                key={`${finding.severity}-${finding.title}`}
                className={`rounded-xl border px-4 py-3 ${severityClass(finding.severity)}`}
              >
                <p className="font-medium">{finding.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{finding.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="rise text-center text-xs text-[var(--muted)]">
        Automation endpoint: <code>/api/cron/daily-alert</code> · Cron{" "}
        <code>0 14 * * *</code> UTC (10 PM UTC+8)
      </footer>
    </main>
  );
}

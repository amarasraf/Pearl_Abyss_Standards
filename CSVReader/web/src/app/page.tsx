import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { MetricCard } from "@/components/metric-card";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions, isAdminEmail } from "@/lib/auth";
import {
  getSnapshot,
  getSnapshots,
  logAudit,
  saveSnapshot,
} from "@/lib/db";
import { fetchLiveKpi, STATION_CODE } from "@/lib/kpi";

const formatPercent = (value: number | null) =>
  value === null ? "No data" : `${value.toFixed(2)}%`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+08:00`));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const { date } = await searchParams;
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  let live = null;
  if (!validDate) {
    live = await fetchLiveKpi();
    await saveSnapshot(live);
  }
  const history = await getSnapshots(STATION_CODE);
  const snapshot = validDate
    ? await getSnapshot(STATION_CODE, validDate)
    : live;
  if (!snapshot && validDate) redirect("/");

  const requestHeaders = await headers();
  await logAudit({
    email,
    eventType: validDate ? "history_date_view" : "dashboard_view",
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: requestHeaders.get("user-agent"),
    metadata: validDate ? { date: validDate } : {},
  });

  if (!snapshot) throw new Error("KPI snapshot is unavailable");
  const isHistorical = Boolean(validDate);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554_0%,#080d1d_42%,#030712_100%)] px-5 py-7 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.22em] text-cyan-300">
              SOUTH 4 • {snapshot.stationCode}
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Nilai KPI Intelligence
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-300">
                {session.user?.name}
              </p>
              <p className="text-[11px] text-slate-500">{email}</p>
            </div>
            {isAdminEmail(email) && (
              <Link
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                href="/audit"
              >
                Access audit
              </Link>
            )}
            <SignOutButton />
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black tracking-wider ${
                    isHistorical
                      ? "bg-amber-300/15 text-amber-300"
                      : "bg-emerald-300/15 text-emerald-300"
                  }`}
                >
                  {isHistorical ? "HISTORICAL RECORD" : "● LIVE"}
                </span>
                <p className="mt-6 text-sm text-slate-400">
                  Station {snapshot.stationName}
                </p>
                <p className="mt-1 text-5xl font-black">
                  {Math.max(...snapshot.metrics.map((metric) => metric.total))}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  daily attempts • {formatDate(snapshot.recordedDate)}
                </p>
              </div>
              <form className="flex flex-col gap-2" method="get">
                <label className="text-xs font-bold tracking-wider text-slate-500">
                  VIEW SAVED DATE
                </label>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
                  defaultValue={validDate ?? ""}
                  name="date"
                >
                  <option value="">Live performance</option>
                  {history.map((item) => (
                    <option key={item.recordedDate} value={item.recordedDate}>
                      {formatDate(item.recordedDate)}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold hover:bg-indigo-400"
                  type="submit"
                >
                  View performance
                </button>
              </form>
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <p className="text-xs font-bold tracking-[0.18em] text-slate-500">
              DATA STATUS
            </p>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Sheet updated</dt>
                <dd className="mt-1 font-semibold text-slate-200">
                  {snapshot.sourceUpdatedAt || "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Online capture</dt>
                <dd className="mt-1 font-semibold text-slate-200">
                  {formatTime(snapshot.capturedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Retention</dt>
                <dd className="mt-1 font-semibold text-emerald-300">
                  Two years • automatic cleanup
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {snapshot.metrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </section>

        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="font-bold">Recent online records</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest daily snapshot, newest first
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
              {history.length} dates
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">FIFO D0</th>
                  <th className="px-6 py-3">PRIOR D0</th>
                  <th className="px-6 py-3">Completion</th>
                  <th className="px-6 py-3">Captured</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map((item) => (
                  <tr
                    className="border-t border-white/[0.06] text-slate-300"
                    key={item.recordedDate}
                  >
                    <td className="px-6 py-4">
                      <Link
                        className="font-semibold text-cyan-300 hover:underline"
                        href={`/?date=${item.recordedDate}`}
                      >
                        {formatDate(item.recordedDate)}
                      </Link>
                    </td>
                    {item.metrics.map((metric) => (
                      <td className="px-6 py-4" key={metric.name}>
                        {formatPercent(metric.currentPercent)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatTime(item.capturedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

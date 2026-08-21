import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { getAuditEvents, logAudit } from "@/lib/db";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");
  if (!isAdminEmail(email)) redirect("/");

  const events = await getAuditEvents();
  await logAudit({ email, eventType: "audit_log_view" });

  return (
    <main className="min-h-screen bg-[#060b18] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">
              ADMIN ONLY
            </p>
            <h1 className="mt-2 text-3xl font-black">Access audit</h1>
            <p className="mt-2 text-sm text-slate-500">
              Login and KPI usage records shown in Malaysia time.
            </p>
          </div>
          <Link
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white"
            href="/"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Activity</th>
                  <th className="px-5 py-4">Date and time</th>
                  <th className="px-5 py-4">IP address</th>
                  <th className="px-5 py-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    className="border-t border-white/[0.06] text-slate-300"
                    key={event.id}
                  >
                    <td className="px-5 py-4 font-semibold text-white">
                      {event.email}
                    </td>
                    <td className="px-5 py-4">
                      {event.event_type.replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-4">{formatTime(event.event_at)}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {event.ip_address || "Not available"}
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-xs text-slate-500">
                      {Object.keys(event.metadata).length
                        ? JSON.stringify(event.metadata)
                        : "—"}
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

import DashboardView from "@/components/DashboardView";
import { fetchDashboard, fetchSchedule } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATION = process.env.NEXT_PUBLIC_STATION_NAME || "C4-NIL-5-85";

export default async function Home() {
  try {
    const [data, schedule] = await Promise.all([
      fetchDashboard(STATION),
      fetchSchedule().catch(() => null),
    ]);

    return <DashboardView data={data} schedule={schedule ?? undefined} />;
  } catch (error) {
    return (
      <div className="dashboard">
        <div className="error-box">
          <h2>Unable to load dashboard</h2>
          <p style={{ marginTop: "0.5rem", color: "#8b8b9e" }}>
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <p style={{ marginTop: "1rem", color: "#8b8b9e", fontSize: "0.85rem" }}>
            Ensure the backend API is running on port 8000.
          </p>
        </div>
      </div>
    );
  }
}

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/db";
import {
  fetchMetricBreakdown,
  type MetricBreakdown,
} from "@/lib/raw-data";

export const dynamic = "force-dynamic";

const METRICS = new Set<MetricBreakdown["metric"]>([
  "FIFO D0",
  "PRIOR D0",
  "D0 Completion",
]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metric = request.nextUrl.searchParams.get("metric") as
    | MetricBreakdown["metric"]
    | null;
  if (!metric || !METRICS.has(metric)) {
    return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  }

  try {
    const data = await fetchMetricBreakdown(metric);
    await logAudit({
      email,
      eventType: "kpi_status_drilldown",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent"),
      metadata: { metric },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load details",
      },
      { status: 500 },
    );
  }
}

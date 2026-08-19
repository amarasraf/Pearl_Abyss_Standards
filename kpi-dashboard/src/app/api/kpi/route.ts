import { NextResponse } from "next/server";
import { getKpiSnapshot } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/kpi — live station KPI snapshot for the dashboard.
 */
export async function GET() {
  try {
    const snapshot = await getKpiSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load KPI snapshot",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

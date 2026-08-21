import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, saveSnapshot } from "@/lib/db";
import { fetchLiveKpi } from "@/lib/kpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await fetchLiveKpi();
    await saveSnapshot(snapshot);
    await logAudit({
      email: "system@nilai-kpi",
      eventType: "daily_capture",
      metadata: {
        stationCode: snapshot.stationCode,
        recordedDate: snapshot.recordedDate,
        sourceUpdatedAt: snapshot.sourceUpdatedAt,
      },
    });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Daily KPI capture failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Capture failed",
      },
      { status: 500 },
    );
  }
}

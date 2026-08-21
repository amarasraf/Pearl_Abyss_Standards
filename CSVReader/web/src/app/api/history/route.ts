import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSnapshot, getSnapshots, logAudit } from "@/lib/db";
import { STATION_CODE } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data = date
    ? await getSnapshot(STATION_CODE, date)
    : await getSnapshots(STATION_CODE);
  await logAudit({
    email,
    eventType: date ? "history_date_api_view" : "history_api_view",
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent"),
    metadata: date ? { date } : {},
  });

  return NextResponse.json({ data });
}

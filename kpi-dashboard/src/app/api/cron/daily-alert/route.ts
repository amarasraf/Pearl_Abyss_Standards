import { NextRequest, NextResponse } from "next/server";
import { runDailyAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/daily-alert
 * Scheduled for 22:00 Asia/Kuala_Lumpur (Vercel cron: 0 14 * * * UTC).
 * Protect with CRON_SECRET when deployed.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const querySecret = request.nextUrl.searchParams.get("secret");
    if (bearer !== cronSecret && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runDailyAlert();
    const failed = result.results.filter((r) => !r.ok);
    return NextResponse.json({
      ok: failed.length === 0,
      station: result.snapshot.station,
      source: result.snapshot.source,
      alertCount: result.snapshot.alerts.length,
      results: result.results,
      messagePreview: result.message.slice(0, 500),
    });
  } catch (error) {
    console.error("[daily-alert] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** Allow manual POST triggers with the same auth rules. */
export async function POST(request: NextRequest) {
  return GET(request);
}

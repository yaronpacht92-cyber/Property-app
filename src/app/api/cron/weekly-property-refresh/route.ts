import { NextRequest, NextResponse } from "next/server";
import { runWeeklyPropertyDataRefresh } from "@/jobs/weekly-property-refresh";

/**
 * Weekly cron endpoint.
 * Secure with CRON_SECRET. Configure Vercel Cron or an external scheduler for Mondays 6am.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runWeeklyPropertyDataRefresh();
    return NextResponse.json({
      ok: true,
      processed: summary.processed,
      succeeded: summary.succeeded,
      failed: summary.failed,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "The weekly refresh could not finish. Please try again later.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

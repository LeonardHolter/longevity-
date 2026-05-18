import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/user/opponent?keys=weightEntries,weightPlan,foodLogs,strengthLogs
 * Returns the opponent's data for the requested keys.
 * "Opponent" = any other user in the app (for 2-player setup).
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keysParam = request.nextUrl.searchParams.get("keys");
  const keys = keysParam ? keysParam.split(",") : [];

  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 10 });

  // Find the other user
  const opponent = users.data.find((u) => u.id !== userId);
  if (!opponent) {
    return NextResponse.json({ error: "no_opponent", name: null, data: {} }, { status: 200 });
  }

  const meta = (opponent.privateMetadata || {}) as Record<string, unknown>;
  const pub = (opponent.publicMetadata || {}) as Record<string, unknown>;
  const whoopStats = (pub.whoopStats as Record<string, unknown>) || {};

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = meta[key] ?? null;
  }

  return NextResponse.json({
    name: (whoopStats.name as string) || `${opponent.firstName ?? ""} ${opponent.lastName ?? ""}`.trim() || "Opponent",
    imageUrl: opponent.imageUrl,
    data: result,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

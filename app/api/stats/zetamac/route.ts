import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { score, avgTime } = await request.json();
  if (typeof score !== "number") {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existing = (user.publicMetadata?.zetamac as Record<string, unknown>) || {};
  const currentBest = (existing.bestScore as number) ?? 0;

  const zetamac = {
    lastScore: score,
    bestScore: Math.max(score, currentBest),
    avgTime: typeof avgTime === "number" ? avgTime : null,
    lastPlayed: new Date().toISOString(),
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { zetamac },
  });

  return NextResponse.json({ ok: true, zetamac });
}

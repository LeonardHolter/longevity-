import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/user/data?keys=weightEntries,weightPlan,foodLogs,strengthLogs
 * Returns the requested keys from the user's privateMetadata.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keysParam = request.nextUrl.searchParams.get("keys");
  const keys = keysParam ? keysParam.split(",") : [];

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.privateMetadata || {}) as Record<string, unknown>;

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = meta[key] ?? null;
  }

  return NextResponse.json(result);
}

/**
 * POST /api/user/data
 * Body: { key: string, value: any }
 * Merges into the user's privateMetadata.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "missing key" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [key]: value },
  });

  return NextResponse.json({ ok: true });
}

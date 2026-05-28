import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb, ensureSchema } from "@/app/lib/db";

/**
 * GET /api/user/data?keys=weightEntries,weightPlan,foodLogs,strengthLogs
 * Returns the requested keys from Postgres.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const sql = getDb();

  const keysParam = request.nextUrl.searchParams.get("keys");
  const keys = keysParam ? keysParam.split(",") : [];

  if (keys.length === 0) {
    return NextResponse.json({}, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const rows = await sql`
    SELECT key, value FROM user_data
    WHERE user_id = ${userId} AND key = ANY(${keys})
  `;

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    result[key] = row ? row.value : null;
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

/**
 * POST /api/user/data
 * Body: { key: string, value: any }
 * Upserts into the user_data table.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "missing key" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getDb();

  await sql`
    INSERT INTO user_data (user_id, key, value, updated_at)
    VALUES (${userId}, ${key}, ${JSON.stringify(value)}::jsonb, NOW())
    ON CONFLICT (user_id, key)
    DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}

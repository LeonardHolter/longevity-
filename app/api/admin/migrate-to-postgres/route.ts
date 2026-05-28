import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb, ensureSchema } from "@/app/lib/db";

/**
 * POST /api/admin/migrate-to-postgres
 * One-time migration: copies all user data from Clerk privateMetadata to Postgres.
 * Safe to run multiple times (upserts).
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const sql = getDb();
  const client = await clerkClient();

  const { data: users } = await client.users.getUserList({ limit: 100 });

  const DATA_KEYS = [
    "foodLogs",
    "strengthLogs",
    "weightEntries",
    "weightPlan",
    "zetamacBest",
    "zetamacHistory",
  ];

  const stats = { users: 0, keys: 0, skipped: 0 };

  for (const user of users) {
    const meta = (user.privateMetadata || {}) as Record<string, unknown>;
    stats.users++;

    for (const key of DATA_KEYS) {
      const value = meta[key];
      if (value === null || value === undefined) {
        stats.skipped++;
        continue;
      }

      await sql`
        INSERT INTO user_data (user_id, key, value, updated_at)
        VALUES (${user.id}, ${key}, ${JSON.stringify(value)}::jsonb, NOW())
        ON CONFLICT (user_id, key)
        DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()
      `;
      stats.keys++;
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb, ensureSchema } from "@/app/lib/db";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const sql = getDb();
  const client = await clerkClient();

  // Get all users
  const { data: users } = await client.users.getUserList({ limit: 100 });

  const reset = [];
  for (const user of users) {
    // Reset in Postgres
    await sql`
      DELETE FROM user_data
      WHERE user_id = ${user.id} AND key IN ('zetamacBest', 'zetamacHistory')
    `;

    // Reset public metadata (leaderboard)
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        zetamac: {
          lastScore: null,
          bestScore: null,
          avgTime: null,
          lastPlayed: null,
        },
      },
    });
    reset.push(user.id);
  }

  return NextResponse.json({ ok: true, reset });
}

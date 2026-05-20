import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();

  // Get all users
  const { data: users } = await client.users.getUserList({ limit: 100 });

  const reset = [];
  for (const user of users) {
    await client.users.updateUserMetadata(user.id, {
      privateMetadata: {
        zetamacBest: null,
        zetamacHistory: [],
      },
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

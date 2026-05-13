import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("whoop_access_token");
  cookieStore.delete("whoop_refresh_token");
  cookieStore.delete("whoop_connected");
  return NextResponse.json({ disconnected: true });
}

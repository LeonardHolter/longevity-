import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete("strava_access_token");
  cookieStore.delete("strava_refresh_token");
  cookieStore.delete("strava_connected");
  cookieStore.delete("strava_athlete_id");

  return NextResponse.json({ ok: true });
}

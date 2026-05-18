import { NextResponse } from "next/server";
import { getAccessToken } from "@/app/lib/strava";

export async function GET() {
  const token = await getAccessToken();
  return NextResponse.json({ connected: !!token });
}

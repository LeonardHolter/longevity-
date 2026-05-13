import { NextResponse } from "next/server";
import { getAccessToken } from "@/app/lib/whoop";

export async function GET() {
  const token = await getAccessToken();
  return NextResponse.json({ connected: !!token });
}

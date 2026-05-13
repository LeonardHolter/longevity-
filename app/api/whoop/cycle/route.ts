import { NextRequest, NextResponse } from "next/server";
import { whoopFetch } from "@/app/lib/whoop";

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") || "10";
  const start = request.nextUrl.searchParams.get("start") || "";
  const end = request.nextUrl.searchParams.get("end") || "";

  const params: Record<string, string> = { limit };
  if (start) params.start = start;
  if (end) params.end = end;

  const { error, data } = await whoopFetch("/v2/cycle", params);
  if (error) {
    return NextResponse.json({ error }, { status: error === "not_connected" ? 401 : 502 });
  }
  return NextResponse.json(data);
}

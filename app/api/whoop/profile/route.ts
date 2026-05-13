import { NextResponse } from "next/server";
import { whoopFetch } from "@/app/lib/whoop";

export async function GET() {
  const { error, data } = await whoopFetch("/v2/user/profile/basic");
  if (error) {
    return NextResponse.json({ error }, { status: error === "not_connected" ? 401 : 502 });
  }
  return NextResponse.json(data);
}

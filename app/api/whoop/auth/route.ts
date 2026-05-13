import { NextRequest, NextResponse } from "next/server";
import { WHOOP_AUTH_URL, WHOOP_SCOPES, getWhoopConfig } from "@/app/lib/whoop";

export async function GET(request: NextRequest) {
  const config = getWhoopConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: "WHOOP_CLIENT_ID not configured. Set it in .env.local" },
      { status: 500 }
    );
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/whoop/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES,
    state: crypto.randomUUID(),
  });

  return NextResponse.redirect(`${WHOOP_AUTH_URL}?${params.toString()}`);
}

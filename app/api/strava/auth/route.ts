import { NextRequest, NextResponse } from "next/server";
import { STRAVA_AUTH_URL, STRAVA_SCOPES, getStravaConfig } from "@/app/lib/strava";

export async function GET(request: NextRequest) {
  const config = getStravaConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID not configured. Set it in .env.local" },
      { status: 500 }
    );
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/strava/callback`;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: STRAVA_SCOPES,
    approval_prompt: "auto",
  });

  return NextResponse.redirect(`${STRAVA_AUTH_URL}?${params.toString()}`);
}

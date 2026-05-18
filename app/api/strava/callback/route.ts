import { NextRequest, NextResponse } from "next/server";
import { STRAVA_TOKEN_URL, getStravaConfig } from "@/app/lib/strava";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/?strava_error=${error || "no_code"}`, request.url)
    );
  }

  const config = getStravaConfig();

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Strava token exchange failed:", text);
    return NextResponse.redirect(
      new URL("/?strava_error=token_exchange_failed", request.url)
    );
  }

  const data = await res.json();
  const cookieStore = await cookies();

  cookieStore.set("strava_access_token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: data.expires_in || 3600,
    path: "/",
  });

  if (data.refresh_token) {
    cookieStore.set("strava_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 3600,
      path: "/",
    });
  }

  cookieStore.set("strava_connected", "true", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 3600,
    path: "/",
  });

  // Store athlete ID for later
  if (data.athlete?.id) {
    cookieStore.set("strava_athlete_id", String(data.athlete.id), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 3600,
      path: "/",
    });
  }

  return NextResponse.redirect(new URL("/?strava_connected=true", request.url));
}

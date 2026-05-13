import { NextRequest, NextResponse } from "next/server";
import { WHOOP_TOKEN_URL, getWhoopConfig } from "@/app/lib/whoop";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/?whoop_error=${error || "no_code"}`, request.url)
    );
  }

  const config = getWhoopConfig();

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("WHOOP token exchange failed:", text);
    return NextResponse.redirect(
      new URL("/?whoop_error=token_exchange_failed", request.url)
    );
  }

  const data = await res.json();
  const cookieStore = await cookies();

  cookieStore.set("whoop_access_token", data.access_token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: data.expires_in || 3600,
    path: "/",
  });

  if (data.refresh_token) {
    cookieStore.set("whoop_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600,
      path: "/",
    });
  }

  cookieStore.set("whoop_connected", "true", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });

  return NextResponse.redirect(new URL("/?whoop_connected=true", request.url));
}

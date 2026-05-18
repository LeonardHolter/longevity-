import { cookies } from "next/headers";

export const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export const STRAVA_SCOPES = "activity:read_all";

export function getStravaConfig() {
  return {
    clientId: process.env.STRAVA_CLIENT_ID || "",
    clientSecret: process.env.STRAVA_CLIENT_SECRET || "",
  };
}

async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("strava_refresh_token")?.value;
  if (!refreshToken) return null;

  const config = getStravaConfig();
  try {
    const res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const secure = process.env.NODE_ENV === "production";

    cookieStore.set("strava_access_token", data.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: data.expires_in || 3600,
      path: "/",
    });

    if (data.refresh_token) {
      cookieStore.set("strava_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 365 * 24 * 3600,
        path: "/",
      });
    }

    cookieStore.set("strava_connected", "true", {
      httpOnly: false,
      secure,
      sameSite: "lax",
      maxAge: 365 * 24 * 3600,
      path: "/",
    });

    return data.access_token;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("strava_access_token")?.value;
  if (token) return token;

  return refreshAccessToken();
}

export async function stravaFetch(path: string, params?: Record<string, string>) {
  let token = await getAccessToken();
  if (!token) {
    return { error: "not_connected", data: null };
  }

  const url = new URL(`${STRAVA_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  let res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // If 401, try refreshing the token once and retry
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) return { error: "not_connected", data: null };

    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }

  if (!res.ok) {
    return { error: `strava_error_${res.status}`, data: null };
  }

  const data = await res.json();
  return { error: null, data };
}

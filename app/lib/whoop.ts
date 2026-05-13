import { cookies } from "next/headers";

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

export const WHOOP_SCOPES = [
  "read:profile",
  "read:body_measurement",
  "read:cycles",
  "read:recovery",
  "read:sleep",
  "read:workout",
  "offline",
].join(" ");

export function getWhoopConfig() {
  return {
    clientId: process.env.WHOOP_CLIENT_ID || "",
    clientSecret: process.env.WHOOP_CLIENT_SECRET || "",
    redirectUri: process.env.WHOOP_REDIRECT_URI || "http://localhost:3778/api/whoop/callback",
  };
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("whoop_access_token")?.value;
  if (token) return token;

  const refreshToken = cookieStore.get("whoop_refresh_token")?.value;
  if (!refreshToken) return null;

  const config = getWhoopConfig();
  try {
    const res = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: "offline",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const cookieStoreForSet = await cookies();
    cookieStoreForSet.set("whoop_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.expires_in || 3600,
      path: "/",
    });
    if (data.refresh_token) {
      cookieStoreForSet.set("whoop_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 3600,
        path: "/",
      });
    }
    return data.access_token;
  } catch {
    return null;
  }
}

export async function whoopFetch(path: string, params?: Record<string, string>) {
  const token = await getAccessToken();
  if (!token) {
    return { error: "not_connected", data: null };
  }

  const url = new URL(`${WHOOP_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    return { error: "token_expired", data: null };
  }
  if (!res.ok) {
    return { error: `whoop_error_${res.status}`, data: null };
  }

  const data = await res.json();
  return { error: null, data };
}

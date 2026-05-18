import { NextRequest, NextResponse } from "next/server";
import { stravaFetch } from "@/app/lib/strava";

export async function GET(request: NextRequest) {
  const after = request.nextUrl.searchParams.get("after");
  const perPage = request.nextUrl.searchParams.get("per_page") || "50";

  const params: Record<string, string> = { per_page: perPage };
  if (after) params.after = after;

  const { error, data } = await stravaFetch("/athlete/activities", params);

  if (error) {
    return NextResponse.json({ error }, { status: error === "not_connected" ? 401 : 500 });
  }

  // Filter to runs and HIIT-relevant activities (Run, VirtualRun, Workout)
  interface StravaActivity {
    id: number;
    name: string;
    type: string;
    sport_type: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    total_elevation_gain: number;
    suffer_score?: number;
  }

  const activities = (data as StravaActivity[]).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    sportType: a.sport_type,
    date: a.start_date_local.slice(0, 10),
    distance: a.distance,
    movingTime: a.moving_time,
    elapsedTime: a.elapsed_time,
    avgSpeed: a.average_speed,
    maxSpeed: a.max_speed,
    avgHr: a.average_heartrate || null,
    maxHr: a.max_heartrate || null,
    elevation: a.total_elevation_gain,
    sufferScore: a.suffer_score || null,
  }));

  return NextResponse.json(
    { activities },
    { headers: { "Cache-Control": "no-store" } }
  );
}

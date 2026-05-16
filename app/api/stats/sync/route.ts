import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { whoopFetch } from "@/app/lib/whoop";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Fetch latest WHOOP data
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const startStr = start.toISOString();

  const [profileRes, recoveryRes, sleepRes, cycleRes] = await Promise.all([
    whoopFetch("/v2/user/profile/basic"),
    whoopFetch("/v2/recovery", { limit: "7", start: startStr }),
    whoopFetch("/v2/activity/sleep", { limit: "7", start: startStr }),
    whoopFetch("/v2/cycle", { limit: "7", start: startStr }),
  ]);

  if (profileRes.error) {
    return NextResponse.json({ error: "whoop_not_connected" }, { status: 400 });
  }

  const profile = profileRes.data;
  const recoveries = (recoveryRes.data?.records || []).filter(
    (r: { score_state: string; score: unknown }) => r.score_state === "SCORED" && r.score
  );
  const sleeps = (sleepRes.data?.records || []).filter(
    (s: { score_state: string; score: unknown }) => s.score_state === "SCORED" && s.score
  );
  const cycles = (cycleRes.data?.records || []).filter(
    (c: { score_state: string; score: unknown }) => c.score_state === "SCORED" && c.score
  );

  const latestRec = recoveries[0]?.score;
  const latestSlp = sleeps[0]?.score;
  const latestCycle = cycles[0]?.score;

  // Compute averages over scored records
  const avgRhr = recoveries.length
    ? Math.round(recoveries.reduce((s: number, r: { score: { resting_heart_rate: number } }) => s + r.score.resting_heart_rate, 0) / recoveries.length)
    : null;
  const avgHrv = recoveries.length
    ? Math.round(recoveries.reduce((s: number, r: { score: { hrv_rmssd_milli: number } }) => s + r.score.hrv_rmssd_milli, 0) / recoveries.length)
    : null;
  const avgRecovery = recoveries.length
    ? Math.round(recoveries.reduce((s: number, r: { score: { recovery_score: number } }) => s + r.score.recovery_score, 0) / recoveries.length)
    : null;
  const avgSleep = sleeps.length
    ? Math.round(sleeps.reduce((s: number, sl: { score: { sleep_performance_percentage: number } }) => s + sl.score.sleep_performance_percentage, 0) / sleeps.length)
    : null;
  const avgStrain = cycles.length
    ? parseFloat((cycles.reduce((s: number, c: { score: { strain: number } }) => s + c.score.strain, 0) / cycles.length).toFixed(1))
    : null;

  const stats = {
    name: `${profile.first_name} ${profile.last_name}`,
    updatedAt: now,
    rhr: latestRec ? Math.round(latestRec.resting_heart_rate) : null,
    hrv: latestRec ? Math.round(latestRec.hrv_rmssd_milli) : null,
    recovery: latestRec ? Math.round(latestRec.recovery_score) : null,
    sleepScore: latestSlp ? Math.round(latestSlp.sleep_performance_percentage) : null,
    sleepEfficiency: latestSlp ? Math.round(latestSlp.sleep_efficiency_percentage) : null,
    strain: latestCycle ? parseFloat(latestCycle.strain.toFixed(1)) : null,
    avgRhr,
    avgHrv,
    avgRecovery,
    avgSleep,
    avgStrain,
  };

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { whoopStats: stats },
  });

  return NextResponse.json({ ok: true, stats });
}

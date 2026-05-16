import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export interface PlayerStats {
  userId: string;
  name: string;
  imageUrl: string;
  updatedAt: string | null;
  rhr: number | null;
  hrv: number | null;
  recovery: number | null;
  sleepScore: number | null;
  sleepEfficiency: number | null;
  strain: number | null;
  avgRhr: number | null;
  avgHrv: number | null;
  avgRecovery: number | null;
  avgSleep: number | null;
  avgStrain: number | null;
}

export async function GET() {
  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 50 });

  const players: PlayerStats[] = users.data
    .filter((u) => {
      const stats = u.publicMetadata?.whoopStats as Record<string, unknown> | undefined;
      return stats && stats.updatedAt;
    })
    .map((u) => {
      const stats = u.publicMetadata.whoopStats as Record<string, unknown>;
      return {
        userId: u.id,
        name: (stats.name as string) || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "User",
        imageUrl: u.imageUrl,
        updatedAt: (stats.updatedAt as string) || null,
        rhr: (stats.rhr as number) ?? null,
        hrv: (stats.hrv as number) ?? null,
        recovery: (stats.recovery as number) ?? null,
        sleepScore: (stats.sleepScore as number) ?? null,
        sleepEfficiency: (stats.sleepEfficiency as number) ?? null,
        strain: (stats.strain as number) ?? null,
        avgRhr: (stats.avgRhr as number) ?? null,
        avgHrv: (stats.avgHrv as number) ?? null,
        avgRecovery: (stats.avgRecovery as number) ?? null,
        avgSleep: (stats.avgSleep as number) ?? null,
        avgStrain: (stats.avgStrain as number) ?? null,
      };
    });

  return NextResponse.json({ players });
}

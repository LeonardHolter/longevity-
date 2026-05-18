"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { DailyChecklistPanel } from "./DailyChecklist";
import { useWhoopContext } from "../lib/useWhoop";

interface PlayerStats {
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
  zetamacLast: number | null;
  zetamacBest: number | null;
  zetamacAvgTime: number | null;
}

interface Metric {
  key: keyof PlayerStats;
  label: string;
  unit: string;
  lowerBetter?: boolean;
  avg?: keyof PlayerStats;
}

const METRICS: Metric[] = [
  { key: "sleepScore", label: "Sleep Score", unit: "/ 100", avg: "avgSleep" },
  { key: "hrv", label: "HRV", unit: "ms", avg: "avgHrv" },
  { key: "rhr", label: "Resting Heart Rate", unit: "bpm", lowerBetter: true, avg: "avgRhr" },
  { key: "zetamacBest", label: "Zetamac Best", unit: "pts" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function getWinner(
  a: number | null,
  b: number | null,
  lowerBetter?: boolean
): "a" | "b" | "tie" | null {
  if (a == null || b == null) return null;
  if (a === b) return "tie";
  if (lowerBetter) return a < b ? "a" : "b";
  return a > b ? "a" : "b";
}

export default function Compete({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { user } = useUser();
  const whoop = useWhoopContext();
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [stravaConnected, setStravaConnected] = useState(false);
  useEffect(() => {
    setStravaConnected(document.cookie.includes("strava_connected=true"));
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const syncMyStats = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/stats/sync", { method: "POST" });
      await fetchLeaderboard();
    } catch {
      // ignore
    }
    setSyncing(false);
  }, [fetchLeaderboard]);

  useEffect(() => {
    // Sync own stats then fetch leaderboard
    syncMyStats();
  }, [syncMyStats]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 400,
        fontFamily: "var(--serif)",
        fontSize: 18,
        color: "var(--muted)",
      }}>
        Loading competition…
      </div>
    );
  }

  // Sort by wins for overall ranking
  const myId = user?.id;
  const me = players.find((p) => p.userId === myId);
  const opponent = players.find((p) => p.userId !== myId);

  const scores = { a: 0, b: 0 };
  if (me && opponent) {
    for (const m of METRICS) {
      const w = getWinner(
        me[m.key] as number | null,
        opponent[m.key] as number | null,
        m.lowerBetter
      );
      if (w === "a") scores.a++;
      if (w === "b") scores.b++;
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{today}</div>
          <h1 className="page-title">
            <em>Compete</em>
          </h1>
          {me && opponent ? (
            <p className="page-sub" style={{ fontSize: 18 }}>
              Today&apos;s winner:{" "}
              <strong style={{ color: "var(--accent)" }}>
                {scores.a > scores.b
                  ? me.name
                  : scores.b > scores.a
                    ? opponent.name
                    : "Tied"}
              </strong>
              {scores.a !== scores.b && (
                <span style={{ color: "var(--muted)" }}>
                  {" "}— winning {Math.max(scores.a, scores.b)} of {METRICS.length} metrics
                </span>
              )}
            </p>
          ) : (
            <p className="page-sub">
              Head-to-head WHOOP stats. Every metric counts. Lower RHR wins, higher everything else wins.
            </p>
          )}
        </div>
        <div className="page-chips">
          <button
            className="chip"
            onClick={syncMyStats}
            disabled={syncing}
            style={{ cursor: "pointer" }}
          >
            {syncing ? "Syncing…" : "↻ Sync"}
          </button>
        </div>
      </div>

      <div className="page-body">
        <DailyChecklistPanel onNavigate={onNavigate} />

        {/* Connection buttons — always visible, especially useful on mobile */}
        {(!whoop.connected || !stravaConnected) && (
          <div className="connect-banner" style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            flexWrap: "wrap",
          }}>
            {!whoop.connected && (
              <button
                onClick={whoop.connect}
                className="card"
                style={{
                  flex: 1,
                  minWidth: 140,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  cursor: "pointer",
                  border: "1px solid var(--hairline-2)",
                  background: "var(--surface)",
                  transition: "border-color 0.1s",
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "var(--surface)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>W</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>Connect WHOOP</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Sync recovery &amp; strain</div>
                </div>
              </button>
            )}
            {!stravaConnected && (
              <button
                onClick={() => { window.location.href = "/api/strava/auth"; }}
                className="card"
                style={{
                  flex: 1,
                  minWidth: 140,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  cursor: "pointer",
                  border: "1px solid var(--hairline-2)",
                  background: "var(--surface)",
                  transition: "border-color 0.1s",
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "oklch(0.55 0.15 25)",
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>S</span>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>Connect Strava</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Auto-import runs &amp; HIIT</div>
                </div>
              </button>
            )}
          </div>
        )}

        {players.length < 2 ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--serif)",
              fontSize: 28,
              marginBottom: 16,
            }}>
              Waiting for your opponent
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
              {players.length === 0
                ? "Connect your WHOOP and sync your stats to appear on the leaderboard."
                : "You're on the board. Share this app with your friend — once they connect WHOOP and sync, the competition begins."}
            </p>
            {me && (
              <div style={{
                marginTop: 24,
                padding: 16,
                background: "var(--surface-2)",
                borderRadius: 12,
                display: "inline-block",
              }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>
                  YOUR STATS · {me.updatedAt ? timeAgo(me.updatedAt) : "—"}
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  <div><strong>{me.rhr ?? "—"}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>RHR</span></div>
                  <div><strong>{me.hrv ?? "—"}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>HRV</span></div>
                  <div><strong>{me.recovery ?? "—"}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>Recovery</span></div>
                  <div><strong>{me.sleepScore ?? "—"}</strong> <span style={{ color: "var(--muted)", fontSize: 12 }}>Sleep</span></div>
                </div>
              </div>
            )}
          </div>
        ) : me && opponent ? (
          <>
            {/* SCOREBOARD */}
            <div className="hero" style={{ marginBottom: 0 }}>
              <div className="compete-scoreboard" style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 32,
              }}>
                <div style={{ textAlign: "center" }}>
                  <div className="compete-avatar" style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    margin: "0 auto 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--bg)",
                    overflow: "hidden",
                  }}>
                    {me.imageUrl ? (
                      <img src={me.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : me.name[0]}
                  </div>
                  <div className="compete-player-name" style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{me.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                    {me.updatedAt ? timeAgo(me.updatedAt) : "—"}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div className="compete-score-num" style={{
                    fontFamily: "var(--serif)",
                    fontSize: 48,
                    letterSpacing: "-0.03em",
                  }}>
                    <span style={{ color: scores.a >= scores.b ? "var(--accent)" : "var(--muted)" }}>
                      {scores.a}
                    </span>
                    <span style={{ color: "var(--faint)", margin: "0 12px" }}>–</span>
                    <span style={{ color: scores.b >= scores.a ? "var(--accent)" : "var(--muted)" }}>
                      {scores.b}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "var(--muted)",
                    marginTop: 4,
                  }}>
                    METRICS WON
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div className="compete-avatar" style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--warm)",
                    margin: "0 auto 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--bg)",
                    overflow: "hidden",
                  }}>
                    {opponent.imageUrl ? (
                      <img src={opponent.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : opponent.name[0]}
                  </div>
                  <div className="compete-player-name" style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{opponent.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                    {opponent.updatedAt ? timeAgo(opponent.updatedAt) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* METRIC ROWS */}
            <div className="divider-label">Head to head · today</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {METRICS.map((m) => {
                const myVal = me[m.key] as number | null;
                const oppVal = opponent[m.key] as number | null;
                const myAvg = m.avg ? (me[m.avg] as number | null) : null;
                const oppAvg = m.avg ? (opponent[m.avg] as number | null) : null;
                const winner = getWinner(myVal, oppVal, m.lowerBetter);

                return (
                  <div
                    key={m.key}
                    className="card compete-metric-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 200px 1fr",
                      alignItems: "center",
                      padding: "20px 28px",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div className="compete-metric-val" style={{
                        fontFamily: "var(--serif)",
                        fontSize: 32,
                        letterSpacing: "-0.02em",
                        color: winner === "a" ? "var(--accent)" : "var(--ink)",
                      }}>
                        {myVal ?? "—"}
                        <span style={{
                          fontFamily: "var(--mono)",
                          fontSize: 12,
                          color: "var(--muted)",
                          marginLeft: 6,
                        }}>
                          {m.unit}
                        </span>
                      </div>
                      {myAvg != null && (
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                          7d avg: {myAvg}{m.unit.replace("/ ", "")}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                      }}>
                        {m.label}
                      </div>
                      {winner && winner !== "tie" && (
                        <div style={{
                          fontSize: 16,
                          marginTop: 4,
                        }}>
                          {winner === "a" ? "◀" : "▶"}
                        </div>
                      )}
                      {winner === "tie" && (
                        <div style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          color: "var(--muted)",
                          marginTop: 4,
                        }}>
                          TIE
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="compete-metric-val" style={{
                        fontFamily: "var(--serif)",
                        fontSize: 32,
                        letterSpacing: "-0.02em",
                        color: winner === "b" ? "var(--accent)" : "var(--ink)",
                      }}>
                        <span style={{
                          fontFamily: "var(--mono)",
                          fontSize: 12,
                          color: "var(--muted)",
                          marginRight: 6,
                        }}>
                          {m.unit}
                        </span>
                        {oppVal ?? "—"}
                      </div>
                      {oppAvg != null && (
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                          7d avg: {oppAvg}{m.unit.replace("/ ", "")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 7-DAY AVERAGES */}
            <div className="divider-label">7-day averages</div>
            <div className="dash-grid compete-avg-grid">
              {METRICS.filter((m) => m.avg).map((m) => {
                const myAvg = me[m.avg!] as number | null;
                const oppAvg = opponent[m.avg!] as number | null;
                const winner = getWinner(myAvg, oppAvg, m.lowerBetter);

                return (
                  <div key={m.key} className="kpi span-4" style={{ padding: 20 }}>
                    <div className="kpi-head">
                      <div className="kpi-label">{m.label}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
                      <div style={{
                        fontFamily: "var(--serif)",
                        fontSize: 28,
                        color: winner === "a" ? "var(--accent)" : "var(--ink)",
                      }}>
                        {myAvg ?? "—"}
                      </div>
                      <div style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--muted)",
                      }}>
                        vs
                      </div>
                      <div style={{
                        fontFamily: "var(--serif)",
                        fontSize: 28,
                        color: winner === "b" ? "var(--accent)" : "var(--ink)",
                      }}>
                        {oppAvg ?? "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>you</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>{opponent.name.split(" ")[0]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

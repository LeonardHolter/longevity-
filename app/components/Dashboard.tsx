"use client";

import React from "react";
import { LineChart, Sparkline } from "./Charts";
import { useWhoopContext, WhoopWorkout } from "../lib/useWhoop";

function recoveryColor(score: number): string {
  if (score >= 67) return "var(--accent)";
  if (score >= 34) return "var(--warm)";
  return "var(--danger)";
}

function recoveryLabel(score: number): string {
  if (score >= 67) return "Green · primed";
  if (score >= 34) return "Yellow · recovering";
  return "Red · strained";
}

function msToHM(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function minToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
}

function buildWorkoutDays(workouts: WhoopWorkout[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const buckets = days.map((d) => ({ d, z2: 0, z3: 0, z4: 0, l: "Rest" }));

  for (const w of workouts) {
    const wDate = new Date(w.start);
    if (wDate < startOfWeek) continue;
    const dayIdx = wDate.getDay();
    if (w.score) {
      const zd = w.score.zone_durations;
      buckets[dayIdx].z2 = Math.round((zd.zone_two_milli + zd.zone_one_milli) / 60000);
      buckets[dayIdx].z3 = Math.round(zd.zone_three_milli / 60000);
      buckets[dayIdx].z4 = Math.round((zd.zone_four_milli + zd.zone_five_milli) / 60000);
      buckets[dayIdx].l = w.sport_name.length > 8 ? w.sport_name.slice(0, 7) + "…" : w.sport_name;
    }
  }

  return buckets;
}

function NotConnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 500,
      gap: 24,
      textAlign: "center",
      padding: 40,
    }}>
      <div style={{
        fontFamily: "var(--serif)",
        fontSize: 48,
        letterSpacing: "-0.03em",
      }}>
        Connect <em>WHOOP</em>
      </div>
      <p style={{ color: "var(--muted)", maxWidth: 420, lineHeight: 1.6 }}>
        Your dashboard is powered entirely by live WHOOP data — recovery, sleep,
        strain, heart rate, and workouts. Connect your account to get started.
      </p>
      <button className="login-btn" onClick={onConnect} style={{ width: "auto", padding: "14px 48px" }}>
        Connect WHOOP
        <span className="login-arrow">→</span>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const whoop = useWhoopContext();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (whoop.loading) {
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
        Loading WHOOP data…
      </div>
    );
  }

  if (!whoop.connected) {
    return <NotConnected onConnect={whoop.connect} />;
  }

  const rec = whoop.latestRecovery?.score;
  const slp = whoop.latestSleep?.score;

  const recoveryScore = rec ? Math.round(rec.recovery_score) : null;
  const rhr = rec ? Math.round(rec.resting_heart_rate) : null;
  const hrv = rec ? Math.round(rec.hrv_rmssd_milli) : null;
  const spo2 = rec?.spo2_percentage ? Math.round(rec.spo2_percentage) : null;
  const skinTemp = rec?.skin_temp_celsius;

  const sleepScore = slp ? Math.round(slp.sleep_performance_percentage) : null;
  const sleepConsistency = slp ? Math.round(slp.sleep_consistency_percentage) : null;
  const sleepEffPct = slp ? Math.round(slp.sleep_efficiency_percentage) : null;
  const respRate = slp ? slp.respiratory_rate : null;
  const sleepDuration = slp
    ? msToHM(slp.stage_summary.total_in_bed_time_milli - slp.stage_summary.total_awake_time_milli)
    : null;
  const deepSleep = slp ? msToHM(slp.stage_summary.total_slow_wave_sleep_time_milli) : null;
  const remSleep = slp ? msToHM(slp.stage_summary.total_rem_sleep_time_milli) : null;

  const scoredRecoveries = whoop.recoveries.filter((r) => r.score_state === "SCORED" && r.score);
  const recoveryTrend = scoredRecoveries.slice(0, 14).reverse().map((r) => Math.round(r.score!.recovery_score));
  const rhrTrend = scoredRecoveries.slice(0, 14).reverse().map((r) => Math.round(r.score!.resting_heart_rate));
  const hrvTrend = scoredRecoveries.slice(0, 14).reverse().map((r) => Math.round(r.score!.hrv_rmssd_milli));

  const scoredSleeps = whoop.sleeps.filter((s) => s.score_state === "SCORED" && s.score);
  const sleepTrend = scoredSleeps.slice(0, 14).reverse().map((s) => Math.round(s.score!.sleep_performance_percentage));

  const scoredCycles = whoop.cycles.filter((c) => c.score_state === "SCORED" && c.score);
  const strainTrend = scoredCycles.slice(0, 14).reverse().map((c) => parseFloat(c.score!.strain.toFixed(1)));
  const latestStrain = scoredCycles[0]?.score;

  const recoveryLabels = scoredRecoveries.slice(0, 14).reverse().map((r) => dayLabel(r.created_at));

  const trainingDays = buildWorkoutDays(whoop.workouts);
  const weekWorkouts = whoop.workouts.filter((w) => {
    const d = new Date(w.start);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
  });
  const totalWorkoutMin = weekWorkouts.reduce((sum, w) => {
    const dur = (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000;
    return sum + dur;
  }, 0);

  const recoveryRows = [
    { l: "HRV", v: hrv != null ? `${hrv}ms` : "—", bar: hrv != null ? Math.min(hrv / 120, 1) : 0, hint: "rmssd" },
    { l: "RHR", v: rhr != null ? `${rhr}bpm` : "—", bar: rhr != null ? Math.max(1 - (rhr - 40) / 30, 0.2) : 0, hint: "live" },
    { l: "Resp rate", v: respRate != null ? `${respRate.toFixed(1)}/m` : "—", bar: respRate != null ? Math.min(respRate / 20, 1) : 0, hint: "breaths" },
    { l: "SpO₂", v: spo2 != null ? `${spo2}%` : "—", bar: spo2 != null ? spo2 / 100 : 0, hint: spo2 != null ? "oxygen" : "n/a" },
    { l: "Skin temp", v: skinTemp != null ? `${skinTemp > 0 ? "+" : ""}${skinTemp.toFixed(1)}°C` : "—", bar: skinTemp != null ? 0.85 : 0, hint: skinTemp != null ? "delta" : "n/a" },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{today}</div>
          <h1 className="page-title">
            Your <em>healthspan</em>, right now
          </h1>
          <p className="page-sub">
            Live data from WHOOP — recovery, sleep, strain, and heart rate.
          </p>
        </div>
        <div className="page-chips">
          <span className="chip live">Live · Streaming</span>
          <span className="chip">WHOOP</span>
        </div>
      </div>

      <div className="page-body">
        {/* HERO — Recovery */}
        <div className="hero">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">Recovery score</div>
              <div className="hero-name">
                {whoop.profile
                  ? `${whoop.profile.first_name} ${whoop.profile.last_name}`
                  : "—"}
              </div>
              {recoveryScore != null ? (
                <>
                  <div className="hero-big" style={{ color: recoveryColor(recoveryScore) }}>
                    {recoveryScore}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 28,
                        color: "var(--muted)",
                        letterSpacing: 0,
                      }}
                    >
                      %
                    </span>
                    <sup style={{ fontSize: 14, color: "var(--muted)" }}>
                      {recoveryLabel(recoveryScore).split(" · ")[0]}
                    </sup>
                  </div>
                  <p className="hero-bio">
                    {recoveryLabel(recoveryScore)}.{" "}
                    {hrv != null && <>HRV at {hrv}ms, </>}
                    {rhr != null && <>resting heart rate {rhr}bpm.</>}
                  </p>
                </>
              ) : (
                <p className="hero-bio" style={{ color: "var(--muted)" }}>
                  No recovery data yet today.
                </p>
              )}
            </div>

            <div>
              <div className="hero-meter">
                <div className="hero-meter-row">
                  <div className="hero-meter-label">Day strain</div>
                  <div className="hero-meter-val">
                    {latestStrain ? latestStrain.strain.toFixed(1) : "—"}
                    <span className="unit">/ 21</span>
                  </div>
                </div>
                <div className="hero-meter-row" style={{ marginTop: 18 }}>
                  <div className="hero-meter-label">Calories</div>
                  <div className="hero-meter-val" style={{ color: "var(--accent)" }}>
                    {latestStrain ? Math.round(latestStrain.kilojoule * 0.239) : "—"}
                    <span className="unit">kcal</span>
                  </div>
                </div>

                <div className="dna-track">
                  <div
                    className="dna-fill"
                    style={{
                      width: latestStrain ? `${(latestStrain.strain / 21) * 100}%` : "0%",
                    }}
                  />
                </div>
                <div className="dna-marks">
                  <span>0</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {latestStrain ? latestStrain.strain.toFixed(1) : "—"} · TODAY
                  </span>
                  <span>21</span>
                </div>

                <div className="aging-callout">
                  <div className="aging-callout-num">
                    {latestStrain ? Math.round(latestStrain.average_heart_rate) : "—"}
                  </div>
                  <div className="aging-callout-text">
                    <strong>Avg heart rate</strong> today.
                    {latestStrain && <> Max {Math.round(latestStrain.max_heart_rate)} bpm.</>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI ROW */}
        <div className="divider-label">Daily signals · last 24h</div>
        <div className="dash-grid">
          <div className="kpi span-4">
            <div className="kpi-head">
              <div className="kpi-label">Sleep score</div>
              <div className="kpi-delta up">WHOOP</div>
            </div>
            <div className="kpi-value">
              {sleepScore ?? "—"}
              <span className="unit">/ 100</span>
            </div>
            <div style={{ flex: 1 }}>
              {sleepTrend.length >= 2 && (
                <Sparkline values={sleepTrend} color="var(--accent)" height={48} />
              )}
            </div>
            <div className="kpi-foot">
              <span>{sleepDuration ?? "—"}</span>
              <span>{sleepEffPct != null ? `${sleepEffPct}% efficient` : "—"}</span>
            </div>
          </div>

          <div className="kpi span-4">
            <div className="kpi-head">
              <div className="kpi-label">HRV</div>
              <div className="kpi-delta up">WHOOP</div>
            </div>
            <div className="kpi-value">
              {hrv ?? "—"}
              <span className="unit">ms rmssd</span>
            </div>
            <div style={{ flex: 1 }}>
              {hrvTrend.length >= 2 && (
                <Sparkline values={hrvTrend} color="var(--accent)" height={48} />
              )}
            </div>
            <div className="kpi-foot">
              <span>{deepSleep ? `Deep ${deepSleep}` : "—"}</span>
              <span>{remSleep ? `REM ${remSleep}` : "—"}</span>
            </div>
          </div>

          <div className="kpi span-4">
            <div className="kpi-head">
              <div className="kpi-label">Resting heart rate</div>
              <div className="kpi-delta up">WHOOP</div>
            </div>
            <div className="kpi-value">
              {rhr ?? "—"}
              <span className="unit">bpm</span>
            </div>
            <div style={{ flex: 1 }}>
              {rhrTrend.length >= 2 && (
                <Sparkline values={rhrTrend} color="var(--danger)" height={48} />
              )}
            </div>
            <div className="kpi-foot">
              <span>{sleepConsistency != null ? `${sleepConsistency}% consistency` : "—"}</span>
              <span>{respRate != null ? `${respRate.toFixed(1)} breaths/m` : "—"}</span>
            </div>
          </div>
        </div>

        {/* RECOVERY TREND */}
        {recoveryTrend.length >= 3 && (
          <>
            <div className="divider-label">
              Recovery trend · last {recoveryTrend.length} days
            </div>
            <div className="card trend-card">
              <div className="trend-head">
                <div>
                  <div className="trend-title">
                    Recovery score, <em>day by day</em>
                  </div>
                  <div className="trend-sub">
                    Your WHOOP recovery score over recent days. Higher is better — green
                    means primed for strain, yellow means moderate, red means take it easy.
                  </div>
                </div>
                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "var(--accent)" }} />
                    Recovery %
                  </div>
                  {strainTrend.length >= 3 && (
                    <div className="legend-item">
                      <span className="legend-swatch" style={{ background: "var(--warm)" }} />
                      Strain
                    </div>
                  )}
                </div>
              </div>

              <LineChart
                width={920}
                height={320}
                yDomain={[0, 100]}
                yUnit="%"
                xLabels={recoveryLabels}
                series={[
                  {
                    values: recoveryTrend,
                    color: "var(--accent)",
                    width: 2.5,
                    fill: true,
                    dots: true,
                    dotR: 3,
                  },
                  ...(strainTrend.length >= 3
                    ? [{
                        values: strainTrend.map((s) => (s / 21) * 100),
                        color: "var(--warm)",
                        width: 1.5,
                        dashed: true,
                      }]
                    : []),
                ]}
              />
            </div>
          </>
        )}

        {/* SECONDARY ROW — workouts + recovery vitals */}
        <div className="divider-label">Activity · this week</div>
        <div className="dash-grid">
          <div className="card span-7">
            <div className="card-head">
              <div className="card-title">Training load · WHOOP</div>
              <div className="card-meta">
                {weekWorkouts.length} workout{weekWorkouts.length !== 1 ? "s" : ""} · {minToHM(totalWorkoutMin)}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 8,
                alignItems: "end",
                height: 180,
              }}
            >
              {trainingDays.map((day, i) => {
                const total = day.z2 + day.z3 + day.z4;
                const scale = 2;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        width: "100%",
                        gap: 1,
                      }}
                    >
                      {day.z4 > 0 && (
                        <div
                          style={{
                            height: Math.min(day.z4 * scale, 60),
                            background: "var(--danger)",
                            borderRadius: "2px 2px 0 0",
                          }}
                        />
                      )}
                      {day.z3 > 0 && (
                        <div
                          style={{
                            height: Math.min(day.z3 * scale, 60),
                            background: "var(--warm)",
                            borderRadius: day.z4 ? 0 : "2px 2px 0 0",
                          }}
                        />
                      )}
                      {day.z2 > 0 && (
                        <div
                          style={{
                            height: Math.min(day.z2 * scale, 80),
                            background: "var(--accent)",
                            borderRadius: day.z3 || day.z4 ? 0 : "2px 2px 0 0",
                          }}
                        />
                      )}
                      {total === 0 && (
                        <div
                          style={{
                            height: 4,
                            background: "var(--hairline-2)",
                            borderRadius: 2,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--muted)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {day.d}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: total ? "var(--ink-2)" : "var(--faint)",
                        fontStyle: "italic",
                        fontFamily: "var(--serif)",
                      }}
                    >
                      {day.l}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--hairline)",
              }}
            >
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: "var(--accent)" }} />
                Zone 1–2
              </div>
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: "var(--warm)" }} />
                Zone 3
              </div>
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: "var(--danger)" }} />
                Zone 4–5
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                }}
              >
                Total · {minToHM(totalWorkoutMin)}
              </div>
            </div>
          </div>

          <div className="card span-5">
            <div className="card-head">
              <div className="card-title">Recovery · WHOOP</div>
              <div className="card-meta">live</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 54,
                  letterSpacing: "-0.03em",
                  color: recoveryScore != null ? recoveryColor(recoveryScore) : "var(--muted)",
                }}
              >
                {recoveryScore ?? "—"}
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--muted)",
                    marginLeft: 6,
                    letterSpacing: 0,
                  }}
                >
                  %
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontStyle: "italic",
                  color: "var(--ink-2)",
                  fontSize: 16,
                }}
              >
                {recoveryScore != null ? recoveryLabel(recoveryScore) : "Pending"}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              {recoveryRows.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 70px 80px",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < recoveryRows.length - 1 ? "1px solid var(--hairline)" : "0",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {r.l}
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--surface-2)",
                      borderRadius: 100,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${r.bar * 100}%`,
                        height: "100%",
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 18,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {r.v}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--muted)",
                      textAlign: "right",
                    }}
                  >
                    {r.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

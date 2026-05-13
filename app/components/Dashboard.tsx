"use client";

import React from "react";
import { LineChart, Sparkline } from "./Charts";
import { useWhoopContext } from "../lib/useWhoop";

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

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
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
  const latestStrain = scoredCycles[0]?.score;

  const recoveryLabels = scoredRecoveries.slice(0, 14).reverse().map((r) => dayLabel(r.created_at));

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
        {/* HERO — Resting Heart Rate */}
        <div className="hero">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">Resting heart rate</div>
              <div className="hero-name">
                {whoop.profile
                  ? `${whoop.profile.first_name} ${whoop.profile.last_name}`
                  : "—"}
              </div>
              {rhr != null ? (
                <>
                  <div className="hero-big">
                    {rhr}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 28,
                        color: "var(--muted)",
                        letterSpacing: 0,
                      }}
                    >
                      bpm
                    </span>
                  </div>
                  <p className="hero-bio">
                    {rhr < 50 ? "Excellent" : rhr < 60 ? "Very good" : rhr < 70 ? "Good" : "Average"} resting heart rate.{" "}
                    {hrv != null && <>HRV {hrv}ms. </>}
                    {recoveryScore != null && <>{recoveryLabel(recoveryScore)}.</>}
                  </p>
                </>
              ) : (
                <p className="hero-bio" style={{ color: "var(--muted)" }}>
                  No heart rate data yet today.
                </p>
              )}
            </div>

            <div>
              <div className="hero-meter">
                <div className="hero-meter-row">
                  <div className="hero-meter-label">Recovery</div>
                  <div className="hero-meter-val" style={{ color: recoveryScore != null ? recoveryColor(recoveryScore) : "var(--muted)" }}>
                    {recoveryScore ?? "—"}
                    <span className="unit">%</span>
                  </div>
                </div>
                <div className="hero-meter-row" style={{ marginTop: 18 }}>
                  <div className="hero-meter-label">HRV</div>
                  <div className="hero-meter-val" style={{ color: "var(--accent)" }}>
                    {hrv ?? "—"}
                    <span className="unit">ms</span>
                  </div>
                </div>

                <div className="dna-track">
                  <div
                    className="dna-fill"
                    style={{
                      width: rhr != null ? `${Math.max(100 - ((rhr - 35) / 45) * 100, 5)}%` : "0%",
                    }}
                  />
                </div>
                <div className="dna-marks">
                  <span>80</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {rhr ?? "—"} · YOU
                  </span>
                  <span>35</span>
                </div>

                <div className="aging-callout">
                  <div className="aging-callout-num">
                    {latestStrain ? latestStrain.strain.toFixed(1) : "—"}
                  </div>
                  <div className="aging-callout-text">
                    <strong>Day strain</strong> today.
                    {latestStrain && <> {Math.round(latestStrain.kilojoule * 0.239)} kcal burned.</>}
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
              <div className="kpi-label">Recovery</div>
              <div className="kpi-delta up">WHOOP</div>
            </div>
            <div className="kpi-value" style={{ color: recoveryScore != null ? recoveryColor(recoveryScore) : undefined }}>
              {recoveryScore ?? "—"}
              <span className="unit">%</span>
            </div>
            <div style={{ flex: 1 }}>
              {recoveryTrend.length >= 2 && (
                <Sparkline values={recoveryTrend} color="var(--accent)" height={48} />
              )}
            </div>
            <div className="kpi-foot">
              <span>{recoveryScore != null ? recoveryLabel(recoveryScore).split(" · ")[1] : "—"}</span>
              <span>{respRate != null ? `${respRate.toFixed(1)} breaths/m` : "—"}</span>
            </div>
          </div>
        </div>

        {/* RHR TREND */}
        {rhrTrend.length >= 3 && (
          <>
            <div className="divider-label">
              Resting heart rate · last {rhrTrend.length} days
            </div>
            <div className="card trend-card">
              <div className="trend-head">
                <div>
                  <div className="trend-title">
                    Resting heart rate, <em>trending over time</em>
                  </div>
                  <div className="trend-sub">
                    Lower is generally better. A declining RHR over weeks signals improving
                    cardiovascular fitness. Spikes can indicate stress, illness, or overtraining.
                  </div>
                </div>
                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "var(--accent)" }} />
                    RHR (bpm)
                  </div>
                  {hrvTrend.length >= 3 && (
                    <div className="legend-item">
                      <span className="legend-swatch" style={{ background: "var(--warm)" }} />
                      HRV (ms)
                    </div>
                  )}
                </div>
              </div>

              <LineChart
                width={920}
                height={320}
                yDomain={[
                  Math.min(...rhrTrend) - 5,
                  Math.max(...rhrTrend, ...(hrvTrend.length >= 3 ? hrvTrend : [])) + 5,
                ]}
                yUnit="BPM"
                xLabels={recoveryLabels}
                series={[
                  {
                    values: rhrTrend,
                    color: "var(--accent)",
                    width: 2.5,
                    fill: true,
                    dots: true,
                    dotR: 3,
                    endLabel: true,
                  },
                  ...(hrvTrend.length >= 3
                    ? [{
                        values: hrvTrend,
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

      </div>
    </div>
  );
}

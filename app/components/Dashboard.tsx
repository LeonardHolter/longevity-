"use client";

import React from "react";
import { LineChart, Sparkline } from "./Charts";
import { useWhoopContext } from "../lib/useWhoop";

const DASH_DATA = {
  chronoAge: 31.4,
  bioAge: 27.2,
  delta: -4.2,
  sleepScore: 87,
  sleepTrend: [72, 80, 84, 78, 88, 83, 87],
  vo2: 52.8,
  vo2Trend: [48.1, 48.9, 49.4, 50.2, 51.5, 51.9, 52.3, 52.8],
  rhr: 48,
  rhrTrend: [54, 53, 52, 51, 50, 50, 49, 48],
  agingMonths: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
  chronoSeries: [30.7, 30.8, 30.9, 31.0, 31.1, 31.2, 31.3, 31.4],
  bioSeries: [30.9, 30.4, 29.6, 29.1, 28.4, 27.9, 27.5, 27.2],
  bioProjection: [27.2, 26.9, 26.5, 26.1],
  agingMonthsFull: [
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May",
    "Jun", "Jul", "Aug", "Sep",
  ],
};

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

export default function Dashboard() {
  const d = DASH_DATA;
  const whoop = useWhoopContext();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const rec = whoop.latestRecovery?.score;
  const slp = whoop.latestSleep?.score;

  const sleepScore = slp ? Math.round(slp.sleep_performance_percentage) : d.sleepScore;
  const rhr = rec ? Math.round(rec.resting_heart_rate) : d.rhr;
  const hrv = rec ? Math.round(rec.hrv_rmssd_milli) : 78;
  const recoveryScore = rec ? Math.round(rec.recovery_score) : 82;

  const sleepTrend = whoop.sleeps.length >= 3
    ? whoop.sleeps
        .filter((s) => s.score)
        .slice(0, 7)
        .reverse()
        .map((s) => Math.round(s.score!.sleep_performance_percentage))
    : d.sleepTrend;

  const rhrTrend = whoop.recoveries.length >= 3
    ? whoop.recoveries
        .filter((r) => r.score)
        .slice(0, 8)
        .reverse()
        .map((r) => Math.round(r.score!.resting_heart_rate))
    : d.rhrTrend;

  const chronoFull: (number | null)[] = [...d.chronoSeries, 31.5, 31.6, 31.7, 31.8];
  const bioHist: (number | null)[] = [...d.bioSeries, null, null, null, null];
  const bioProj: (number | null)[] = [null, null, null, null, null, null, null, ...d.bioProjection];

  const trainingDays = [
    { d: "Mon", z2: 42, z3: 18, z4: 0, l: "Easy" },
    { d: "Tue", z2: 0, z3: 0, z4: 0, l: "Rest" },
    { d: "Wed", z2: 35, z3: 24, z4: 12, l: "Tempo" },
    { d: "Thu", z2: 50, z3: 8, z4: 0, l: "Z2" },
    { d: "Fri", z2: 0, z3: 0, z4: 0, l: "Rest" },
    { d: "Sat", z2: 78, z3: 22, z4: 5, l: "Long" },
    { d: "Sun", z2: 28, z3: 0, z4: 0, l: "Recov" },
  ];

  const respRate = slp ? `${slp.respiratory_rate.toFixed(1)}/m` : "13.2/m";
  const skinTemp = rec?.skin_temp_celsius != null
    ? `${rec.skin_temp_celsius > 0 ? "+" : ""}${rec.skin_temp_celsius.toFixed(1)}°C`
    : "+0.1°C";
  const sleepDuration = slp
    ? msToHM(slp.stage_summary.total_in_bed_time_milli - slp.stage_summary.total_awake_time_milli)
    : "7h 42m";
  const sleepEfficiency = slp
    ? `${Math.round(slp.sleep_efficiency_percentage)}% efficient`
    : "92% efficient";

  const recoveryRows = [
    { l: "HRV", v: `${hrv}ms`, bar: Math.min(hrv / 100, 1), hint: "rmssd" },
    { l: "RHR", v: `${rhr}bpm`, bar: Math.max(1 - (rhr - 40) / 30, 0.2), hint: whoop.connected ? "live" : "−1 vs trend" },
    { l: "Resp rate", v: respRate, bar: 0.66, hint: "normal" },
    { l: "Skin temp", v: skinTemp, bar: 0.91, hint: "stable" },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            {today} · Reykjavík, IS
          </div>
          <h1 className="page-title">
            Your <em>healthspan</em>, right now
          </h1>
          <p className="page-sub">
            Composite score across cardiovascular, recovery, sleep, and activity
            signals — updated continuously from WHOOP and Strava.
          </p>
        </div>
        <div className="page-chips">
          {whoop.connected ? (
            <span className="chip live">Live · Streaming</span>
          ) : (
            <span className="chip">Demo data</span>
          )}
          {whoop.connected && <span className="chip">WHOOP 4.0</span>}
          <span className="chip">Strava</span>
        </div>
      </div>

      <div className="page-body">
        {/* HERO */}
        <div className="hero">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">Biological age</div>
              <div className="hero-name">
                {whoop.profile
                  ? `${whoop.profile.first_name} ${whoop.profile.last_name}`
                  : "Leonard Holter"}
              </div>
              <div className="hero-big">
                27
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 44,
                    color: "var(--muted)",
                    letterSpacing: 0,
                  }}
                >
                  .2
                </span>
                <sup>years</sup>
              </div>
              <p className="hero-bio">
                You&apos;re aging <strong>4.2 years younger</strong> than your
                chronological clock. Sustained at your current trajectory,
                you&apos;ll cross the 25-year mark by November.
              </p>
            </div>

            <div>
              <div className="hero-meter">
                <div className="hero-meter-row">
                  <div className="hero-meter-label">Chronological age</div>
                  <div className="hero-meter-val">
                    31
                    <span style={{ color: "var(--muted)" }}>.4</span>
                    <span className="unit">yr</span>
                  </div>
                </div>
                <div className="hero-meter-row" style={{ marginTop: 18 }}>
                  <div className="hero-meter-label">Biological age</div>
                  <div
                    className="hero-meter-val"
                    style={{ color: "var(--accent)" }}
                  >
                    27
                    <span style={{ color: "oklch(0.62 0.10 145)" }}>.2</span>
                    <span className="unit">yr</span>
                  </div>
                </div>

                <div className="dna-track">
                  <div className="dna-fill" style={{ width: "62%" }} />
                </div>
                <div className="dna-marks">
                  <span>20</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    27.2 · YOU
                  </span>
                  <span>40</span>
                </div>

                <div className="aging-callout">
                  <div className="aging-callout-num">−4.2</div>
                  <div className="aging-callout-text">
                    <strong>Net rejuvenation</strong> over the last 7 months.
                    Driven 64% by sleep regularity, 28% by Zone 2 volume.
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
              <div className="kpi-delta up">
                {whoop.connected ? "WHOOP" : "+4 vs 7d avg"}
              </div>
            </div>
            <div className="kpi-value">
              {sleepScore}
              <span className="unit">/ 100</span>
            </div>
            <div style={{ flex: 1 }}>
              <Sparkline values={sleepTrend} color="var(--accent)" height={48} />
            </div>
            <div className="kpi-foot">
              <span>{sleepDuration}</span>
              <span>{sleepEfficiency}</span>
            </div>
          </div>

          <div className="kpi span-4">
            <div className="kpi-head">
              <div className="kpi-label">VO₂ Max</div>
              <div className="kpi-delta up">+4.7 (6mo)</div>
            </div>
            <div className="kpi-value">
              {d.vo2}
              <span className="unit">mL/kg·min</span>
            </div>
            <div style={{ flex: 1 }}>
              <Sparkline values={d.vo2Trend} color="var(--accent)" height={48} />
            </div>
            <div className="kpi-foot">
              <span>Elite · 99th %ile (M, 30–35)</span>
              <span>est. from Strava</span>
            </div>
          </div>

          <div className="kpi span-4">
            <div className="kpi-head">
              <div className="kpi-label">Resting heart rate</div>
              <div className="kpi-delta up">
                {whoop.connected ? "WHOOP" : "−6 bpm (6mo)"}
              </div>
            </div>
            <div className="kpi-value">
              {rhr}
              <span className="unit">bpm</span>
            </div>
            <div style={{ flex: 1 }}>
              <Sparkline values={rhrTrend} color="var(--danger)" height={48} />
            </div>
            <div className="kpi-foot">
              <span>HRV {hrv} ms</span>
              <span>{whoop.connected ? "live from WHOOP" : "recorded 04:12"}</span>
            </div>
          </div>
        </div>

        {/* AGING TREND */}
        <div className="divider-label">
          Aging trajectory · 7 month history + 4 month forecast
        </div>
        <div className="card trend-card">
          <div className="trend-head">
            <div>
              <div className="trend-title">
                Biological age, <em>holding back the clock</em>
              </div>
              <div className="trend-sub">
                Your biological age decoupled from your chronological clock in
                mid-December. Maintained sleep regularity (90%+) and Zone 2
                hours (~5h/wk) are the primary drivers.
              </div>
            </div>
            <div className="legend">
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--ink-2)" }}
                />
                Chronological
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--accent)" }}
                />
                Biological
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{
                    background: "var(--accent)",
                    borderTop: "1px dashed",
                    height: 0,
                  }}
                />
                Projected
              </div>
            </div>
          </div>

          <LineChart
            width={920}
            height={320}
            yDomain={[25, 32.5]}
            yUnit="YEARS"
            xLabels={d.agingMonthsFull}
            showProjection={true}
            projectionStartIdx={7}
            series={[
              {
                values: chronoFull,
                color: "var(--ink-2)",
                width: 1.5,
              },
              {
                values: bioHist,
                color: "var(--accent)",
                width: 2.5,
                fill: true,
                endLabel: true,
              },
              {
                values: bioProj,
                color: "var(--accent)",
                width: 2,
                dashed: true,
              },
            ]}
          />
        </div>

        {/* SECONDARY ROW — recovery + Strava */}
        <div className="divider-label">Activity · this week</div>
        <div className="dash-grid">
          <div className="card span-7">
            <div className="card-head">
              <div className="card-title">Training load · Strava</div>
              <div className="card-meta">5 of 6 planned · 4h 12m</div>
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
                            height: day.z4,
                            background: "var(--danger)",
                            borderRadius: "2px 2px 0 0",
                          }}
                        />
                      )}
                      {day.z3 > 0 && (
                        <div
                          style={{
                            height: day.z3,
                            background: "var(--warm)",
                            borderRadius: day.z4 ? 0 : "2px 2px 0 0",
                          }}
                        />
                      )}
                      {day.z2 > 0 && (
                        <div
                          style={{
                            height: day.z2,
                            background: "var(--accent)",
                            borderRadius:
                              day.z3 || day.z4 ? 0 : "2px 2px 0 0",
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
                <span
                  className="legend-swatch"
                  style={{ background: "var(--accent)" }}
                />
                Zone 2
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--warm)" }}
                />
                Zone 3
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--danger)" }}
                />
                Zone 4+
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                }}
              >
                Total · 4h 12m
              </div>
            </div>
          </div>

          <div className="card span-5">
            <div className="card-head">
              <div className="card-title">Recovery · WHOOP</div>
              <div className="card-meta">
                {whoop.connected ? "live" : "7-day rolling"}
              </div>
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
                  color: recoveryColor(recoveryScore),
                }}
              >
                {recoveryScore}
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
                {recoveryLabel(recoveryScore)}
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
                    borderBottom:
                      i < 3 ? "1px solid var(--hairline)" : "0",
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

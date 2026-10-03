"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useUserData } from "../lib/useUserData";
import { downloadCsv } from "../lib/csv";

interface WeightEntry {
  date: string; // ISO date string
  w: number;
}

function isoToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

// Down is the desired direction — used only to color deltas.
const deltaColor = (d: number | null) =>
  d == null ? "var(--faint)" : d === 0 ? "var(--muted)" : d < 0 ? "var(--accent)" : "var(--danger)";

export default function Weight() {
  const [entries, setEntries, loaded] = useUserData<WeightEntry[]>("weightEntries", []);
  const [draft, setDraft] = useState("");

  const submitWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(draft);
    if (isNaN(v) || v < 20 || v > 300) return;
    const today = isoToday();
    // Replace if already logged today, otherwise add
    const updated = entries.filter((en) => en.date !== today);
    updated.push({ date: today, w: v });
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setEntries(updated);
    setDraft("");
  };

  // 7-day moving average
  const movingAvg = useMemo(
    () =>
      entries.map((_, i) => {
        const s = Math.max(0, i - 6);
        const slice = entries.slice(s, i + 1);
        return slice.reduce((sum, x) => sum + x.w, 0) / slice.length;
      }),
    [entries]
  );

  // Weekly averages (Mon–Sun)
  const weeklyAvgs = useMemo(() => {
    if (entries.length === 0) return [];
    const weeks: Record<string, number[]> = {};
    for (const e of entries) {
      const d = new Date(e.date + "T12:00:00");
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1; // days since Monday
      const mon = new Date(d);
      mon.setDate(mon.getDate() - diff);
      const weekKey = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
      if (!weeks[weekKey]) weeks[weekKey] = [];
      weeks[weekKey].push(e.w);
    }
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mondayDate, weights]) => {
        const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
        const sun = new Date(mondayDate + "T12:00:00");
        sun.setDate(sun.getDate() + 6);
        return { mondayDate, avg, count: weights.length, sundayDate: `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}` };
      });
  }, [entries]);

  const exportWeight = useCallback(() => {
    const headers = ["Date", "Weight (kg)", "7-day Avg (kg)", "Weekly Avg (kg)", "Week Start"];
    const weekMap: Record<string, { avg: number; mondayDate: string }> = {};
    for (const wk of weeklyAvgs) {
      const d = new Date(wk.mondayDate + "T12:00:00");
      for (let i = 0; i < 7; i++) {
        const cur = new Date(d);
        cur.setDate(cur.getDate() + i);
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        weekMap[key] = { avg: wk.avg, mondayDate: wk.mondayDate };
      }
    }
    const rows = entries.map((e, i) => [
      e.date,
      e.w.toFixed(2),
      movingAvg[i].toFixed(2),
      weekMap[e.date] ? weekMap[e.date].avg.toFixed(2) : "",
      weekMap[e.date] ? weekMap[e.date].mondayDate : "",
    ]);
    downloadCsv("helix-weight.csv", headers, rows);
  }, [entries, movingAvg, weeklyAvgs]);

  // Chart
  const hasChart = entries.length >= 2;

  if (!loaded) {
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
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Body composition · weigh in every morning
          </div>
          <h1 className="page-title">
            Weight, <em>over time</em>
          </h1>
          <p className="page-sub">
            Log your morning weigh-in. The chart and weekly averages update as you go.
          </p>
        </div>
        <div className="page-chips">
          {entries.length > 0 && (
            <button
              onClick={exportWeight}
              className="chip"
              style={{ cursor: "pointer", border: "1.5px solid var(--faint)" }}
            >
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Log weight */}
        <form className="log-bar" onSubmit={submitWeight}>
          <div className="log-bar-label">Log this morning</div>
          <input
            className="log-input"
            placeholder="75.0"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(",", "."))}
            inputMode="decimal"
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
            kg · fasted
          </span>
          <button type="submit" className="btn accent">
            Log weight
          </button>
        </form>

        {/* Chart */}
        {hasChart && (
          <div className="card trend-card" style={{ marginTop: 20 }}>
            <div className="trend-head">
              <div>
                <div className="trend-title">
                  Daily weigh-in <em>vs.</em> 7-day moving average
                </div>
                <div className="trend-sub">
                  Bold line is the smoothed signal.
                </div>
              </div>
              <div className="legend">
                <div className="legend-item">
                  <span className="legend-swatch" style={{ background: "var(--faint)", borderRadius: 100, width: 8, height: 8 }} />
                  Daily
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ background: "var(--accent)" }} />
                  7-day avg
                </div>
              </div>
            </div>

            <WeightChart entries={entries} movingAvg={movingAvg} />
          </div>
        )}

        {/* Weekly averages */}
        {weeklyAvgs.length > 0 && (
          <>
            <div className="divider-label">Weekly averages</div>
            <div className="card" style={{ padding: 0 }}>
              {[...weeklyAvgs].reverse().map((wk, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? wk.avg - prev.avg : null;
                const monLabel = new Date(wk.mondayDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const sunLabel = new Date(wk.sundayDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const isCurrentWeek = i === 0;
                return (
                  <div
                    key={wk.mondayDate}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr",
                      padding: "16px 24px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--hairline)" : "0",
                      alignItems: "center",
                      background: isCurrentWeek ? "var(--surface-2)" : "transparent",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15 }}>
                        {monLabel} – {sunLabel}
                      </div>
                      {isCurrentWeek && (
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--accent)", marginTop: 2 }}>
                          THIS WEEK
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.02em" }}>
                      {wk.avg.toFixed(2)}{" "}
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                    </div>
                    <div style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: deltaColor(delta),
                      textAlign: "right",
                    }}>
                      {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} kg`}
                    </div>
                    <div style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--muted)",
                      textAlign: "right",
                    }}>
                      {wk.count} weigh-in{wk.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Recent entries */}
        {entries.length > 0 && (
          <>
            <div className="divider-label">Recent weigh-ins</div>
            <div className="card" style={{ padding: 0 }}>
              {[...entries]
                .reverse()
                .slice(0, 10)
                .map((e, i, arr) => {
                  const prev = arr[i + 1];
                  const delta = prev ? (e.w - prev.w).toFixed(2) : null;
                  return (
                    <div
                      key={e.date}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 1fr",
                        padding: "16px 24px",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--hairline)" : "0",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16 }}>
                        {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 24, letterSpacing: "-0.02em" }}>
                        {e.w.toFixed(2)}{" "}
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                      </div>
                      <div style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: deltaColor(delta == null ? null : Number(delta)),
                        textAlign: "right",
                      }}>
                        {delta == null ? "—" : `${Number(delta) > 0 ? "+" : ""}${delta} kg`}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {entries.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: "center", marginTop: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginBottom: 12 }}>
              No weigh-ins yet
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
              Log your first morning weight above to start tracking. The chart and stats will appear once you have at least 2 entries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WeightChart({
  entries,
  movingAvg,
}: {
  entries: WeightEntry[];
  movingAvg: number[];
}) {
  const allWeights = entries.map((e) => e.w);

  const yMin = Math.floor(Math.min(...allWeights) - 0.5);
  const yMax = Math.ceil(Math.max(...allWeights) + 0.5);

  const chartWidth = 1100;
  const chartHeight = 380;
  const padding = { top: 24, right: 32, bottom: 40, left: 56 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const n = entries.length;
  const xPos = (i: number) => padding.left + (i / Math.max(n - 1, 1)) * innerW;
  const yPos = (v: number) =>
    padding.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const ticks: number[] = [];
  const tickN = 5;
  for (let i = 0; i <= tickN; i++) {
    ticks.push(yMin + ((yMax - yMin) * i) / tickN);
  }

  const avgPath = movingAvg
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(v)}`)
    .join(" ");
  const avgArea = `${avgPath} L ${xPos(n - 1)} ${yPos(yMin)} L ${xPos(0)} ${yPos(yMin)} Z`;

  const labels = entries.map((e, i) => {
    if (i === 0 || i === n - 1 || (n > 14 && i % Math.ceil(n / 5) === 0)) {
      return new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    return "";
  });

  return (
    <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="weight-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={chartWidth - padding.right}
            y1={yPos(t)}
            y2={yPos(t)}
            stroke="var(--hairline)"
            strokeDasharray={i === 0 || i === ticks.length - 1 ? "" : "2 4"}
          />
          <text
            x={padding.left - 10}
            y={yPos(t) + 4}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--mono)"
            textAnchor="end"
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Data points */}
      {entries.map((e, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(e.w)} r="1.6" fill="var(--faint)" />
      ))}

      {/* Moving average */}
      <path d={avgArea} fill="url(#weight-grad)" />
      <path d={avgPath} stroke="var(--accent)" strokeWidth="2.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Current dot */}
      <circle cx={xPos(n - 1)} cy={yPos(movingAvg[n - 1])} r="10" fill="var(--accent)" opacity="0.15" />
      <circle cx={xPos(n - 1)} cy={yPos(movingAvg[n - 1])} r="4.5" fill="var(--accent)" />
      <text
        x={xPos(n - 1) - 12}
        y={yPos(movingAvg[n - 1]) - 14}
        fontSize="13"
        fill="var(--ink)"
        fontFamily="var(--serif)"
        textAnchor="end"
        fontStyle="italic"
      >
        {movingAvg[n - 1].toFixed(2)} kg
      </text>

      {/* X-axis labels */}
      {labels.map((lbl, i) =>
        lbl ? (
          <text
            key={i}
            x={xPos(i)}
            y={chartHeight - padding.bottom + 20}
            fontSize="10"
            fill="var(--muted)"
            fontFamily="var(--mono)"
            textAnchor="middle"
            letterSpacing="0.06em"
          >
            {lbl}
          </text>
        ) : null
      )}
    </svg>
  );
}

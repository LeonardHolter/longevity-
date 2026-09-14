"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useUserData } from "../lib/useUserData";
import { downloadCsv } from "../lib/csv";

interface WeightEntry {
  date: string; // ISO date string
  w: number;
}

interface WeightPlan {
  startWeight: number;
  startDate?: string; // ISO date the plan was set
  weeklyChange: number; // kg per week — negative for a cut
  weeks: number;
  targetWeight?: number;
  /** @deprecated legacy field from the gain-plan era */
  weeklyGain?: number;
}

// Current goal: cut through Nov 8 — 8 weeks at 0.4 kg/week down to ~68.5 kg
const DEFAULT_PLAN = { targetWeight: "68.5", weeklyChange: "-0.4", weeks: "8" };
const RESET_EPOCH = "2026-09-13";

function planRate(p: WeightPlan): number {
  return p.weeklyChange ?? p.weeklyGain ?? 0;
}

function planTarget(p: WeightPlan): number {
  return p.targetWeight ?? p.startWeight + planRate(p) * p.weeks;
}

function isoToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export default function Weight() {
  const [entries, setEntries, loadedEntries] = useUserData<WeightEntry[]>("weightEntries", []);
  const [plan, setPlan, loadedPlan] = useUserData<WeightPlan | null>("weightPlan", null);
  const [draft, setDraft] = useState("");
  const [planDraft, setPlanDraft] = useState(DEFAULT_PLAN);
  const [epoch, setEpoch, loadedEpoch] = useUserData<string>("weightEpoch", "");
  const loaded = loadedEntries && loadedPlan;

  // One-time reset (2026-09-13): wipe pre-cut weigh-ins and the old plan so the
  // cut through Nov 8 starts from a clean chart. Syncs to the server, so it
  // runs once per account, not per device.
  useEffect(() => {
    if (!loaded || !loadedEpoch || epoch === RESET_EPOCH) return;
    setEntries([]);
    setPlan(null);
    setEpoch(RESET_EPOCH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadedEpoch, epoch]);

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

    // If no plan exists yet, set start weight
    if (!plan) {
      setPlan({
        startWeight: v,
        startDate: today,
        weeklyChange: parseFloat(planDraft.weeklyChange) || -0.4,
        weeks: parseInt(planDraft.weeks) || 8,
        targetWeight: parseFloat(planDraft.targetWeight) || undefined,
      });
    }
  };

  const submitPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const weeklyChange = parseFloat(planDraft.weeklyChange);
    const weeks = parseInt(planDraft.weeks);
    const target = parseFloat(planDraft.targetWeight);
    if (isNaN(weeklyChange) || isNaN(weeks) || weeks < 1) return;
    const startWeight = entries.length > 0 ? entries[entries.length - 1].w : 0;
    setPlan({
      startWeight,
      startDate: isoToday(),
      weeklyChange,
      weeks,
      targetWeight: isNaN(target) ? undefined : target,
    });
  };

  const rate = plan ? planRate(plan) : 0;
  const isCut = rate < 0;
  // Sign that counts as "on goal" for coloring deltas
  const goodSign = isCut ? -1 : 1;
  const deltaColor = (d: number | null) =>
    d == null ? "var(--faint)" : d === 0 ? "var(--muted)" : Math.sign(d) === goodSign ? "var(--accent)" : "var(--danger)";

  const current = entries.length > 0 ? entries[entries.length - 1].w : null;
  const startW = plan ? plan.startWeight : entries.length > 0 ? entries[0].w : null;
  const totalChange = current != null && startW != null ? (current - startW).toFixed(1) : null;

  const targetWeight = plan ? planTarget(plan) : null;
  const remaining = current != null && targetWeight != null ? (targetWeight - current).toFixed(1) : null;

  // Weeks elapsed since the plan started (or since first entry, for legacy plans)
  const weeksElapsed = useMemo(() => {
    if (entries.length === 0) return 0;
    const startIso = plan?.startDate ?? entries[0].date;
    const first = new Date(startIso + "T12:00:00").getTime();
    const last = new Date(entries[entries.length - 1].date + "T12:00:00").getTime();
    return Math.max(0, (last - first) / (7 * 24 * 3600 * 1000));
  }, [entries, plan]);

  const actualWeeklyRate = useMemo(() => {
    if (weeksElapsed < 0.5 || totalChange == null) return null;
    return (parseFloat(totalChange) / weeksElapsed).toFixed(2);
  }, [weeksElapsed, totalChange]);

  // Where the plan says you should be today
  const paceWeight = useMemo(() => {
    if (!plan || !plan.startDate) return null;
    const now = new Date(isoToday() + "T12:00:00").getTime();
    const start = new Date(plan.startDate + "T12:00:00").getTime();
    const w = Math.min(plan.weeks, Math.max(0, (now - start) / (7 * 24 * 3600 * 1000)));
    return plan.startWeight + rate * w;
  }, [plan, rate]);

  const weeksLeft = plan ? Math.max(0, plan.weeks - weeksElapsed) : null;

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
      const sun = new Date(d);
      sun.setDate(sun.getDate() + 6);
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
            {plan
              ? `${isCut ? "Losing" : "Gaining"} ${Math.abs(rate)} kg/week over ${plan.weeks} weeks. Target: ${targetWeight!.toFixed(1)} kg.`
              : "Cut through Nov 8. Log your first morning weigh-in to lock in the plan."}
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
        {/* Plan setup */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--muted)",
            marginBottom: 16,
          }}>
            {plan ? (isCut ? "CUT PLAN" : "GAIN PLAN") : "SET YOUR PLAN"}
          </div>

          <form onSubmit={submitPlan} style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--muted)",
                marginBottom: 6,
              }}>
                Target weight (kg)
              </label>
              <input
                className="log-input"
                value={planDraft.targetWeight}
                onChange={(e) => setPlanDraft({ ...planDraft, targetWeight: e.target.value.replace(",", ".") })}
                inputMode="decimal"
                style={{ width: 100 }}
              />
            </div>
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--muted)",
                marginBottom: 6,
              }}>
                Weekly change (kg)
              </label>
              <input
                className="log-input"
                value={planDraft.weeklyChange}
                onChange={(e) => setPlanDraft({ ...planDraft, weeklyChange: e.target.value.replace(",", ".") })}
                inputMode="decimal"
                style={{ width: 100 }}
              />
            </div>
            <div>
              <label style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--muted)",
                marginBottom: 6,
              }}>
                Duration (weeks)
              </label>
              <input
                className="log-input"
                value={planDraft.weeks}
                onChange={(e) => setPlanDraft({ ...planDraft, weeks: e.target.value })}
                inputMode="numeric"
                style={{ width: 100 }}
              />
            </div>
            <button type="submit" className="btn accent">
              {plan ? "Update plan" : "Set plan"}
            </button>
          </form>

          {plan && (
            <div className="weight-plan-stats" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 20,
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid var(--hairline)",
            }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>START</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 4 }}>
                  {plan.startWeight.toFixed(1)} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>TARGET</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 4, color: "var(--accent)" }}>
                  {targetWeight!.toFixed(1)} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>REMAINING</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 4 }}>
                  {remaining ? `${Number(remaining) > 0 ? "+" : ""}${remaining}` : "—"} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                </div>
              </div>
              {paceWeight != null && (
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>ON PACE</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 4 }}>
                    {paceWeight.toFixed(1)} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg</span>
                  </div>
                  {weeksLeft != null && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                      {weeksLeft.toFixed(1)} wk left
                    </div>
                  )}
                </div>
              )}
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>ACTUAL RATE</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginTop: 4, color: actualWeeklyRate ? deltaColor(Number(actualWeeklyRate)) : "var(--ink)" }}>
                  {actualWeeklyRate ? `${Number(actualWeeklyRate) >= 0 ? "+" : ""}${actualWeeklyRate}` : "—"} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>kg/wk</span>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  {plan && `Target line at ${targetWeight!.toFixed(1)} kg. `}
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
                {plan && (
                  <div className="legend-item">
                    <span className="legend-swatch" style={{ background: "var(--accent)", borderTop: "1px dashed", height: 0 }} />
                    Target
                  </div>
                )}
              </div>
            </div>

            <WeightChart entries={entries} movingAvg={movingAvg} targetWeight={targetWeight} />
          </div>
        )}

        {/* Weekly averages */}
        {weeklyAvgs.length > 0 && (
          <>
            <div className="divider-label">Weekly averages · read on Sundays</div>
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
  targetWeight,
}: {
  entries: WeightEntry[];
  movingAvg: number[];
  targetWeight: number | null;
}) {
  const allWeights = entries.map((e) => e.w);
  if (targetWeight) allWeights.push(targetWeight);

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

      {/* Target line */}
      {targetWeight && (
        <>
          <line
            x1={padding.left}
            x2={chartWidth - padding.right}
            y1={yPos(targetWeight)}
            y2={yPos(targetWeight)}
            stroke="var(--accent)"
            strokeDasharray="5 5"
            strokeWidth="1.2"
          />
          <text
            x={chartWidth - padding.right - 8}
            y={yPos(targetWeight) - 6}
            fontSize="10"
            fill="var(--accent)"
            fontFamily="var(--mono)"
            textAnchor="end"
            letterSpacing="0.1em"
          >
            TARGET · {targetWeight.toFixed(1)}
          </text>
        </>
      )}

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

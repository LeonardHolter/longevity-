"use client";

import React, { useState, useMemo } from "react";

interface WeightEntry {
  date: Date;
  w: number;
}

function generateEntries(): WeightEntry[] {
  const start = new Date();
  start.setDate(start.getDate() - 119);
  const arr: WeightEntry[] = [];
  let w = 78.4;
  for (let i = 0; i < 120; i++) {
    const drift = -0.024;
    const noise =
      Math.sin(i * 0.6) * 0.18 +
      Math.cos(i * 1.3) * 0.12 +
      (i % 7 === 6 ? 0.4 : 0);
    w = w + drift + noise * 0.1;
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    arr.push({ date, w: parseFloat(w.toFixed(2)) });
  }
  const adjust = 74.6 - arr[arr.length - 1].w;
  return arr.map((e) => ({
    ...e,
    w: parseFloat((e.w + adjust).toFixed(2)),
  }));
}

export default function Weight() {
  const [entries, setEntries] = useState<WeightEntry[]>(() => generateEntries());
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(draft);
    if (isNaN(v)) return;
    const last = entries[entries.length - 1];
    const date = new Date(last.date);
    date.setDate(date.getDate() + 1);
    setEntries([...entries, { date, w: v }]);
    setDraft("");
  };

  const current = entries[entries.length - 1].w;
  const start = entries[0].w;
  const monthAgo = entries[entries.length - 30].w;
  const goal = 73.0;
  const remaining = (current - goal).toFixed(1);
  const total = (start - current).toFixed(1);
  const last30 = (monthAgo - current).toFixed(1);

  const movingAvg = useMemo(
    () =>
      entries.map((_, i) => {
        const s = Math.max(0, i - 6);
        const slice = entries.slice(s, i + 1);
        return slice.reduce((sum, x) => sum + x.w, 0) / slice.length;
      }),
    [entries]
  );

  const labels = entries.map((e, i) => {
    if (i === 0 || i === entries.length - 1 || i % 30 === 0) {
      return e.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    return "";
  });

  const yMin = Math.floor(Math.min(...entries.map((e) => e.w)) - 0.5);
  const yMax = Math.ceil(Math.max(...entries.map((e) => e.w)) + 0.5);

  const chartWidth = 1100;
  const chartHeight = 380;
  const padding = { top: 24, right: 32, bottom: 40, left: 56 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const n = entries.length;
  const xPos = (i: number) => padding.left + (i / (n - 1)) * innerW;
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

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Body composition · daily morning weigh-in
          </div>
          <h1 className="page-title">
            Weight, <em>over time</em>
          </h1>
          <p className="page-sub">
            120 days of morning-fasted measurements. 7-day moving average
            smooths out the daily noise from hydration, sodium, and circadian
            shifts.
          </p>
        </div>
        <div className="page-chips">
          <span className="chip live">Synced 06:48</span>
          <span className="chip">Withings · scale</span>
        </div>
      </div>

      <div className="page-body">
        <div className="weight-stats">
          <div className="wstat">
            <div className="wstat-label">Current</div>
            <div className="wstat-val">
              {current.toFixed(1)}
              <span className="unit">kg</span>
            </div>
            <div className="wstat-foot">measured today, 06:48</div>
          </div>
          <div className="wstat">
            <div className="wstat-label">30-day Δ</div>
            <div className="wstat-val">
              −{last30}
              <span className="unit">kg</span>
            </div>
            <div className="wstat-foot up">on pace · ~0.5kg/wk</div>
          </div>
          <div className="wstat">
            <div className="wstat-label">Total lost</div>
            <div className="wstat-val">
              −{total}
              <span className="unit">kg</span>
            </div>
            <div className="wstat-foot">
              since{" "}
              {entries[0].date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="wstat">
            <div className="wstat-label">To goal</div>
            <div className="wstat-val" style={{ color: "var(--accent)" }}>
              {remaining}
              <span className="unit">kg</span>
            </div>
            <div className="wstat-foot up">
              eta ~3 weeks at current pace
            </div>
          </div>
        </div>

        <div className="card trend-card" style={{ marginTop: 20 }}>
          <div className="trend-head">
            <div>
              <div className="trend-title">
                Daily weigh-in <em>vs.</em> 7-day moving average
              </div>
              <div className="trend-sub">
                Goal of 73.0 kg shown as the horizontal threshold. Faint marks
                are raw daily readings; the bold line is the smoothed signal.
              </div>
            </div>
            <div className="legend">
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{
                    background: "var(--faint)",
                    borderRadius: 100,
                    width: 8,
                    height: 8,
                  }}
                />
                Daily
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--accent)" }}
                />
                7-day avg
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{
                    background: "var(--danger)",
                    borderTop: "1px dashed",
                    height: 0,
                  }}
                />
                Goal · 73.0
              </div>
            </div>
          </div>

          <svg
            width="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient
                id="weight-grad"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity={0}
                />
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
                  strokeDasharray={
                    i === 0 || i === ticks.length - 1 ? "" : "2 4"
                  }
                />
                <text
                  x={padding.left - 10}
                  y={yPos(t) + 4}
                  fontSize="10"
                  fill="var(--muted)"
                  fontFamily="var(--mono)"
                  textAnchor="end"
                >
                  {t.toFixed(0)}
                </text>
              </g>
            ))}
            <text
              x={padding.left - 48}
              y={padding.top - 8}
              fontSize="9"
              fill="var(--faint)"
              fontFamily="var(--mono)"
              letterSpacing="0.1em"
            >
              KG
            </text>

            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={yPos(goal)}
              y2={yPos(goal)}
              stroke="var(--danger)"
              strokeDasharray="5 5"
              strokeWidth="1.2"
            />
            <text
              x={chartWidth - padding.right - 8}
              y={yPos(goal) - 6}
              fontSize="10"
              fill="var(--danger)"
              fontFamily="var(--mono)"
              textAnchor="end"
              letterSpacing="0.1em"
            >
              GOAL · 73.0
            </text>

            {entries.map((e, i) => (
              <circle
                key={i}
                cx={xPos(i)}
                cy={yPos(e.w)}
                r="1.6"
                fill="var(--faint)"
              />
            ))}

            <path d={avgArea} fill="url(#weight-grad)" />
            <path
              d={avgPath}
              stroke="var(--accent)"
              strokeWidth="2.25"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx={xPos(n - 1)}
              cy={yPos(movingAvg[n - 1])}
              r="10"
              fill="var(--accent)"
              opacity="0.15"
            />
            <circle
              cx={xPos(n - 1)}
              cy={yPos(movingAvg[n - 1])}
              r="4.5"
              fill="var(--accent)"
            />
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
        </div>

        <form className="log-bar" onSubmit={submit}>
          <div className="log-bar-label">Log this morning</div>
          <input
            className="log-input"
            placeholder="74.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="decimal"
          />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            kg · fasted
          </span>
          <button type="submit" className="btn accent">
            Log weight
          </button>
        </form>

        <div className="divider-label">Recent weigh-ins</div>
        <div className="card" style={{ padding: 0 }}>
          {[...entries]
            .reverse()
            .slice(0, 8)
            .map((e, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? (e.w - prev.w).toFixed(2) : null;
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                    padding: "16px 24px",
                    borderBottom:
                      i < 7 ? "1px solid var(--hairline)" : "0",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontStyle: "italic",
                      fontSize: 16,
                    }}
                  >
                    {e.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 24,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {e.w.toFixed(2)}{" "}
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      kg
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color:
                        delta == null
                          ? "var(--faint)"
                          : Number(delta) > 0
                          ? "var(--danger)"
                          : "var(--accent)",
                    }}
                  >
                    {delta == null
                      ? "—"
                      : `${Number(delta) > 0 ? "+" : ""}${delta} kg`}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--muted)",
                      textAlign: "right",
                      letterSpacing: "0.08em",
                    }}
                  >
                    06:{40 + (i % 8)} · FASTED
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

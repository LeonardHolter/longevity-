"use client";

import React, { useState } from "react";
import { StrengthSparkline } from "./Charts";

interface Lift {
  id: string;
  name: string;
  day: string;
  group: string;
  scheme: string;
  type: "weight" | "reps";
  unit: string;
}

const LIFTS: Lift[] = [
  { id: "bench", name: "Bench press", day: "MON", group: "Push + core", scheme: "3 × 6–8", type: "weight", unit: "kg" },
  { id: "ohp", name: "Overhead press", day: "MON", group: "Push + core", scheme: "3 × 8", type: "weight", unit: "kg" },
  { id: "leg-raise", name: "Hanging leg raise", day: "MON", group: "Push + core", scheme: "3 × 10", type: "reps", unit: "reps" },
  { id: "row", name: "Barbell row", day: "WED", group: "Pull + core", scheme: "3 × 6–8", type: "weight", unit: "kg" },
  { id: "pullup", name: "Pull-up", day: "WED", group: "Pull + core", scheme: "3 × AMRAP", type: "reps", unit: "reps" },
  { id: "crunch", name: "Crunch", day: "WED", group: "Pull + core", scheme: "3 × 15", type: "reps", unit: "reps" },
  { id: "squat", name: "Back squat", day: "FRI", group: "Legs", scheme: "3 × 5–8", type: "weight", unit: "kg" },
  { id: "rdl", name: "Romanian deadlift", day: "FRI", group: "Legs", scheme: "3 × 8", type: "weight", unit: "kg" },
  { id: "lunge", name: "Walking lunge", day: "FRI", group: "Legs", scheme: "3 × 10/leg", type: "reps", unit: "reps/leg" },
];

function genSeries(startVal: number, perWeek: number, weeks: number, noise: number = 0): number[] {
  const arr: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const v = startVal + perWeek * i + Math.sin(i * 1.7) * noise;
    arr.push(parseFloat(v.toFixed(1)));
  }
  return arr;
}

const PROGRESS: Record<string, { hist: number[]; best: string; e1rm: number | null }> = {
  bench: { hist: genSeries(72.5, 0.6, 16, 1.2), best: "8 × 95 kg", e1rm: 118 },
  ohp: { hist: genSeries(45, 0.35, 16, 0.6), best: "8 × 50 kg", e1rm: 63 },
  "leg-raise": { hist: genSeries(8, 0.3, 16, 0.5), best: "12 reps", e1rm: null },
  row: { hist: genSeries(70, 0.5, 16, 1.0), best: "8 × 90 kg", e1rm: 112 },
  pullup: { hist: genSeries(7, 0.4, 16, 0.6), best: "13 reps", e1rm: null },
  crunch: { hist: genSeries(15, 0, 16, 0), best: "15 × 3", e1rm: null },
  squat: { hist: genSeries(95, 1.0, 16, 1.5), best: "5 × 122 kg", e1rm: 142 },
  rdl: { hist: genSeries(90, 0.8, 16, 1.2), best: "8 × 110 kg", e1rm: 138 },
  lunge: { hist: genSeries(10, 0.2, 16, 0.4), best: "12/leg @ BW+20", e1rm: null },
};

function SetRow({
  idx,
  unit,
  target,
  isWeight,
}: {
  idx: number;
  unit: string;
  target: { w?: number; r: number };
  isWeight: boolean;
}) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const done = isWeight ? w !== "" && r !== "" : r !== "";

  return (
    <div className={`set-row${!isWeight ? " single-col" : ""}`}>
      <div className="set-idx">{idx}</div>
      {isWeight && (
        <div className="set-cell">
          <label>Weight</label>
          <div className="set-input-wrap">
            <input
              value={w}
              onChange={(e) => setW(e.target.value)}
              placeholder={String(target.w)}
              inputMode="decimal"
            />
            <span className="set-unit">{unit}</span>
          </div>
        </div>
      )}
      <div className="set-cell">
        <label>Reps</label>
        <div className="set-input-wrap">
          <input
            value={r}
            onChange={(e) => setR(e.target.value)}
            placeholder={String(target.r)}
            inputMode="numeric"
          />
          <span className="set-unit">{isWeight ? "" : unit}</span>
        </div>
      </div>
      <div className="set-target">
        {isWeight
          ? `target ${target.w}${unit} × ${target.r}`
          : `target ${target.r} ${unit}`}
      </div>
      <div className={`set-status${done ? " done" : ""}`}>
        {done ? "Logged" : "—"}
      </div>
    </div>
  );
}

function ExerciseLogCard({ lift }: { lift: Lift }) {
  const p = PROGRESS[lift.id];
  const lastVal = p.hist[p.hist.length - 1];
  const isWeight = lift.type === "weight";
  const target = isWeight
    ? { w: Math.round(lastVal * 0.95 * 2) / 2, r: lift.scheme.includes("6–8") ? 7 : 8 }
    : { r: Math.ceil(lastVal) };

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <div>
          <div className="exercise-name">{lift.name}</div>
          <div className="exercise-meta">{lift.scheme}</div>
        </div>
        <div className="exercise-best">
          <div className="exercise-best-label">Best set</div>
          <div className="exercise-best-val">{p.best}</div>
        </div>
      </div>

      <div className="set-list">
        {[1, 2, 3].map((n) => (
          <SetRow
            key={n}
            idx={n}
            unit={isWeight ? "kg" : "reps"}
            target={target}
            isWeight={isWeight}
          />
        ))}
      </div>

      <div className="exercise-foot">
        <div className="rpe-row">
          <span className="rpe-label">RPE</span>
          {[6, 7, 8, 9, 10].map((n) => (
            <button key={n} className="rpe-pip">
              {n}
            </button>
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ fontSize: 12, padding: "8px 14px" }}
        >
          Add note
        </button>
      </div>
    </div>
  );
}

function ProgressionRow({ lift }: { lift: Lift }) {
  const p = PROGRESS[lift.id];
  const last = p.hist[p.hist.length - 1];
  const start = p.hist[0];
  const delta = ((last - start) / start) * 100;
  const isWeight = lift.type === "weight";

  return (
    <div className="prog-row">
      <div className="prog-meta">
        <div className="prog-name">{lift.name}</div>
        <div className="prog-meta-row">
          <span className="prog-day">{lift.day}</span>
          <span className="prog-scheme">{lift.scheme}</span>
        </div>
      </div>

      <div className="prog-chart">
        <StrengthSparkline
          values={p.hist}
          color={isWeight ? "var(--accent)" : "var(--warm)"}
        />
      </div>

      <div className="prog-stats">
        <div>
          <div className="prog-stat-label">Current</div>
          <div className="prog-stat-val">
            {last.toFixed(isWeight ? 1 : 0)}
            <span className="unit">{isWeight ? "kg" : lift.unit}</span>
          </div>
        </div>
        <div>
          <div className="prog-stat-label">16-week Δ</div>
          <div className="prog-stat-val" style={{ color: "var(--accent)" }}>
            +{delta.toFixed(0)}
            <span className="unit">%</span>
          </div>
        </div>
        {p.e1rm && (
          <div>
            <div className="prog-stat-label">est. 1RM</div>
            <div className="prog-stat-val">
              {p.e1rm}
              <span className="unit">kg</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PR_DATA = [
  { lift: "Back squat", val: "5 × 122 kg", when: "Fri · 2 days ago", delta: "+5 kg" },
  { lift: "Pull-up", val: "13 reps", when: "Wed · 4 days ago", delta: "+2 reps" },
  { lift: "Bench press", val: "8 × 95 kg", when: "Mon · last week", delta: "+2.5 kg" },
  { lift: "Romanian deadlift", val: "8 × 110 kg", when: "Fri · 9 days ago", delta: "+5 kg" },
  { lift: "Overhead press", val: "8 × 50 kg", when: "Mon · 2 wk ago", delta: "+2.5 kg" },
];

export default function Strength() {
  const dayList = ["MON", "WED", "FRI"];
  const [activeDay, setActiveDay] = useState("MON");
  const session = LIFTS.filter((l) => l.day === activeDay);
  const sessionGroup = session[0]?.group;

  const volumeByWeek = [
    9.2, 9.6, 10.1, 9.4, 10.8, 11.2, 11.0, 11.8, 12.3, 12.1, 12.9, 13.4,
    13.1, 13.8, 14.2, 14.6,
  ];
  const sessionStreak = 11;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Strength · 3-day full-body split
          </div>
          <h1 className="page-title">
            Lift the <em>needle</em>
          </h1>
          <p className="page-sub">
            Push, pull, legs. Five main lifts get loaded; the accessory work
            earns its place through reps and clean execution. Progressive
            overload is the only thing that builds muscle and bone density past
            30.
          </p>
        </div>
        <div className="page-chips">
          <span className="chip live">{sessionStreak}-session streak</span>
          <span className="chip">Last lift · yesterday</span>
        </div>
      </div>

      <div className="page-body">
        <div className="session-shell">
          <div className="session-head">
            <div>
              <div className="session-eyebrow">Today&apos;s session</div>
              <div className="session-title">
                <span className="session-day-tag">{activeDay}</span>
                <span className="session-group">{sessionGroup}</span>
              </div>
            </div>
            <div className="session-switch">
              {dayList.map((d) => (
                <button
                  key={d}
                  className={`session-switch-btn${d === activeDay ? " active" : ""}`}
                  onClick={() => setActiveDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="exercise-grid">
            {session.map((lift) => (
              <ExerciseLogCard key={lift.id} lift={lift} />
            ))}
          </div>
        </div>

        <div className="divider-label">Progression · 16-week history</div>
        <div className="card" style={{ padding: 0 }}>
          {LIFTS.map((lift) => (
            <ProgressionRow key={lift.id} lift={lift} />
          ))}
        </div>

        <div className="divider-label">Volume &amp; milestones</div>
        <div className="dash-grid">
          <div className="card span-7">
            <div className="card-head">
              <div className="card-title">Weekly volume · tonnage moved</div>
              <div className="card-meta">tonnes (kg × reps, all lifts)</div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${volumeByWeek.length}, 1fr)`,
                gap: 6,
                alignItems: "end",
                height: 200,
              }}
            >
              {volumeByWeek.map((v, i) => {
                const max = Math.max(...volumeByWeek);
                const h = (v / max) * 100;
                const isLast = i === volumeByWeek.length - 1;
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
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          height: `${h}%`,
                          background: isLast
                            ? "var(--accent)"
                            : "var(--accent-soft)",
                          borderRadius: "3px 3px 0 0",
                          position: "relative",
                        }}
                      >
                        {isLast && (
                          <div
                            style={{
                              position: "absolute",
                              top: -22,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontFamily: "var(--serif)",
                              fontStyle: "italic",
                              fontSize: 14,
                              color: "var(--accent)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {v.toFixed(1)}t
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: "var(--muted)",
                      }}
                    >
                      w{i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--hairline)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                }}
              >
                +58% TOTAL VOLUME / 16wk
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--accent)",
                }}
              >
                ● ON PROGRESSION
              </div>
            </div>
          </div>

          <div className="card span-5">
            <div className="card-head">
              <div className="card-title">Recent PRs</div>
              <div className="card-meta">last 30 days</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {PR_DATA.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 80px",
                    gap: 12,
                    alignItems: "baseline",
                    padding: "14px 0",
                    borderBottom:
                      i < 4 ? "1px solid var(--hairline)" : "0",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--serif)",
                        fontStyle: "italic",
                        fontSize: 16,
                      }}
                    >
                      {r.lift}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--muted)",
                        marginTop: 2,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {r.when}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 18,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {r.val}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--accent)",
                      textAlign: "right",
                      background: "var(--accent-soft)",
                      padding: "4px 8px",
                      borderRadius: 100,
                      justifySelf: "end",
                    }}
                  >
                    {r.delta}
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

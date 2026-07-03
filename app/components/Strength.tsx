"use client";

import React, { useState, useCallback, useRef } from "react";
import { useUserData } from "../lib/useUserData";
import { downloadCsv } from "../lib/csv";
import { OpponentButton } from "./OpponentView";
import { LineChart } from "./Charts";

interface Exercise {
  name: string;
  scheme: string;
}

interface SetData {
  weight: string;
  reps: string;
  ropes?: 1 | 2;
}

// strengthLogs shape: { "2026-05-17": { "mon": { "Leg press": [{ weight: "100", reps: "10" }, ...] } } }
type StrengthLogs = Record<string, Record<string, Record<string, SetData[]>>>;

interface Day {
  id: string;
  label: string;
  tag: string;
  duration: string;
  type: "lift" | "cardio";
  exercises: Exercise[];
  notes?: string;
}

const WEEK: Day[] = [
  {
    id: "mon",
    label: "Monday",
    tag: "BACK & CHEST",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Hang-ups", scheme: "3 × 8–14" },
      { name: "Rows", scheme: "3 × 8–12" },
      { name: "Pec deck fly", scheme: "3 × 8–12" },
      { name: "Incline bench press", scheme: "3 × 8–12" },
    ],
  },
  {
    id: "tue",
    label: "Tuesday",
    tag: "Z2 CARDIO",
    duration: "30 min",
    type: "cardio",
    exercises: [
      { name: "Zone 2 cardio", scheme: "30 min @ 120–140 bpm" },
    ],
    notes: "Conversational pace. Keep heart rate in zone 2.",
  },
  {
    id: "wed",
    label: "Wednesday",
    tag: "BICEPS & SHOULDERS",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Bicep curls", scheme: "3 × 6–10" },
      { name: "Hammer curls", scheme: "1 × 6–10" },
      { name: "Dumbbell shoulder press", scheme: "3 × 6–10" },
      { name: "Forearm curls (dumbbells)", scheme: "3 × 8–12" },
    ],
    notes: "6–10 reps per set. Hammer curls to finish off biceps.",
  },
  {
    id: "thu",
    label: "Thursday",
    tag: "LEGS & ABS",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Leg press", scheme: "3 × 8–12" },
      { name: "Leg extension", scheme: "3 × 10–15" },
      { name: "Leg curls", scheme: "3 × 10–15" },
      { name: "Ab crunches (mat)", scheme: "3 × 15–20" },
      { name: "Leg raises", scheme: "3 × 10–15" },
    ],
    notes: "Machines for leg work. Crunches on mat.",
  },
  {
    id: "fri",
    label: "Friday",
    tag: "TRICEPS & CHEST",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Tricep rope pushdown", scheme: "3 × 8–12" },
      { name: "Wide chest fly", scheme: "3 × 8–12" },
      { name: "Incline bench press", scheme: "3 × 8–12" },
    ],
  },
  {
    id: "sat",
    label: "Saturday",
    tag: "4×4 HIIT",
    duration: "~45 min",
    type: "cardio",
    exercises: [
      { name: "Warm-up (building)", scheme: "10 min" },
      { name: "Hard interval", scheme: "4 min @ 90–95% HRmax" },
      { name: "Easy jog", scheme: "3 min @ ~70% HRmax" },
      { name: "× 4 intervals", scheme: "" },
      { name: "Cool-down", scheme: "5 min" },
    ],
    notes: "Norwegian 4×4 protocol. ~175–185 bpm on intervals, ~135 bpm recovery.",
  },
  {
    id: "sun",
    label: "Sunday",
    tag: "Z2 CARDIO",
    duration: "30 min",
    type: "cardio",
    exercises: [
      { name: "Zone 2 cardio", scheme: "30 min @ 120–140 bpm" },
    ],
    notes: "Conversational pace. Easy effort.",
  },
];

function isRopeExercise(name: string) {
  return /rope/i.test(name);
}

function normalizedWeight(s: SetData): number {
  const w = parseFloat(s.weight) || 0;
  return s.ropes === 2 ? w * 2 : w;
}

function getLastSession(
  logs: StrengthLogs,
  today: string,
  dayId: string,
  exerciseName: string,
): SetData[] | null {
  const dates = Object.keys(logs).sort().reverse();
  for (const date of dates) {
    if (date >= today) continue;
    const dayData = logs[date]?.[dayId];
    if (!dayData) continue;
    const sets = dayData[exerciseName];
    if (sets && sets.some((s) => s.weight !== "" || s.reps !== "")) return sets;
  }
  return null;
}

function SetRow({
  idx,
  exercise,
  setData,
  prevSet,
  onUpdate,
}: {
  idx: number;
  exercise: Exercise;
  setData: SetData;
  prevSet: SetData | null;
  onUpdate: (data: SetData) => void;
}) {
  const hasWeight = !exercise.scheme.includes("min") && !exercise.scheme.includes("sec");
  const done = hasWeight ? setData.weight !== "" && setData.reps !== "" : setData.reps !== "";
  const isRope = isRopeExercise(exercise.name);
  const ropeVal = setData.ropes ?? 1;

  const prevNorm = prevSet
    ? normalizedWeight(prevSet)
    : 0;
  const prevLabel = prevSet
    ? hasWeight && prevSet.weight && prevSet.reps
      ? `${prevNorm} kg × ${prevSet.reps}`
      : prevSet.reps || null
    : null;

  return (
    <div className={`set-row${!hasWeight ? " single-col" : ""}`}>
      <div className="set-idx">{idx}</div>
      {hasWeight && (
        <div className="set-cell">
          <label>Weight</label>
          <div className="set-input-wrap">
            <input
              value={setData.weight}
              onChange={(e) => onUpdate({ ...setData, weight: e.target.value.replace(",", ".") })}
              placeholder={prevSet?.weight || "—"}
              inputMode="decimal"
            />
            <span className="set-unit">kg</span>
          </div>
        </div>
      )}
      {isRope && hasWeight && (
        <div className="set-cell">
          <label>Machine</label>
          <div style={{ display: "flex", gap: 2 }}>
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => onUpdate({ ...setData, ropes: n })}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: ropeVal === n ? "var(--accent)" : "var(--surface-2)",
                  color: ropeVal === n ? "var(--bg)" : "var(--muted)",
                  transition: "all 0.15s",
                }}
              >
                {n === 1 ? "1 rope" : "2 ropes"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="set-cell">
        <label>{hasWeight ? "Reps" : "Done"}</label>
        <div className="set-input-wrap">
          <input
            value={setData.reps}
            onChange={(e) => onUpdate({ ...setData, reps: e.target.value })}
            placeholder={prevSet?.reps || "—"}
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="set-target">
        {exercise.scheme}
      </div>
      <div className={`set-status${done ? " done" : ""}`}>
        {done ? (
          isRope ? (
            <span style={{ fontSize: 10 }}>
              = {normalizedWeight(setData)} kg eff.
            </span>
          ) : "Logged"
        ) : prevLabel ? (
          <span style={{ color: "var(--muted)", fontSize: 10 }}>Last: {prevLabel}</span>
        ) : "—"}
      </div>
    </div>
  );
}

function getExerciseHistory(
  logs: StrengthLogs,
  dayId: string,
  exerciseName: string,
): { date: string; bestWeight: number; bestReps: number; volume: number }[] {
  const history: { date: string; bestWeight: number; bestReps: number; volume: number }[] = [];
  const dates = Object.keys(logs).sort();
  for (const date of dates) {
    const sets = logs[date]?.[dayId]?.[exerciseName];
    if (!sets) continue;
    let bestWeight = 0;
    let bestReps = 0;
    let volume = 0;
    for (const s of sets) {
      const w = normalizedWeight(s);
      const r = parseInt(s.reps) || 0;
      if (w > bestWeight || (w === bestWeight && r > bestReps)) {
        bestWeight = w;
        bestReps = r;
      }
      volume += w * r;
    }
    if (bestWeight > 0) history.push({ date, bestWeight, bestReps, volume });
  }
  return history;
}

function ExerciseLogCard({
  exercise,
  sets,
  prevSets,
  allLogs,
  dayId,
  onSetUpdate,
}: {
  exercise: Exercise;
  sets: SetData[];
  prevSets: SetData[] | null;
  allLogs: StrengthLogs;
  dayId: string;
  onSetUpdate: (setIdx: number, data: SetData) => void;
}) {
  const [showGraph, setShowGraph] = useState(false);
  const setsMatch = exercise.scheme.match(/^(\d+)\s*×/);
  const numSets = setsMatch ? parseInt(setsMatch[1]) : 1;
  const isTimeBased = exercise.scheme.includes("min") || exercise.scheme.includes("sec");
  const history = showGraph ? getExerciseHistory(allLogs, dayId, exercise.name) : [];

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <div style={{ flex: 1 }}>
          <div className="exercise-name">{exercise.name}</div>
          <div className="exercise-meta">{exercise.scheme}</div>
        </div>
        {!isTimeBased && (
          <button
            onClick={() => setShowGraph(!showGraph)}
            style={{
              background: showGraph ? "var(--accent)" : "transparent",
              color: showGraph ? "var(--bg)" : "var(--muted)",
              border: showGraph ? "none" : "1.5px solid var(--faint)",
              borderRadius: 6,
              padding: "4px 10px",
              fontFamily: "var(--mono)",
              fontSize: 10,
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.06em",
            }}
          >
            {showGraph ? "✕" : "↗ Graph"}
          </button>
        )}
      </div>

      {showGraph && history.length >= 2 && (
        <div style={{
          padding: "16px 0 12px",
          borderBottom: "1px solid var(--hairline)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 12,
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>
              BEST SET · {history.length} SESSIONS
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>
              {history[history.length - 1].bestWeight} kg
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
                × {history[history.length - 1].bestReps}
              </span>
            </div>
          </div>
          <LineChart
            width={480}
            height={160}
            padding={{ top: 16, right: 16, bottom: 32, left: 44 }}
            yUnit="KG"
            yTicks={3}
            xLabels={history.map((h) =>
              new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
            )}
            series={[{
              values: history.map((h) => h.bestWeight),
              color: "var(--accent)",
              width: 2,
              fill: true,
              dots: true,
              dotR: 3,
              endLabel: true,
            }]}
          />
          {history.length >= 2 && (() => {
            const first = history[0].bestWeight;
            const last = history[history.length - 1].bestWeight;
            const diff = last - first;
            return diff !== 0 ? (
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, marginTop: 8,
                color: diff > 0 ? "oklch(0.45 0.15 155)" : "oklch(0.55 0.2 30)",
              }}>
                {diff > 0 ? "↑" : "↓"} {Math.abs(diff)} kg since first session
              </div>
            ) : null;
          })()}
        </div>
      )}

      {showGraph && history.length < 2 && (
        <div style={{
          padding: "20px 0",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)",
          textAlign: "center",
          borderBottom: "1px solid var(--hairline)",
        }}>
          Need at least 2 sessions to show a graph
        </div>
      )}

      {!isTimeBased && (
        <div className="set-list">
          {Array.from({ length: numSets }, (_, i) => (
            <SetRow
              key={i}
              idx={i + 1}
              exercise={exercise}
              setData={sets[i] || { weight: "", reps: "" }}
              prevSet={prevSets?.[i] ?? null}
              onUpdate={(data) => onSetUpdate(i, data)}
            />
          ))}
        </div>
      )}

      {isTimeBased && (
        <div style={{
          padding: "16px 0",
          fontFamily: "var(--mono)",
          fontSize: 12,
          color: "var(--muted)",
        }}>
          {exercise.scheme}
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  dayLog,
  allLogs,
  today,
  onSetUpdate,
  onToggleCardio,
}: {
  day: Day;
  dayLog: Record<string, SetData[]>;
  allLogs: StrengthLogs;
  today: string;
  onSetUpdate: (exerciseName: string, setIdx: number, data: SetData) => void;
  onToggleCardio: (exerciseName: string) => void;
}) {
  const isCardio = day.type === "cardio";
  const allCardioDone = isCardio && day.exercises.every((ex) => {
    const sets = dayLog[ex.name] || [];
    return sets.length > 0 && sets[0].reps === "✓";
  });

  return (
    <div className="session-shell">
      <div className="session-head">
        <div>
          <div className="session-eyebrow">{day.label}</div>
          <div className="session-title">
            <span className="session-day-tag">{day.tag}</span>
            <span className="session-group">{day.duration}</span>
            {isCardio && allCardioDone && (
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                color: "oklch(0.45 0.15 155)", fontWeight: 600, marginLeft: 12,
              }}>
                ✓ DONE
              </span>
            )}
          </div>
        </div>
      </div>

      {isCardio ? (
        <div style={{ padding: "8px 0" }}>
          {day.exercises.map((ex, i) => {
            const checked = (dayLog[ex.name] || [])[0]?.reps === "✓";
            return (
              <div
                key={i}
                onClick={() => onToggleCardio(ex.name)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: i < day.exercises.length - 1 ? "1px solid var(--hairline)" : "none",
                  cursor: "pointer",
                  opacity: checked ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: checked ? "none" : "1.5px solid var(--faint)",
                  background: checked ? "oklch(0.55 0.2 155)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "var(--bg)", transition: "all 0.15s",
                }}>
                  {checked && "✓"}
                </div>
                <div style={{
                  fontFamily: "var(--serif)", fontSize: 16,
                  textDecoration: checked ? "line-through" : "none",
                }}>
                  {ex.name}
                </div>
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--muted)",
                }}>
                  {ex.scheme}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="exercise-grid">
          {day.exercises.map((ex, i) => (
            <ExerciseLogCard
              key={i}
              exercise={ex}
              sets={dayLog[ex.name] || []}
              prevSets={getLastSession(allLogs, today, day.id, ex.name)}
              allLogs={allLogs}
              dayId={day.id}
              onSetUpdate={(setIdx, data) => onSetUpdate(ex.name, setIdx, data)}
            />
          ))}
        </div>
      )}

      {day.notes && (
        <div style={{
          padding: "12px 0",
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--muted)",
          fontStyle: "italic",
          borderTop: "1px solid var(--hairline)",
        }}>
          {day.notes}
        </div>
      )}
    </div>
  );
}

export default function Strength() {
  const dayIds = WEEK.map((d) => d.id);
  const todayIdx = new Date().getDay();
  // Map JS day (0=Sun) to our array (0=Mon)
  const mappedIdx = todayIdx === 0 ? 6 : todayIdx - 1;
  const [activeDay, setActiveDay] = useState(dayIds[mappedIdx] || "mon");
  const currentDay = WEEK.find((d) => d.id === activeDay)!;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [logs, setLogs] = useUserData<StrengthLogs>("strengthLogs", {});

  // Keep a ref that always has the latest logs so callbacks never read stale state
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const todayLogs = logs[today] || {};
  const dayLog = todayLogs[activeDay] || {};

  const handleSetUpdate = useCallback(
    (exerciseName: string, setIdx: number, data: SetData) => {
      const current = logsRef.current;
      const newLogs = { ...current };
      if (!newLogs[today]) newLogs[today] = {};
      if (!newLogs[today][activeDay]) newLogs[today][activeDay] = {};
      const exSets = [...(newLogs[today][activeDay][exerciseName] || [])];
      // Pad array if needed
      while (exSets.length <= setIdx) {
        exSets.push({ weight: "", reps: "" });
      }
      exSets[setIdx] = data;
      newLogs[today][activeDay][exerciseName] = exSets;
      logsRef.current = newLogs;
      setLogs(newLogs);
    },
    [setLogs, today, activeDay]
  );

  const handleToggleCardio = useCallback(
    (exerciseName: string) => {
      const current = logsRef.current;
      const newLogs = { ...current };
      if (!newLogs[today]) newLogs[today] = {};
      if (!newLogs[today][activeDay]) newLogs[today][activeDay] = {};
      const prev = newLogs[today][activeDay][exerciseName] || [];
      const isChecked = prev.length > 0 && prev[0].reps === "✓";
      newLogs[today][activeDay][exerciseName] = isChecked
        ? []
        : [{ weight: "", reps: "✓" }];
      logsRef.current = newLogs;
      setLogs(newLogs);
    },
    [setLogs, today, activeDay]
  );

  const exportStrength = useCallback(() => {
    const headers = ["Date", "Day", "Exercise", "Set", "Weight (kg)", "Reps", "Effective Weight (kg)"];
    const rows: string[][] = [];
    const dayLabels: Record<string, string> = {};
    for (const d of WEEK) dayLabels[d.id] = d.label;

    const dates = Object.keys(logs).sort();
    for (const date of dates) {
      const dayEntries = logs[date];
      for (const dayId of Object.keys(dayEntries)) {
        const exercises = dayEntries[dayId];
        for (const [exName, sets] of Object.entries(exercises)) {
          (sets as SetData[]).forEach((s, i) => {
            if (!s.weight && !s.reps) return;
            const effW = normalizedWeight(s);
            rows.push([
              date,
              dayLabels[dayId] || dayId,
              exName,
              String(i + 1),
              s.weight || "",
              s.reps || "",
              effW > 0 ? String(effW) : "",
            ]);
          });
        }
      }
    }
    downloadCsv("helix-strength.csv", headers, rows);
  }, [logs]);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Training · 7-day split
          </div>
          <h1 className="page-title">
            Lift the <em>needle</em>
          </h1>
          <p className="page-sub">
            Back & Chest · Biceps & Shoulders · Triceps & Chest · Legs & Abs · Z2 cardio · Norwegian 4×4.
            Progressive overload builds muscle and bone density past 30.
          </p>
        </div>
        <div className="page-chips">
          <OpponentButton
            dataKey="strengthLogs"
            renderOpponent={(data, name) => {
              const sLogs = (data as StrengthLogs | null) || {};
              const _n = new Date();
              const todayKey = `${_n.getFullYear()}-${String(_n.getMonth() + 1).padStart(2, "0")}-${String(_n.getDate()).padStart(2, "0")}`;
              const todayData = sLogs[todayKey] || {};
              const dayId = activeDay;
              const dayData = todayData[dayId] || {};
              const exercises = Object.entries(dayData);

              // Count total days logged
              const totalDays = Object.keys(sLogs).length;

              return (
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, marginBottom: 4 }}>{name}&apos;s workout</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginBottom: 20 }}>
                    {totalDays} days logged total
                  </div>

                  {exercises.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontFamily: "var(--serif)", fontSize: 14 }}>
                      No workout logged today for {currentDay.tag}.
                    </div>
                  ) : (
                    exercises.map(([exName, sets]) => (
                      <div key={exName} style={{ marginBottom: 16 }}>
                        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, marginBottom: 8 }}>{exName}</div>
                        {(sets as SetData[]).map((s, i) => (
                          s.weight || s.reps ? (
                            <div key={i} style={{ display: "flex", gap: 16, padding: "6px 0", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-2)" }}>
                              <span style={{ color: "var(--muted)" }}>Set {i + 1}</span>
                              {s.weight && <span>{s.weight} kg</span>}
                              {s.reps && <span>× {s.reps}</span>}
                            </div>
                          ) : null
                        ))}
                      </div>
                    ))
                  )}

                  {/* Show last few logged days */}
                  {totalDays > 0 && (
                    <>
                      <div className="divider-label">Recent sessions</div>
                      {Object.keys(sLogs).sort().reverse().slice(0, 5).map((date) => {
                        const dayEntries = sLogs[date];
                        const dayIds = Object.keys(dayEntries);
                        const totalExercises = dayIds.reduce((sum, did) => sum + Object.keys(dayEntries[did]).length, 0);
                        return (
                          <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--hairline)" }}>
                            <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>
                              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                              {totalExercises} exercises
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            }}
          />
          {Object.keys(logs).length > 0 && (
            <button
              onClick={exportStrength}
              className="chip"
              style={{ cursor: "pointer", border: "1.5px solid var(--faint)" }}
            >
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Day selector */}
        <div style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          overflowX: "auto",
        }}>
          {WEEK.map((d) => (
            <button
              key={d.id}
              className={`session-switch-btn${d.id === activeDay ? " active" : ""}`}
              onClick={() => setActiveDay(d.id)}
              style={{ padding: "8px 14px", fontSize: 11, whiteSpace: "nowrap" }}
            >
              <span style={{ fontWeight: 600 }}>{d.label.slice(0, 3)}</span>
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>{d.tag}</span>
            </button>
          ))}
        </div>

        <DayCard day={currentDay} dayLog={dayLog} allLogs={logs} today={today} onSetUpdate={handleSetUpdate} onToggleCardio={handleToggleCardio} />

        {/* Week overview */}
        <div className="divider-label">Week overview</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {WEEK.map((d) => (
            <div
              key={d.id}
              className="card week-overview-row"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 100px 1fr auto",
                alignItems: "center",
                padding: "14px 20px",
                cursor: "pointer",
                opacity: d.id === activeDay ? 1 : 0.7,
                borderLeft: d.id === activeDay ? "3px solid var(--accent)" : "3px solid transparent",
              }}
              onClick={() => setActiveDay(d.id)}
            >
              <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>
                {d.label.slice(0, 3)}
              </div>
              <div style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: d.type === "cardio" ? "var(--warm)" : "var(--accent)",
              }}>
                {d.tag}
              </div>
              <div style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--muted)",
              }}>
                {d.exercises.length} exercises
              </div>
              <div className="week-overview-duration" style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--muted)",
              }}>
                {d.duration}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

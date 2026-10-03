"use client";

import React, { useState, useCallback, useRef } from "react";
import { useUserData } from "../lib/useUserData";
import { downloadCsv } from "../lib/csv";
import { LineChart } from "./Charts";

interface Exercise {
  name: string;
  scheme: string;
}

interface SetData {
  weight: string;
  reps: string;
}

// strengthLogs shape: { "2026-10-05": { "mon": { "Incline dumbbell press": [{ weight: "20", reps: "8" }, ...] } } }
type StrengthLogs = Record<string, Record<string, Record<string, SetData[]>>>;

interface Day {
  id: string;
  label: string;
  tag: string;
  duration: string;
  type: "lift" | "rest";
  exercises: Exercise[];
  notes?: string;
}

const WEEK: Day[] = [
  {
    id: "mon",
    label: "Monday",
    tag: "PUSH A",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Incline dumbbell press", scheme: "3 × 6–10" },
      { name: "Dips", scheme: "3 × 8–12" },
      { name: "Seated dumbbell shoulder press", scheme: "3 × 8–10" },
      { name: "Lateral raise", scheme: "4 × 12–15" },
      { name: "Triceps pushdown", scheme: "3 × 10–15" },
    ],
  },
  {
    id: "tue",
    label: "Tuesday",
    tag: "PULL A + ABS",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Weighted pull-up", scheme: "3 × 6–10" },
      { name: "Chest-supported row", scheme: "3 × 8–12" },
      { name: "Rear delt fly", scheme: "3 × 12–15" },
      { name: "Dumbbell curl", scheme: "3 × 8–12" },
      { name: "Weighted cable crunch", scheme: "3 × 10–15" },
    ],
    notes: "Pull-up: use an assisted machine or band if you can't yet do weighted sets.",
  },
  {
    id: "wed",
    label: "Wednesday",
    tag: "REST",
    duration: "—",
    type: "rest",
    exercises: [{ name: "Rest day", scheme: "Recovery" }],
  },
  {
    id: "thu",
    label: "Thursday",
    tag: "PUSH B",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Overhead press", scheme: "3 × 6–10" },
      { name: "Flat dumbbell press", scheme: "3 × 8–12" },
      { name: "Cable fly", scheme: "3 × 10–15" },
      { name: "Lateral raise", scheme: "4 × 12–15" },
      { name: "Overhead cable triceps extension", scheme: "3 × 10–15" },
    ],
    notes: "Overhead press: barbell or dumbbell, whichever is free.",
  },
  {
    id: "fri",
    label: "Friday",
    tag: "PULL B + ABS",
    duration: "~60 min",
    type: "lift",
    exercises: [
      { name: "Lat pulldown", scheme: "3 × 8–12" },
      { name: "Seated cable row", scheme: "3 × 10–12" },
      { name: "Face pull", scheme: "3 × 12–15" },
      { name: "Incline dumbbell curl", scheme: "3 × 10–12" },
      { name: "Hammer curl", scheme: "2 × 10–12" },
      { name: "Hanging leg raise", scheme: "3 × 10–15" },
    ],
  },
  {
    id: "sat",
    label: "Saturday",
    tag: "REST",
    duration: "—",
    type: "rest",
    exercises: [{ name: "Rest day", scheme: "Recovery" }],
  },
  {
    id: "sun",
    label: "Sunday",
    tag: "REST",
    duration: "—",
    type: "rest",
    exercises: [{ name: "Rest day", scheme: "Recovery" }],
  },
];

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
  const done = setData.weight !== "" && setData.reps !== "";

  const prevLabel = prevSet && prevSet.weight && prevSet.reps
    ? `${prevSet.weight} kg × ${prevSet.reps}`
    : prevSet?.reps || null;

  return (
    <div className="set-row">
      <div className="set-idx">{idx}</div>
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
      <div className="set-cell">
        <label>Reps</label>
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
        {done ? "Logged" : prevLabel ? (
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
): { date: string; bestWeight: number; bestReps: number }[] {
  const history: { date: string; bestWeight: number; bestReps: number }[] = [];
  const dates = Object.keys(logs).sort();
  for (const date of dates) {
    const sets = logs[date]?.[dayId]?.[exerciseName];
    if (!sets) continue;
    let bestWeight = 0;
    let bestReps = 0;
    for (const s of sets) {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps) || 0;
      if (w > bestWeight || (w === bestWeight && r > bestReps)) {
        bestWeight = w;
        bestReps = r;
      }
    }
    if (bestWeight > 0) history.push({ date, bestWeight, bestReps });
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
  const history = showGraph ? getExerciseHistory(allLogs, dayId, exercise.name) : [];

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <div style={{ flex: 1 }}>
          <div className="exercise-name">{exercise.name}</div>
          <div className="exercise-meta">{exercise.scheme}</div>
        </div>
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
    </div>
  );
}

function DayCard({
  day,
  dayLog,
  allLogs,
  today,
  onSetUpdate,
}: {
  day: Day;
  dayLog: Record<string, SetData[]>;
  allLogs: StrengthLogs;
  today: string;
  onSetUpdate: (exerciseName: string, setIdx: number, data: SetData) => void;
}) {
  const isRest = day.type === "rest";

  return (
    <div className="session-shell">
      <div className="session-head">
        <div>
          <div className="session-eyebrow">{day.label}</div>
          <div className="session-title">
            <span className="session-day-tag">{day.tag}</span>
            <span className="session-group">{day.duration}</span>
          </div>
        </div>
      </div>

      {isRest ? (
        <div style={{
          padding: "24px 0",
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontSize: 16,
          color: "var(--muted)",
        }}>
          Rest. Let the week's work settle.
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

  const exportStrength = useCallback(() => {
    const headers = ["Date", "Day", "Exercise", "Set", "Weight (kg)", "Reps"];
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
            rows.push([
              date,
              dayLabels[dayId] || dayId,
              exName,
              String(i + 1),
              s.weight || "",
              s.reps || "",
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
            Training · 5-day split
          </div>
          <h1 className="page-title">
            Lift the <em>needle</em>
          </h1>
          <p className="page-sub">
            Push A · Pull A + abs · Rest · Push B · Pull B + abs · Rest · Rest.
            Progressive overload builds muscle and bone density past 30.
          </p>
        </div>
        <div className="page-chips">
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

        <DayCard day={currentDay} dayLog={dayLog} allLogs={logs} today={today} onSetUpdate={handleSetUpdate} />

        {/* Week overview */}
        <div className="divider-label">Week overview</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {WEEK.map((d) => (
            <div
              key={d.id}
              className="card week-overview-row"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 120px 1fr auto",
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
                color: d.type === "rest" ? "var(--warm)" : "var(--accent)",
              }}>
                {d.tag}
              </div>
              <div style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--muted)",
              }}>
                {d.type === "lift" ? `${d.exercises.length} exercises` : "Recovery"}
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

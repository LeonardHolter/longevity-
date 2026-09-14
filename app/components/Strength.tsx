"use client";

import React, { useState, useCallback, useRef } from "react";
import { useUserData } from "../lib/useUserData";
import { downloadCsv } from "../lib/csv";
import { LineChart } from "./Charts";

interface Exercise {
  name: string;
  scheme: string;
  /** Show the added-load column (backpack with books). */
  loadable?: boolean;
  /** Log seconds instead of reps. */
  unit?: "reps" | "sec";
}

interface SetData {
  weight: string;
  reps: string;
}

// strengthLogs shape: { "2026-09-14": { "mon": { "Dips": [{ weight: "", reps: "8" }, ...] } } }
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

const WORKOUT_A: Exercise[] = [
  { name: "Dips", scheme: "4 × 6–10", loadable: true },
  { name: "Pull-ups", scheme: "4 × max", loadable: true },
  { name: "Hanging leg raise", scheme: "3 × 8–12" },
  { name: "Wall handstand hold", scheme: "3 × 20–30s", unit: "sec" },
];

const WORKOUT_B: Exercise[] = [
  { name: "Push-up progression", scheme: "3 × 8–12" },
  { name: "Chin-ups", scheme: "4 × max", loadable: true },
  { name: "L-sit on dip bar", scheme: "3 × 10–20s", unit: "sec" },
  { name: "Dead hang", scheme: "3 × max", unit: "sec" },
];

const LADDERS: { name: string; steps: string[] }[] = [
  { name: "Dips", steps: ["bench dips", "negatives", "full", "backpack with books once you hit 12"] },
  { name: "Pull / chin", steps: ["negatives", "full", "L-sit pull-ups or backpack once you hit 12"] },
  { name: "Push-up", steps: ["standard", "diamond", "feet on bed", "pseudo-planche", "pike", "wall handstand push-up"] },
  { name: "Leg raise", steps: ["knee raise", "straight leg to horizontal", "above horizontal", "toes to bar"] },
  { name: "L-sit", steps: ["tucked", "one leg out", "full", "then hold longer"] },
  { name: "Handstand", steps: ["20s", "30", "45", "60", "then HSPU negatives replace the hold"] },
  { name: "Dead hang", steps: ["30s", "60", "90", "then towel hang"] },
];

// Week of Mon Sep 14, 2026 lifts A, B, A; the next week B, A, B; alternating.
const LIFT_ANCHOR = new Date("2026-09-14T12:00:00");

function liftLetters(): ["A", "B", "A"] | ["B", "A", "B"] {
  const now = new Date();
  const monday = new Date(now);
  const dow = now.getDay();
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(12, 0, 0, 0);
  const weeks = Math.round((monday.getTime() - LIFT_ANCHOR.getTime()) / (7 * 24 * 3600 * 1000));
  return ((weeks % 2) + 2) % 2 === 0 ? ["A", "B", "A"] : ["B", "A", "B"];
}

function buildWeek(): Day[] {
  const [monW, wedW, friW] = liftLetters();
  const lift = (letter: "A" | "B") => ({
    tag: `WORKOUT ${letter}`,
    duration: "jog · lift · jog",
    type: "lift" as const,
    exercises: letter === "A" ? WORKOUT_A : WORKOUT_B,
    notes: "Jog to the bars easy, lift, jog home easy. Follow the progression ladders below — move up a step when you own the current one.",
  });
  return [
    { id: "mon", label: "Monday", ...lift(monW) },
    {
      id: "tue",
      label: "Tuesday",
      tag: "EASY RUN",
      duration: "30 min",
      type: "cardio",
      exercises: [{ name: "Easy run", scheme: "30 min" }],
      notes: "Conversational pace. If you can't talk, slow down.",
    },
    { id: "wed", label: "Wednesday", ...lift(wedW) },
    {
      id: "thu",
      label: "Thursday",
      tag: "4×4 INTERVALS",
      duration: "~30 min",
      type: "cardio",
      exercises: [{ name: "4×4 intervals", scheme: "4 min hard · 3 min easy · × 4" }],
      notes: "From your door, no bars. Hard means a few words at most; easy means fully conversational.",
    },
    { id: "fri", label: "Friday", ...lift(friW) },
    {
      id: "sat",
      label: "Saturday",
      tag: "LONG RUN",
      duration: "45–60 min",
      type: "cardio",
      exercises: [{ name: "Long easy run", scheme: "45 min" }],
      notes: "Start at 45 min, add 5 min a week up to 60.",
    },
    {
      id: "sun",
      label: "Sunday",
      tag: "MOBILITY",
      duration: "30 min + walk",
      type: "cardio",
      exercises: [
        { name: "Couch stretch", scheme: "2 min/side" },
        { name: "Deep squat hold", scheme: "2 min total" },
        { name: "Calf stretch", scheme: "1 min/side" },
        { name: "Dead hang", scheme: "accumulate 2 min" },
        { name: "Shoulder dislocates", scheme: "2 × 10" },
        { name: "Pigeon", scheme: "2 min/side" },
        { name: "Walk", scheme: "20–30 min" },
      ],
      notes: "Then a walk. Nothing here should hurt — ease into every position.",
    },
  ];
}

const WEEK: Day[] = buildWeek();

function getLastSession(
  logs: StrengthLogs,
  today: string,
  exerciseName: string,
): SetData[] | null {
  // Search every day id — the same workout floats across Mon/Wed/Fri as A/B alternate.
  const dates = Object.keys(logs).sort().reverse();
  for (const date of dates) {
    if (date >= today) continue;
    for (const dayId of Object.keys(logs[date])) {
      const sets = logs[date][dayId]?.[exerciseName];
      if (sets && sets.some((s) => s.weight !== "" || s.reps !== "")) return sets;
    }
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
  const showLoad = !!exercise.loadable;
  const isSec = exercise.unit === "sec";
  const done = setData.reps !== "";

  const prevLabel = prevSet && prevSet.reps
    ? `${showLoad && prevSet.weight ? `+${prevSet.weight} kg × ` : ""}${prevSet.reps}${isSec ? " s" : ""}`
    : null;

  return (
    <div className={`set-row${!showLoad ? " single-col" : ""}`}>
      <div className="set-idx">{idx}</div>
      {showLoad && (
        <div className="set-cell">
          <label>Load</label>
          <div className="set-input-wrap">
            <input
              value={setData.weight}
              onChange={(e) => onUpdate({ ...setData, weight: e.target.value.replace(",", ".") })}
              placeholder={prevSet?.weight || "BW"}
              inputMode="decimal"
            />
            <span className="set-unit">kg</span>
          </div>
        </div>
      )}
      <div className="set-cell">
        <label>{isSec ? "Seconds" : "Reps"}</label>
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
  exerciseName: string,
): { date: string; bestReps: number; bestLoad: number }[] {
  const history: { date: string; bestReps: number; bestLoad: number }[] = [];
  const dates = Object.keys(logs).sort();
  for (const date of dates) {
    let bestReps = 0;
    let bestLoad = 0;
    for (const dayId of Object.keys(logs[date])) {
      const sets = logs[date][dayId]?.[exerciseName];
      if (!sets) continue;
      for (const s of sets) {
        const r = parseInt(s.reps) || 0;
        const w = parseFloat(s.weight) || 0;
        if (r > bestReps) bestReps = r;
        if (w > bestLoad) bestLoad = w;
      }
    }
    if (bestReps > 0) history.push({ date, bestReps, bestLoad });
  }
  return history;
}

function ExerciseLogCard({
  exercise,
  sets,
  prevSets,
  allLogs,
  onSetUpdate,
}: {
  exercise: Exercise;
  sets: SetData[];
  prevSets: SetData[] | null;
  allLogs: StrengthLogs;
  onSetUpdate: (setIdx: number, data: SetData) => void;
}) {
  const [showGraph, setShowGraph] = useState(false);
  const setsMatch = exercise.scheme.match(/^(\d+)\s*×/);
  const numSets = setsMatch ? parseInt(setsMatch[1]) : 1;
  const isSec = exercise.unit === "sec";
  const history = showGraph ? getExerciseHistory(allLogs, exercise.name) : [];

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
              {history[history.length - 1].bestReps} {isSec ? "sec" : "reps"}
              {history[history.length - 1].bestLoad > 0 && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
                  +{history[history.length - 1].bestLoad} kg
                </span>
              )}
            </div>
          </div>
          <LineChart
            width={480}
            height={160}
            padding={{ top: 16, right: 16, bottom: 32, left: 44 }}
            yUnit={isSec ? "SEC" : "REPS"}
            yTicks={3}
            xLabels={history.map((h) =>
              new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
            )}
            series={[{
              values: history.map((h) => h.bestReps),
              color: "var(--accent)",
              width: 2,
              fill: true,
              dots: true,
              dotR: 3,
              endLabel: true,
            }]}
          />
          {history.length >= 2 && (() => {
            const first = history[0].bestReps;
            const last = history[history.length - 1].bestReps;
            const diff = last - first;
            return diff !== 0 ? (
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, marginTop: 8,
                color: diff > 0 ? "oklch(0.45 0.15 155)" : "oklch(0.55 0.2 30)",
              }}>
                {diff > 0 ? "↑" : "↓"} {Math.abs(diff)} {isSec ? "sec" : "reps"} since first session
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
              prevSets={getLastSession(allLogs, today, ex.name)}
              allLogs={allLogs}
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

  const letters = liftLetters();

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
    const headers = ["Date", "Day", "Exercise", "Set", "Load (kg)", "Reps / Secs"];
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
            Training · bars + running
          </div>
          <h1 className="page-title">
            Lift the <em>needle</em>
          </h1>
          <p className="page-sub">
            Calisthenics at the bars Mon · Wed · Fri, runs Tue · Thu · Sat, mobility Sunday.
            This week lifts {letters.join(" · ")} — the pattern flips every week.
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
                {d.exercises.length} {d.type === "lift" ? "exercises" : d.exercises.length === 1 ? "session" : "items"}
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

        {/* Progression ladders */}
        <div className="divider-label">Progression ladders</div>
        <div className="card" style={{ padding: 0 }}>
          {LADDERS.map((l, i) => (
            <div
              key={l.name}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: 16,
                padding: "14px 24px",
                borderBottom: i < LADDERS.length - 1 ? "1px solid var(--hairline)" : "none",
                alignItems: "baseline",
              }}
            >
              <div style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{l.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
                {l.steps.join(" → ")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useCallback } from "react";
import { useUserData } from "../lib/useUserData";
import { OpponentButton } from "./OpponentView";

interface Exercise {
  name: string;
  scheme: string;
}

interface SetData {
  weight: string;
  reps: string;
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
    tag: "LEGS",
    duration: "~75 min",
    type: "lift",
    exercises: [
      { name: "Leg press", scheme: "4 × 8–12" },
      { name: "Leg extension", scheme: "3 × 12–15" },
      { name: "Seated leg curl", scheme: "4 × 8–12" },
{ name: "Calf raise", scheme: "4 × 10–15" },
    ],
    notes: "Machines only. Plate to chest on back extensions.",
  },
  {
    id: "tue",
    label: "Tuesday",
    tag: "Z2 RUN",
    duration: "30 min",
    type: "cardio",
    exercises: [
      { name: "Easy warm-up", scheme: "5 min" },
      { name: "Zone 2 run", scheme: "25 min @ 120–140 bpm" },
      { name: "Cool-down", scheme: "5 min" },
      { name: "Couch stretch", scheme: "2 min/side" },
    ],
    notes: "Conversational pace. Anti-lordosis work at the end.",
  },
  {
    id: "wed",
    label: "Wednesday",
    tag: "PUSH",
    duration: "~75 min",
    type: "lift",
    exercises: [
      { name: "Barbell bench press", scheme: "4 × 6–10" },
      { name: "Seated DB shoulder press", scheme: "3 × 8–12" },
      { name: "Incline DB press", scheme: "3 × 8–12" },
      { name: "Cable fly / pec deck", scheme: "3 × 12–15" },
      { name: "Lateral raises", scheme: "4 × 12–20" },
      { name: "Triceps rope pushdown", scheme: "3 × 10–15" },
      { name: "Overhead cable triceps ext.", scheme: "3 × 10–15" },
    ],
  },
  {
    id: "thu",
    label: "Thursday",
    tag: "PULL",
    duration: "~75 min",
    type: "lift",
    exercises: [
      { name: "Weighted pull-ups", scheme: "4 × 6–10" },
      { name: "Seated cable row", scheme: "4 × 8–12" },
      { name: "Lat pulldown (neutral/close)", scheme: "3 × 10–12" },
      { name: "Face pulls", scheme: "3 × 15–20" },
      { name: "Incline DB curl", scheme: "4 × 10–12" },
      { name: "Hammer curl", scheme: "3 × 10–15" },
    ],
  },
  {
    id: "fri",
    label: "Friday",
    tag: "Z2 RUN",
    duration: "30 min",
    type: "cardio",
    exercises: [
      { name: "Easy warm-up", scheme: "5 min" },
      { name: "Zone 2 run", scheme: "25 min @ 120–140 bpm" },
      { name: "Cool-down", scheme: "5 min" },
      { name: "Couch stretch", scheme: "2 min/side" },
    ],
    notes: "Same as Tuesday — conversational pace, low ego.",
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
    tag: "ABS",
    duration: "~25 min",
    type: "lift",
    exercises: [
      { name: "Hanging leg raises", scheme: "4 × 8–12" },
      { name: "Lying leg raises", scheme: "3 × 12–15" },
      { name: "Crunches", scheme: "4 × 15–20" },
      { name: "Dead bug", scheme: "3 × 8/side" },
      { name: "Pallof press", scheme: "3 × 10/side" },
      { name: "Side plank", scheme: "3 × 30–45 sec/side" },
    ],
    notes: "Posterior tilt on hanging leg raises.",
  },
];

function SetRow({
  idx,
  exercise,
  setData,
  onUpdate,
}: {
  idx: number;
  exercise: Exercise;
  setData: SetData;
  onUpdate: (data: SetData) => void;
}) {
  const hasWeight = !exercise.scheme.includes("min") && !exercise.scheme.includes("sec");
  const done = hasWeight ? setData.weight !== "" && setData.reps !== "" : setData.reps !== "";

  return (
    <div className={`set-row${!hasWeight ? " single-col" : ""}`}>
      <div className="set-idx">{idx}</div>
      {hasWeight && (
        <div className="set-cell">
          <label>Weight</label>
          <div className="set-input-wrap">
            <input
              value={setData.weight}
              onChange={(e) => onUpdate({ ...setData, weight: e.target.value })}
              placeholder="—"
              inputMode="decimal"
            />
            <span className="set-unit">kg</span>
          </div>
        </div>
      )}
      <div className="set-cell">
        <label>{hasWeight ? "Reps" : "Done"}</label>
        <div className="set-input-wrap">
          <input
            value={setData.reps}
            onChange={(e) => onUpdate({ ...setData, reps: e.target.value })}
            placeholder="—"
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="set-target">
        {exercise.scheme}
      </div>
      <div className={`set-status${done ? " done" : ""}`}>
        {done ? "Logged" : "—"}
      </div>
    </div>
  );
}

function ExerciseLogCard({
  exercise,
  sets,
  onSetUpdate,
}: {
  exercise: Exercise;
  sets: SetData[];
  onSetUpdate: (setIdx: number, data: SetData) => void;
}) {
  const setsMatch = exercise.scheme.match(/^(\d+)\s*×/);
  const numSets = setsMatch ? parseInt(setsMatch[1]) : 1;
  const isTimeBased = exercise.scheme.includes("min") || exercise.scheme.includes("sec");

  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <div>
          <div className="exercise-name">{exercise.name}</div>
          <div className="exercise-meta">{exercise.scheme}</div>
        </div>
      </div>

      {!isTimeBased && (
        <div className="set-list">
          {Array.from({ length: numSets }, (_, i) => (
            <SetRow
              key={i}
              idx={i + 1}
              exercise={exercise}
              setData={sets[i] || { weight: "", reps: "" }}
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
  onSetUpdate,
}: {
  day: Day;
  dayLog: Record<string, SetData[]>;
  onSetUpdate: (exerciseName: string, setIdx: number, data: SetData) => void;
}) {
  const isCardio = day.type === "cardio";

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

      {isCardio ? (
        <div style={{ padding: "8px 0" }}>
          {day.exercises.map((ex, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < day.exercises.length - 1 ? "1px solid var(--hairline)" : "none",
              }}
            >
              <div style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{ex.name}</div>
              <div style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--muted)",
              }}>
                {ex.scheme}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="exercise-grid">
          {day.exercises.map((ex, i) => (
            <ExerciseLogCard
              key={i}
              exercise={ex}
              sets={dayLog[ex.name] || []}
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

  const today = new Date().toISOString().slice(0, 10);
  const [logs, setLogs] = useUserData<StrengthLogs>("strengthLogs", {});

  const todayLogs = logs[today] || {};
  const dayLog = todayLogs[activeDay] || {};

  const handleSetUpdate = useCallback(
    (exerciseName: string, setIdx: number, data: SetData) => {
      const newLogs = { ...logs };
      if (!newLogs[today]) newLogs[today] = {};
      if (!newLogs[today][activeDay]) newLogs[today][activeDay] = {};
      const exSets = [...(newLogs[today][activeDay][exerciseName] || [])];
      // Pad array if needed
      while (exSets.length <= setIdx) {
        exSets.push({ weight: "", reps: "" });
      }
      exSets[setIdx] = data;
      newLogs[today][activeDay][exerciseName] = exSets;
      setLogs(newLogs);
    },
    [logs, setLogs, today, activeDay]
  );

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
            Legs · Push · Pull · Abs · Z2 cardio · Norwegian 4×4 HIIT.
            Progressive overload builds muscle and bone density past 30.
          </p>
        </div>
        <div className="page-chips">
          <OpponentButton
            dataKey="strengthLogs"
            renderOpponent={(data, name) => {
              const sLogs = (data as StrengthLogs | null) || {};
              const todayKey = new Date().toISOString().slice(0, 10);
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

        <DayCard day={currentDay} dayLog={dayLog} onSetUpdate={handleSetUpdate} />

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

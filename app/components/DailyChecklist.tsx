"use client";

import React from "react";
import { useUserData } from "../lib/useUserData";
import { TEMPLATE_ITEMS, KCAL_TARGET, PROTEIN_TARGET } from "./Food";

interface DayLog {
  checked: string[];
  custom: { name: string; kcal: number; protein: number }[];
}

interface SetData {
  weight: string;
  reps: string;
}

type StrengthLogs = Record<string, Record<string, Record<string, SetData[]>>>;

// Derived from the template in Food.tsx so both stay in sync
const TEMPLATE_KCAL: Record<string, number> = Object.fromEntries(TEMPLATE_ITEMS.map((t) => [t.id, t.kcal]));
const TEMPLATE_PROTEIN: Record<string, number> = Object.fromEntries(TEMPLATE_ITEMS.map((t) => [t.id, t.protein]));

function getFoodTotals(log: DayLog | undefined) {
  let kcal = 0, protein = 0;
  if (!log) return { kcal, protein };
  for (const id of log.checked) {
    kcal += TEMPLATE_KCAL[id] || 0;
    protein += TEMPLATE_PROTEIN[id] || 0;
  }
  for (const c of log.custom) {
    kcal += c.kcal;
    protein += c.protein;
  }
  return { kcal, protein };
}

const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function DailyChecklist() {
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const jsDay = new Date().getDay();
  const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const todayDayId = WEEK_DAYS[dayIdx];

  const [foodLogs] = useUserData<Record<string, DayLog>>("foodLogs", {});
  const [strengthLogs] = useUserData<StrengthLogs>("strengthLogs", {});
  const [zetamacHistory] = useUserData<{ date: string; score: number }[]>("zetamacHistory", []);
  const [weightEntries] = useUserData<{ date: string; w: number }[]>("weightEntries", []);

  // Check each task
  const todayFood = foodLogs[today];
  const foodTotals = getFoodTotals(todayFood);
  const foodDone = foodTotals.kcal >= KCAL_TARGET && foodTotals.protein >= PROTEIN_TARGET;
  const foodStarted = foodTotals.kcal > 0;

  const todayStrength = strengthLogs[today];
  const workoutDone = todayStrength && Object.keys(todayStrength).some((dayId) => {
    const exercises = todayStrength[dayId];
    return Object.values(exercises).some((sets) =>
      (sets as SetData[]).some((s) => s.weight !== "" || s.reps !== "")
    );
  });

  const zetamacDone = zetamacHistory.some((h) => h.date === today);

  const weightDone = weightEntries.some((e) => e.date === today);

  const tasks = [
    {
      id: "workout",
      label: "Workout",
      detail: todayDayId.toUpperCase(),
      done: !!workoutDone,
      route: "strength",
    },
    {
      id: "food",
      label: `Hit ${KCAL_TARGET.toLocaleString()} kcal + ${PROTEIN_TARGET}g protein`,
      detail: foodStarted ? `${foodTotals.kcal} kcal · ${foodTotals.protein}g so far` : "Not started",
      done: foodDone,
      route: "food",
    },
    {
      id: "zetamac",
      label: "Zetamac session",
      detail: zetamacDone
        ? `Best today: ${Math.max(...zetamacHistory.filter((h) => h.date === today).map((h) => h.score))}`
        : "Train your brain",
      done: zetamacDone,
      route: "alzheimer",
    },
    {
      id: "weight",
      label: "Log weight",
      detail: weightDone
        ? `${weightEntries.find((e) => e.date === today)!.w.toFixed(1)} kg`
        : "Morning weigh-in",
      done: weightDone,
      route: "weight",
    },
  ];

  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = Math.round((completed / total) * 100);

  return {
    tasks,
    completed,
    total,
    pct,
    foodTotals,
  };
}

export function DailyChecklistPanel({
  onNavigate,
}: {
  onNavigate: (route: string) => void;
}) {
  const { tasks, completed, total, pct, foodTotals } = DailyChecklist();

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
      {/* Header with progress */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10,
              letterSpacing: "0.14em", color: "var(--muted)",
            }}>
              TODAY&apos;S PROTOCOL
            </div>
            <div style={{
              fontFamily: "var(--serif)", fontSize: 22, marginTop: 4,
            }}>
              {completed === total ? (
                <span style={{ color: "oklch(0.45 0.15 155)" }}>All done</span>
              ) : (
                <>{completed} of {total}</>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: "var(--serif)", fontSize: 36,
            color: completed === total ? "oklch(0.45 0.15 155)" : "var(--ink)",
            letterSpacing: "-0.02em",
          }}>
            {pct}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 3,
          background: "var(--surface-2)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 3,
            background: completed === total
              ? "oklch(0.55 0.2 155)"
              : "var(--accent)",
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Task rows */}
      {tasks.map((task, i) => (
        <div
          key={task.id}
          onClick={() => !task.done && onNavigate(task.route)}
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderBottom: i < tasks.length - 1 ? "1px solid var(--hairline)" : "none",
            cursor: task.done ? "default" : "pointer",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { if (!task.done) (e.currentTarget.style.background = "var(--surface-2)"); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {/* Checkbox */}
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            border: task.done ? "none" : "1.5px solid var(--faint)",
            background: task.done ? "oklch(0.55 0.2 155)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "var(--bg)", transition: "all 0.15s",
            flexShrink: 0,
          }}>
            {task.done && "✓"}
          </div>

          {/* Label + detail */}
          <div>
            <div style={{
              fontFamily: "var(--serif)", fontSize: 15,
              color: task.done ? "var(--muted)" : "var(--ink)",
              textDecoration: task.done ? "line-through" : "none",
            }}>
              {task.label}
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10,
              color: task.done ? "oklch(0.45 0.15 155)" : "var(--muted)",
              marginTop: 2,
            }}>
              {task.detail}
            </div>

            {/* Inline food progress bar */}
            {task.id === "food" && !task.done && foodTotals.kcal > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: "var(--surface-2)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (foodTotals.kcal / KCAL_TARGET) * 100)}%`,
                      borderRadius: 2,
                      background: "var(--accent)",
                    }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: "var(--surface-2)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (foodTotals.protein / PROTEIN_TARGET) * 100)}%`,
                      borderRadius: 2,
                      background: "var(--accent)",
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Arrow for incomplete tasks */}
          {!task.done && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 14,
              color: "var(--faint)",
            }}>
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

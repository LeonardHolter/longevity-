"use client";

import React, { useState, useRef } from "react";
import { useUserData } from "../lib/useUserData";

/* ── types ── */
interface FoodItem {
  id: string;
  name: string;
  measurement: string;
  kcal: number;
  protein: number;
  meal: string;
}

interface DayLog {
  checked: string[]; // ids of checked template items
  custom: { name: string; kcal: number; protein: number }[];
}

/* ── meal templates with macros ── */
export const TEMPLATE_ITEMS: FoodItem[] = [
  // 7:45 Ferris breakfast (325 kcal, 27g protein)
  { id: "br1", meal: "Breakfast", name: "4 eggs + pinch of ham, cheese, spinach", measurement: "Ferris · 7:45", kcal: 325, protein: 27 },
  // 2–3pm smoothie (700 kcal, 70g protein)
  { id: "sm1", meal: "Smoothie", name: "2 scoops whey · 5 g creatine · 250 ml milk · 50 g oats · 100 g fruit", measurement: "2–3 pm", kcal: 700, protein: 70 },
  // Hewitt dinner, two plates (1,150 kcal, 75g protein)
  { id: "dn1", meal: "Dinner", name: "Plate 1 — 2 palms chicken + 1 scoop beans + rice + veg", measurement: "no sauce", kcal: 575, protein: 38 },
  { id: "dn2", meal: "Dinner", name: "Plate 2 — same again", measurement: "no sauce", kcal: 575, protein: 37 },
  // One fruit anywhere in the day — checking every box lands exactly on target
  { id: "fr1", meal: "Anytime", name: "One fruit", measurement: "any time", kcal: 125, protein: 3 },
];

export const KCAL_TARGET = 2300;
export const PROTEIN_TARGET = 175;

const MEAL_TITLES: Record<string, string> = {
  Breakfast: "Eggs at Ferris",
  Smoothie: "Whey + oats smoothie",
  Dinner: "Hewitt, two plates",
  Anytime: "One fruit, anywhere",
};

const MEAL_NOTES: Record<string, string> = {
  Dinner: "Fri at Ferris (Hewitt closed 2:30–4:30) · Sun at John Jay",
};

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return localDateStr(new Date());
}

function dateKey(d: Date) {
  return localDateStr(d);
}

function getDayTotals(log: DayLog | undefined) {
  let kcal = 0;
  let protein = 0;
  if (!log) return { kcal, protein };
  for (const id of log.checked) {
    const item = TEMPLATE_ITEMS.find((t) => t.id === id);
    if (item) {
      kcal += item.kcal;
      protein += item.protein;
    }
  }
  for (const c of log.custom) {
    kcal += c.kcal;
    protein += c.protein;
  }
  return { kcal, protein };
}

function daysSinceMonday(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function getAdjustedTargets(dateStr: string, logs: Record<string, DayLog>) {
  const offset = daysSinceMonday(dateStr);
  const d = new Date(dateStr + "T00:00:00");
  let carryKcal = 0;
  let carryProtein = 0;
  for (let i = offset; i > 0; i--) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - i);
    const t = getDayTotals(logs[dateKey(prev)]);
    carryKcal += KCAL_TARGET - t.kcal;
    carryProtein += PROTEIN_TARGET - t.protein;
  }
  return {
    kcal: Math.max(0, KCAL_TARGET + carryKcal),
    protein: Math.max(0, PROTEIN_TARGET + carryProtein),
    carryKcal,
    carryProtein,
  };
}

function hitTargetsAdj(dateStr: string, logs: Record<string, DayLog>) {
  const t = getDayTotals(logs[dateStr]);
  const adj = getAdjustedTargets(dateStr, logs);
  return t.kcal >= adj.kcal && t.protein >= adj.protein;
}

/* ── components ── */

export default function Food() {
  const [logs, setLogs, loaded] = useUserData<Record<string, DayLog>>("foodLogs", {});
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [customDraft, setCustomDraft] = useState({ name: "", kcal: "", protein: "" });

  const currentLog: DayLog = logs[selectedDate] || { checked: [], custom: [] };
  const totals = getDayTotals(currentLog);
  const adjTargets = getAdjustedTargets(selectedDate, logs);
  const isHit = totals.kcal >= adjTargets.kcal && totals.protein >= adjTargets.protein;

  const toggleItem = (id: string) => {
    const current = logsRef.current;
    const dayLog: DayLog = current[selectedDate] || { checked: [], custom: [] };
    const log = { ...dayLog };
    if (log.checked.includes(id)) {
      log.checked = log.checked.filter((x) => x !== id);
    } else {
      log.checked = [...log.checked, id];
    }
    const next = { ...current, [selectedDate]: log };
    logsRef.current = next;
    setLogs(next);
  };

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const kcal = parseInt(customDraft.kcal);
    const protein = parseInt(customDraft.protein);
    if (!customDraft.name || isNaN(kcal)) return;
    const current = logsRef.current;
    const dayLog: DayLog = current[selectedDate] || { checked: [], custom: [] };
    const log = { ...dayLog };
    log.custom = [...log.custom, { name: customDraft.name, kcal, protein: isNaN(protein) ? 0 : protein }];
    const next = { ...current, [selectedDate]: log };
    logsRef.current = next;
    setLogs(next);
    setCustomDraft({ name: "", kcal: "", protein: "" });
  };

  const removeCustom = (idx: number) => {
    const current = logsRef.current;
    const dayLog: DayLog = current[selectedDate] || { checked: [], custom: [] };
    const log = { ...dayLog };
    log.custom = log.custom.filter((_, i) => i !== idx);
    const next = { ...current, [selectedDate]: log };
    logsRef.current = next;
    setLogs(next);
  };

  // Last 14 days for the day strip
  const days: Date[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const meals = ["Breakfast", "Smoothie", "Dinner", "Anytime"];

  if (!loaded) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 400, fontFamily: "var(--serif)", fontSize: 18, color: "var(--muted)",
      }}>
        Loading...
      </div>
    );
  }

  // Count streak
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (hitTargetsAdj(dateKey(d), logs)) streak++;
    else break;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Nutrition · daily tracker
          </div>
          <h1 className="page-title">
            What you <em>fed</em> the system
          </h1>
          <p className="page-sub">
            Hit {KCAL_TARGET.toLocaleString()} kcal and {PROTEIN_TARGET}g protein every day. Green means you made it.
          </p>
        </div>
        <div className="page-chips">
          {streak > 0 && <span className="chip live">{streak}-day streak</span>}
        </div>
      </div>

      <div className="page-body">
        {/* Day strip */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 24, overflowX: "auto",
        }}>
          {days.map((d) => {
            const key = dateKey(d);
            const isSelected = key === selectedDate;
            const dayHit = hitTargetsAdj(key, logs);
            const dayLog = logs[key];
            const hasEntries = dayLog && (dayLog.checked.length > 0 || dayLog.custom.length > 0);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                  background: dayHit ? "oklch(0.45 0.15 155 / 0.15)" : isSelected ? "var(--surface-2)" : "transparent",
                  cursor: "pointer",
                  minWidth: 52,
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: dayHit ? "oklch(0.45 0.15 155)" : "var(--muted)",
                }}>
                  {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </div>
                <div style={{
                  fontFamily: "var(--serif)",
                  fontSize: 18,
                  color: dayHit ? "oklch(0.45 0.15 155)" : "var(--ink)",
                  fontWeight: dayHit ? 600 : 400,
                }}>
                  {d.getDate()}
                </div>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dayHit
                    ? "oklch(0.55 0.2 155)"
                    : hasEntries
                      ? "var(--faint)"
                      : "transparent",
                  border: !dayHit && !hasEntries ? "1px solid var(--hairline)" : "none",
                }} />
              </button>
            );
          })}
        </div>

        {/* Today's progress bar */}
        <div className="card" style={{ padding: "20px 28px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </div>
            {isHit && (
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                color: "oklch(0.45 0.15 155)", fontWeight: 600,
              }}>
                ✓ TARGETS HIT
              </div>
            )}
          </div>

          {adjTargets.carryKcal !== 0 || adjTargets.carryProtein !== 0 ? (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)",
              marginBottom: 12,
            }}>
              Weekly carryover:{" "}
              {adjTargets.carryKcal !== 0 && (
                <span style={{ color: adjTargets.carryKcal > 0 ? "oklch(0.55 0.2 30)" : "oklch(0.45 0.15 155)" }}>
                  {adjTargets.carryKcal > 0 ? "+" : ""}{adjTargets.carryKcal} kcal
                </span>
              )}
              {adjTargets.carryKcal !== 0 && adjTargets.carryProtein !== 0 && " · "}
              {adjTargets.carryProtein !== 0 && (
                <span style={{ color: adjTargets.carryProtein > 0 ? "oklch(0.55 0.2 30)" : "oklch(0.45 0.15 155)" }}>
                  {adjTargets.carryProtein > 0 ? "+" : ""}{adjTargets.carryProtein}g protein
                </span>
              )}
            </div>
          ) : null}

          <div className="food-progress-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Kcal bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>CALORIES</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  color: totals.kcal >= adjTargets.kcal ? "oklch(0.45 0.15 155)" : "var(--ink)",
                }}>
                  {totals.kcal.toLocaleString()} / {adjTargets.kcal.toLocaleString()}
                </span>
              </div>
              <div style={{
                height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, adjTargets.kcal > 0 ? (totals.kcal / adjTargets.kcal) * 100 : 100)}%`,
                  borderRadius: 4,
                  background: totals.kcal >= adjTargets.kcal ? "oklch(0.55 0.2 155)" : "var(--accent)",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
            {/* Protein bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>PROTEIN</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  color: totals.protein >= adjTargets.protein ? "oklch(0.45 0.15 155)" : "var(--ink)",
                }}>
                  {totals.protein}g / {adjTargets.protein}g
                </span>
              </div>
              <div style={{
                height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, adjTargets.protein > 0 ? (totals.protein / adjTargets.protein) * 100 : 100)}%`,
                  borderRadius: 4,
                  background: totals.protein >= adjTargets.protein ? "oklch(0.55 0.2 155)" : "var(--accent)",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          </div>

          {/* Overflow to next day */}
          {(totals.kcal !== 0 || totals.protein !== 0) && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
              marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--hairline)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
                  {totals.kcal >= adjTargets.kcal ? "SURPLUS →" : "DEFICIT →"}
                </span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                  color: totals.kcal >= adjTargets.kcal ? "oklch(0.45 0.15 155)" : "oklch(0.55 0.2 30)",
                }}>
                  {totals.kcal >= adjTargets.kcal ? "+" : ""}{totals.kcal - adjTargets.kcal} kcal
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
                  {totals.protein >= adjTargets.protein ? "SURPLUS →" : "DEFICIT →"}
                </span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                  color: totals.protein >= adjTargets.protein ? "oklch(0.45 0.15 155)" : "oklch(0.55 0.2 30)",
                }}>
                  {totals.protein >= adjTargets.protein ? "+" : ""}{totals.protein - adjTargets.protein}g
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Meal checklists */}
        {meals.map((mealName) => {
          const items = TEMPLATE_ITEMS.filter((t) => t.meal === mealName);
          const mealKcal = items.reduce((s, t) => s + t.kcal, 0);
          const mealProtein = items.reduce((s, t) => s + t.protein, 0);
          const checkedKcal = items
            .filter((t) => currentLog.checked.includes(t.id))
            .reduce((s, t) => s + t.kcal, 0);
          const checkedProtein = items
            .filter((t) => currentLog.checked.includes(t.id))
            .reduce((s, t) => s + t.protein, 0);
          const allChecked = items.every((t) => currentLog.checked.includes(t.id));

          return (
            <div key={mealName} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
              <div style={{
                padding: "20px 28px 14px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                    color: allChecked ? "oklch(0.45 0.15 155)" : "var(--muted)",
                  }}>
                    {mealName.toUpperCase()} {allChecked && "✓"}
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, marginTop: 4 }}>
                    {MEAL_TITLES[mealName] ?? mealName}
                  </div>
                  {MEAL_NOTES[mealName] && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>
                      {MEAL_NOTES[mealName]}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 12,
                    color: allChecked ? "oklch(0.45 0.15 155)" : "var(--ink)",
                  }}>
                    {checkedKcal} / {mealKcal} kcal
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {checkedProtein}g / {mealProtein}g protein
                  </div>
                </div>
              </div>

              {items.map((item) => {
                const checked = currentLog.checked.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="food-item-row"
                    onClick={() => toggleItem(item.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 28px",
                      borderBottom: "1px solid var(--hairline)",
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
                      fontFamily: "var(--serif)", fontSize: 15,
                      textDecoration: checked ? "line-through" : "none",
                    }}>
                      {item.name}
                    </div>
                    <div className="food-item-measure" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
                      {item.measurement}
                    </div>
                    <div className="food-item-macro" style={{
                      fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)",
                      minWidth: 80, textAlign: "right",
                    }}>
                      {item.kcal} kcal · {item.protein}g
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Custom food */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
          <div style={{
            padding: "20px 28px 14px",
            borderBottom: "1px solid var(--hairline)",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--muted)",
            }}>
              EXTRA FOOD
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, marginTop: 4 }}>
              Anything else you ate
            </div>
          </div>

          {currentLog.custom.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 28px",
                borderBottom: "1px solid var(--hairline)",
              }}
            >
              <div style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{c.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
                {c.kcal} kcal · {c.protein}g
              </div>
              <button
                onClick={() => removeCustom(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "var(--mono)", fontSize: 14, color: "var(--muted)",
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>
          ))}

          <form onSubmit={addCustom} className="food-custom-form" style={{
            display: "flex", gap: 8, padding: "14px 28px", alignItems: "center",
          }}>
            <input
              value={customDraft.name}
              onChange={(e) => setCustomDraft({ ...customDraft, name: e.target.value })}
              placeholder="Food item"
              className="log-input"
              style={{ flex: 1 }}
            />
            <input
              value={customDraft.kcal}
              onChange={(e) => setCustomDraft({ ...customDraft, kcal: e.target.value })}
              placeholder="kcal"
              inputMode="numeric"
              className="log-input"
              style={{ width: 70 }}
            />
            <input
              value={customDraft.protein}
              onChange={(e) => setCustomDraft({ ...customDraft, protein: e.target.value })}
              placeholder="prot (g)"
              inputMode="numeric"
              className="log-input"
              style={{ width: 70 }}
            />
            <button type="submit" className="btn accent">+</button>
          </form>
        </div>

        {/* Remaining to hit targets */}
        {!isHit && (totals.kcal > 0 || totals.protein > 0) && (
          <div className="card" style={{
            padding: "20px 28px",
            marginBottom: 12,
            borderLeft: "3px solid var(--accent)",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 8 }}>
              STILL NEED TODAY
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {totals.kcal < adjTargets.kcal && (
                <div>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 24 }}>
                    {(adjTargets.kcal - totals.kcal).toLocaleString()}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>kcal</span>
                </div>
              )}
              {totals.protein < adjTargets.protein && (
                <div>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 24 }}>
                    {adjTargets.protein - totals.protein}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>g protein</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

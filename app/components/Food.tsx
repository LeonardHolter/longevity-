"use client";

import React, { useState, useRef, useCallback } from "react";

interface MealCardProps {
  slotId: string;
  kind: string;
  sub: string;
  time: string;
  defaultNote: string;
  status: "done" | "pending";
  suggestedTags: string[];
}

function MealCard({ kind, sub, time, defaultNote, status, suggestedTags }: MealCardProps) {
  const [note, setNote] = useState(defaultNote || "");
  const [tags] = useState(suggestedTags || []);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const placeholder =
    kind === "Breakfast"
      ? "Oats, blueberries, walnuts, kefir…"
      : kind === "Dinner"
      ? "Describe the meal — what, how much, with whom…"
      : "Cottage cheese, rye crispbread, honey…";

  return (
    <div className="meal-card">
      <div
        className="meal-photo-wrap"
        style={{
          outline: dragOver ? "2px solid var(--accent)" : undefined,
          outlineOffset: dragOver ? -2 : undefined,
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <span className="meal-time-pill">{time}</span>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={kind} />
        ) : (
          <span>Drop {kind.toLowerCase()} photo</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <div className="meal-body">
        <div className="meal-kind">
          <span className="sub">{sub}</span>
          {kind}
        </div>
        <textarea
          className="meal-input"
          placeholder={placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <div className="meal-foot">
          <div className="meal-tags">
            {tags.map((t, i) => (
              <span key={i} className="meal-tag">{t}</span>
            ))}
          </div>
          <div className={`meal-status${status === "done" ? " done" : ""}`}>
            {status === "done" ? "Logged" : "Pending"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Food() {
  const [selectedOffset, setSelectedOffset] = useState(0);

  const days: Date[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const selected = days[days.length - 1 - selectedOffset];
  const dateKey = selected.toISOString().slice(0, 10);
  const isToday = selectedOffset === 0;

  const completeness: Record<string, number> = {};
  const mockComplete = [3, 3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3];
  days.forEach((d, i) => {
    const offsetFromToday = days.length - 1 - i;
    completeness[d.toISOString().slice(0, 10)] =
      offsetFromToday === 0 ? 1 : mockComplete[i] || 3;
  });

  const weeklyKcal = 14210;
  const targetKcal = 16800;
  const streak = 47;

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const breakfastScores = [88, 92, 84, 90, 86, 78, 90];
  const dinnerScores = [70, 65, 80, 72, 60, 55, 82];
  const kveldScores = [75, 80, 70, 72, 65, 70, 78];

  const patterns = [
    { l: "Whole-food breakfasts", v: "7 / 7", tone: "good" },
    { l: "Fish ≥ 2× per week", v: "3 × so far", tone: "good" },
    { l: "Alcohol units", v: "4 u", tone: "neutral" },
    { l: "Refined sugar events", v: "2 / target ≤ 3", tone: "good" },
    { l: "Last meal before 21:00", v: "5 / 7", tone: "warn" },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Nutrition log · breakfast · dinner · kveldsmat
          </div>
          <h1 className="page-title">
            What you <em>fed</em> the system
          </h1>
          <p className="page-sub">
            Capture the first and last meal of the day with a photo — the
            dinner card is freeform. The protocol cares less about macros and
            more about consistency and what&apos;s actually on the plate.
          </p>
        </div>
        <div className="page-chips">
          <span className="chip live">{streak}-day streak</span>
          <span className="chip">
            {weeklyKcal.toLocaleString()} / {targetKcal.toLocaleString()} kcal
            · wk
          </span>
        </div>
      </div>

      <div className="page-body">
        <div className="food-day-strip">
          {days.map((d, i) => {
            const offset = days.length - 1 - i;
            const isSelected = offset === selectedOffset;
            const filled = completeness[d.toISOString().slice(0, 10)] || 0;
            return (
              <button
                key={i}
                className={`day-pill${isSelected ? " today" : ""}`}
                onClick={() => setSelectedOffset(offset)}
              >
                <div className="day-pill-day">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="day-pill-num">{d.getDate()}</div>
                <div className="day-pill-dots">
                  {[0, 1, 2].map((k) => (
                    <span
                      key={k}
                      className={`dot${k < filled ? " filled" : ""}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <h2 className="section-h">
          {isToday ? (
            <span>
              Today,{" "}
              <em>
                {selected.toLocaleDateString("en-US", { weekday: "long" })}
              </em>
            </span>
          ) : (
            selected.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          )}
        </h2>

        <div className="meal-grid">
          <MealCard
            slotId="meal-breakfast"
            kind="Breakfast"
            sub="07 · Morgen"
            time="07:24"
            defaultNote={
              isToday
                ? "Steel-cut oats, frozen blueberries, walnut crumble, full-fat kefir. Black coffee."
                : ""
            }
            status={isToday ? "done" : "done"}
            suggestedTags={
              isToday
                ? ["Whole grain", "Berries", "Fermented"]
                : ["Whole grain", "Berries"]
            }
          />
          <MealCard
            slotId="meal-dinner"
            kind="Dinner"
            sub="19 · Middag"
            time="19:10"
            defaultNote={
              isToday
                ? ""
                : "Pan-seared cod with brown butter, roasted carrots & dill, boiled new potatoes. Glass of red."
            }
            status={isToday ? "pending" : "done"}
            suggestedTags={
              isToday ? [] : ["Fish", "Root veg", "Alcohol · 1u"]
            }
          />
          <MealCard
            slotId="meal-kveldsmat"
            kind="Kveldsmat"
            sub="22 · Late night"
            time="22:05"
            defaultNote={
              isToday
                ? ""
                : "Cottage cheese, rye crispbread, raw honey, handful of almonds."
            }
            status={isToday ? "pending" : "done"}
            suggestedTags={isToday ? [] : ["High protein", "Pre-sleep"]}
          />
        </div>

        <div className="divider-label">
          This week · pattern recognition
        </div>
        <div className="dash-grid">
          <div className="card span-8">
            <div className="card-head">
              <div className="card-title">
                Meal composition · last 7 days
              </div>
              <div className="card-meta">Tagged from photos &amp; notes</div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 14,
              }}
            >
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {d.toUpperCase()}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      width: "100%",
                    }}
                  >
                    <div
                      title={`Breakfast ${breakfastScores[i]}`}
                      style={{
                        height: 28,
                        background: "var(--accent-soft)",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--accent)",
                      }}
                    >
                      {breakfastScores[i]}
                    </div>
                    <div
                      title={`Dinner ${dinnerScores[i]}`}
                      style={{
                        height: 28,
                        background: "var(--warm-soft)",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "oklch(0.45 0.10 75)",
                      }}
                    >
                      {dinnerScores[i]}
                    </div>
                    <div
                      title={`Kveldsmat ${kveldScores[i]}`}
                      style={{
                        height: 28,
                        background: "var(--surface-2)",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--ink-2)",
                      }}
                    >
                      {kveldScores[i]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--hairline)",
              }}
            >
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--accent-soft)" }}
                />
                Breakfast quality
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--warm-soft)" }}
                />
                Dinner quality
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "var(--surface-2)" }}
                />
                Kveldsmat quality
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                }}
              >
                composite score / 100
              </div>
            </div>
          </div>

          <div className="card span-4">
            <div className="card-head">
              <div className="card-title">Patterns this week</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {patterns.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "6px 0",
                    borderBottom:
                      i < 4 ? "1px solid var(--hairline)" : "0",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                    {r.l}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      color:
                        r.tone === "good"
                          ? "var(--accent)"
                          : r.tone === "warn"
                          ? "oklch(0.55 0.12 75)"
                          : "var(--ink-2)",
                    }}
                  >
                    {r.v}
                  </div>
                </div>
              ))}
            </div>
            <div className="aging-callout" style={{ marginTop: 18 }}>
              <div className="aging-callout-num">47</div>
              <div className="aging-callout-text">
                <strong>Logging streak.</strong> Don&apos;t break the chain —
                every meal photo trains your pattern model.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

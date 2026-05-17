"use client";

import React, { useState, useRef, useCallback } from "react";

interface MealItem {
  name: string;
  measurement: string;
}

interface Meal {
  kind: string;
  summary: string;
  kcal: string;
  protein: string;
  items: MealItem[];
  prepNote?: string;
}

const MEALS: Meal[] = [
  {
    kind: "Breakfast",
    summary: "Eggs + smoothie",
    kcal: "~1,150",
    protein: "80 g",
    items: [
      { name: "Eggs, scrambled", measurement: "5 eggs" },
      { name: "Grovbrød", measurement: "3 slices" },
      { name: "Peanut butter on the bread", measurement: "2 tbsp" },
      { name: "Whey scoop", measurement: "1 scoop" },
      { name: "Banana", measurement: "1" },
      { name: "Milk into the smoothie", measurement: "3 dl" },
    ],
  },
  {
    kind: "Lunch",
    summary: "Batch-cooked kjøttdeig + ris",
    kcal: "~750",
    protein: "55 g",
    prepNote: "Sunday prep — makes 2 portions",
    items: [
      { name: "Kjøttdeig (10% fat)", measurement: "1 pack (400–500 g)" },
      { name: "Tacokrydder", measurement: "1 packet" },
      { name: "Rice, uncooked", measurement: "2 dl" },
      { name: "Paprika", measurement: "2" },
      { name: "Onion", measurement: "1" },
      { name: "Tomato", measurement: "1" },
      { name: "Olive oil for cooking", measurement: "1 tbsp" },
    ],
  },
];

function MealPlanCard({ meal }: { meal: Meal }) {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(meal.items.length).fill(false)
  );

  const toggle = (idx: number) => {
    const next = [...checkedItems];
    next[idx] = !next[idx];
    setCheckedItems(next);
  };

  const done = checkedItems.filter(Boolean).length;
  const total = meal.items.length;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        padding: "24px 28px 16px",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "var(--muted)",
              marginBottom: 6,
            }}>
              {meal.kind.toUpperCase()}
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24 }}>
              {meal.summary}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--accent)" }}>
              {meal.kcal}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>kcal</span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {meal.protein} protein
            </div>
          </div>
        </div>
        {meal.prepNote && (
          <div style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--muted)",
            fontStyle: "italic",
            marginTop: 8,
          }}>
            {meal.prepNote}
          </div>
        )}
      </div>

      <div>
        {meal.items.map((item, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr auto",
              alignItems: "center",
              padding: "14px 28px",
              borderBottom: i < meal.items.length - 1 ? "1px solid var(--hairline)" : "none",
              cursor: "pointer",
              opacity: checkedItems[i] ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: checkedItems[i] ? "none" : "1.5px solid var(--faint)",
              background: checkedItems[i] ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "var(--bg)",
              transition: "all 0.15s",
            }}>
              {checkedItems[i] && "✓"}
            </div>
            <div style={{
              fontFamily: "var(--serif)",
              fontSize: 15,
              textDecoration: checkedItems[i] ? "line-through" : "none",
            }}>
              {item.name}
            </div>
            <div style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--muted)",
            }}>
              {item.measurement}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "14px 28px",
        borderTop: "1px solid var(--hairline)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
          {done} / {total} items
        </div>
        <div style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: done === total ? "var(--accent)" : "var(--muted)",
        }}>
          {done === total ? "COMPLETE" : "IN PROGRESS"}
        </div>
      </div>
    </div>
  );
}

function MealPhotoCard({ kind }: { kind: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          height: 180,
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
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
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={kind} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>
            Drop {kind.toLowerCase()} photo
          </span>
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
      <div style={{ padding: "16px 24px" }}>
        <textarea
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            fontFamily: "var(--serif)",
            fontSize: 14,
            color: "var(--ink)",
            resize: "none",
            outline: "none",
          }}
          placeholder={`Notes about ${kind.toLowerCase()}...`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}

export default function Food() {
  const totalKcal = "~1,900";
  const totalProtein = "135 g";

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Nutrition · breakfast · lunch
          </div>
          <h1 className="page-title">
            What you <em>fed</em> the system
          </h1>
          <p className="page-sub">
            Two meals a day. {totalKcal} kcal, {totalProtein} protein. Simple, repeatable, no decisions.
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Daily totals */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 2,
          marginBottom: 24,
        }}>
          <div className="card" style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.14em" }}>DAILY TOTAL</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 6 }}>{totalKcal}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>kcal</div>
          </div>
          <div className="card" style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.14em" }}>PROTEIN</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 6 }}>{totalProtein}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>per day</div>
          </div>
          <div className="card" style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.14em" }}>MEALS</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 6 }}>2</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>per day</div>
          </div>
          <div className="card" style={{ padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.14em" }}>PREP</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 6 }}>Sun</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>batch cook</div>
          </div>
        </div>

        {/* Meal plans */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {MEALS.map((meal) => (
            <MealPlanCard key={meal.kind} meal={meal} />
          ))}
        </div>

        {/* Photo log */}
        <div className="divider-label">Today&apos;s photo log</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <MealPhotoCard kind="Breakfast" />
          <MealPhotoCard kind="Lunch" />
        </div>
      </div>
    </div>
  );
}
